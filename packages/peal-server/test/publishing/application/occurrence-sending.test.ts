import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Exit, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { ChannelDefaults } from "#publishing/application/channel-defaults.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { OccurrenceRequest } from "#publishing/application/post-scheduling.ts";
import { Queues } from "#publishing/application/queues.ts";
import { MastodonOptions } from "#publishing/domain/mastodon-options.ts";
import type { Post } from "#publishing/domain/post.ts";
import { RecyclingRuleIdSchema } from "#publishing/domain/recycling-rule-id.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { FakeApprovalGate } from "#test/publishing/fakes/fake-approval-gate.ts";
import { setTime, utc } from "#test/publishing/infrastructure/harness.ts";
import {
  connect,
  onPostsServerAt,
  postsServerBehind,
} from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
} from "#test/publishing/support.ts";

// An occurrence of a recycling rule is sent as `send` sends a post, but
// as it is: nothing is filled in from the workspace's saved items, the
// same content may repeat, a queue's slot exactly at the due instant is
// taken, and the rule's lock comes first in its transaction.

const timeout = 60_000;

// A Monday, 09:00 in Paris.
const start = "2026-06-15T07:00:00Z";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const freshWorkspace = newId(WorkspaceIdSchema);

const occurrenceOf = <E = never, E2 = never>(
  channel: ChannelId,
  more: Partial<OccurrenceRequest<E, E2>> = {}
) =>
  newId(RecyclingRuleIdSchema).pipe(
    Effect.map((ruleId): OccurrenceRequest<E, E2> => ({
      channelIds: [channel],
      claimed: Effect.void,
      content: contentOf("Our opening hours, again."),
      dueAt: utc("2026-06-22T07:00:00Z"),
      made: () => Effect.void,
      occurrence: { number: 2, ruleId },
      options: [],
      placement: { _tag: "at" },
      tagIds: [],
      timeZone: paris,
      ...more,
    }))
  );

const timeOf = ({ status }: Post) =>
  status._tag === "scheduled" || status._tag === "awaitingApproval"
    ? DateTime.formatIso(status.schedule.at)
    : undefined;

const postsIn = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        count: number;
      }>`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.map((rows) => rows[0]?.count ?? 0));

describe("sending an occurrence", () => {
  it.effect(
    "goes out at its due instant as the rule's, with nothing filled in",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* asItIs() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);

          // A default added after the source was written.
          yield* ChannelDefaults.use((defaults) =>
            defaults.set(
              editor,
              channel,
              new MastodonOptions({
                platform: "mastodon",
                visibility: "unlisted",
              })
            )
          );

          const request = yield* occurrenceOf(channel);
          const sent = yield* scheduling.sendOccurrence(editor, request);

          assert.strictEqual(sent.post.status._tag, "scheduled");
          assert.strictEqual(timeOf(sent.post), "2026-06-22T07:00:00.000Z");
          assert.deepStrictEqual(
            sent.post.occurrence,
            Option.some(request.occurrence)
          );
          assert.deepStrictEqual(
            sent.targets.map(({ options }) => Option.isNone(options)),
            [true]
          );
        })
      ),
    timeout
  );

  it.effect(
    "lets the same content go out again, and the same occurrence once",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* repeats() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);
          const request = yield* occurrenceOf(channel);

          yield* scheduling.sendOccurrence(editor, request);

          const later = yield* occurrenceOf(channel, {
            dueAt: utc("2026-06-22T08:00:00Z"),
          });

          // Another rule's occurrence of the same text, an hour later.
          yield* scheduling.sendOccurrence(editor, later);

          const again = yield* scheduling
            .sendOccurrence(editor, {
              ...request,
              dueAt: utc("2026-06-29T07:00:00Z"),
            })
            .pipe(Effect.exit);

          assert.isTrue(Exit.isFailure(again));
          assert.strictEqual(yield* postsIn(workspaceId), 2);
        })
      ),
    timeout
  );

  it.effect(
    "takes a queue's slot exactly at the due instant",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* onSlot() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);

          const { queue } = yield* Queues.use((queues) =>
            queues.create(editor, {
              channelIds: [],
              channelSetId: Option.none(),
              isDefault: false,
              name: "Evergreen",
              slots: [
                { day: "monday", time: { hour: 9, minute: 0 } },
                { day: "monday", time: { hour: 10, minute: 0 } },
              ],
              timeZone: paris,
            })
          );

          const onQueue = { _tag: "queue", queueId: queue.id } as const;

          const exactly = yield* scheduling.sendOccurrence(
            editor,
            yield* occurrenceOf(channel, { placement: onQueue })
          );

          const next = yield* scheduling.sendOccurrence(
            editor,
            yield* occurrenceOf(channel, { placement: onQueue })
          );

          assert.strictEqual(timeOf(exactly.post), "2026-06-22T07:00:00.000Z");
          assert.strictEqual(timeOf(next.post), "2026-06-22T08:00:00.000Z");
          assert.deepStrictEqual(next.post.queueId, Option.some(queue.id));
        })
      ),
    timeout
  );

  it.effect(
    "saves nothing when the rule's claim, or what it writes after, fails",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* rolledBack() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);

          const claimRefused = yield* scheduling
            .sendOccurrence(
              editor,
              yield* occurrenceOf<string>(channel, {
                claimed: Effect.fail("left for the next run"),
              })
            )
            .pipe(Effect.flip);

          const writeRefused = yield* scheduling
            .sendOccurrence(
              editor,
              yield* occurrenceOf<never, string>(channel, {
                made: () => Effect.fail("the rule could not be written"),
              })
            )
            .pipe(Effect.flip);

          assert.strictEqual(claimRefused, "left for the next run");
          assert.strictEqual(writeRefused, "the rule could not be written");
          assert.strictEqual(yield* postsIn(workspaceId), 0);
        })
      ),
    timeout
  );
});

// A plan of one post a month, behind a gate that holds every post.
const HeldServer = postsServerBehind(
  FakeApprovalGate,
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () => Effect.succeed({ allowed: Option.none(), connected: 0 }),
      members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
      scheduledPerMonth: () => Effect.succeed(Option.some(1)),
    })
  ),
  PostEvents.none
);

describe("sending an occurrence for someone the gate holds", () => {
  it.effect(
    "waits for an approval, and takes its month's room",
    () =>
      setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* held() {
            const scheduling = yield* PostScheduling;
            const workspaceId = yield* freshWorkspace;
            const channel = yield* connect(workspaceId, "mastodon");
            const editor = actorIn(workspaceId);

            const first = yield* scheduling.sendOccurrence(
              editor,
              yield* occurrenceOf(channel)
            );

            const second = yield* scheduling
              .sendOccurrence(editor, yield* occurrenceOf(channel))
              .pipe(Effect.flip);

            assert.strictEqual(first.post.status._tag, "awaitingApproval");
            assert.strictEqual(second._tag, "PlanLimitReached");
          }).pipe(Effect.provide(HeldServer))
        )
      ),
    timeout
  );
});
