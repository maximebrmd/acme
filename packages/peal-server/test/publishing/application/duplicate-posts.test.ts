import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { SqlClient } from "effect/sql";

import { isSendable, PostChecks } from "#publishing/application/post-checks.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import {
  nextOccurrences,
  RecurringSchedule,
} from "#publishing/domain/recurring-schedule.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { newId } from "#shared/application/ids.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  callsOn,
  eventually,
  isFinished,
  targetsOf,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { actorIn, contentOf } from "#test/publishing/support.ts";

// The same content sent to the same channel twice within a day (23 hours, the shortest one) is refused,
// unless the caller says it is meant: a loop that sends a post twice, or a
// retry without an idempotency key, publishes it once.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const freshWorkspace = newId(WorkspaceIdSchema);

const postsIn = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        count: number;
      }>`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.map((rows) => rows[0]?.count ?? 0));

const post = (
  channels: readonly [ChannelId, ...ChannelId[]],
  text: string,
  {
    allowDuplicate = false,
    at,
    overrides = [],
  }: {
    readonly allowDuplicate?: boolean;
    readonly at?: string;
    readonly overrides?: readonly (readonly [ChannelId, string])[];
  } = {}
): SendPostRequest => ({
  allowDuplicate,
  at: Option.fromUndefinedOr(at).pipe(Option.map(utc)),
  channelIds: channels,
  content: contentOf(text, { overrides }),
  idempotency: Option.none(),
  timeZone: paris,
});

describe("sending the same content twice", () => {
  it.effect(
    "is refused on the channel that has it, within a day, unless meant",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refuses() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const first = yield* connect(workspaceId, "mastodon");
          const second = yield* connect(workspaceId, "mastodon");
          const third = yield* connect(workspaceId, "mastodon");
          const actor = actorIn(workspaceId);

          const original = yield* scheduling.send(
            actor,
            post([first, second], "A synthetic announcement.", {
              at: "2026-06-16T08:00:00Z",
            })
          );

          // An hour later, on one channel that has it and one that has not;
          // written with spaces around, which no reader sees.
          const refused = yield* scheduling
            .send(
              actor,
              post([second, third], "  A synthetic announcement.\n", {
                at: "2026-06-16T09:00:00Z",
              })
            )
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "DuplicateContent");

          if (refused._tag === "DuplicateContent") {
            assert.deepStrictEqual(refused.duplicates, [
              { channelId: second, postId: original.post.id },
            ]);
          }

          assert.strictEqual(yield* postsIn(workspaceId), 1);

          // Checking the post first says the same, and makes nothing.
          const checks = yield* PostChecks;

          const toCheck = {
            channelIds: [second, third],
            content: contentOf("A synthetic announcement."),
            when: Option.some({
              at: Option.some(utc("2026-06-16T09:00:00Z")),
            }),
          };

          const checked = yield* checks.check(actor, toCheck);

          assert.isFalse(isSendable(checked));
          assert.deepStrictEqual(checked.duplicates, [
            { channelId: second, postId: original.post.id },
          ]);

          const allowed = yield* checks.check(actor, {
            ...toCheck,
            allowDuplicate: true,
          });

          assert.isTrue(isSendable(allowed));

          // Other words, or the same on a channel that has not had them.
          yield* scheduling.send(
            actor,
            post([second], "Another synthetic announcement.", {
              at: "2026-06-16T09:00:00Z",
            })
          );
          yield* scheduling.send(
            actor,
            post([third], "A synthetic announcement.", {
              at: "2026-06-16T09:00:00Z",
            })
          );

          // What counts is what the channel receives.
          yield* scheduling.send(
            actor,
            post([first], "A synthetic announcement.", {
              at: "2026-06-16T09:00:00Z",
              overrides: [[first, "The same news, in other words."]],
            })
          );

          const override = yield* scheduling
            .send(
              actor,
              post([first], "Unrelated words.", {
                at: "2026-06-16T10:00:00Z",
                overrides: [[first, "A synthetic announcement."]],
              })
            )
            .pipe(Effect.flip);

          assert.strictEqual(override._tag, "DuplicateContent");

          // A day apart is a post that repeats, not a mistake: 23 hours
          // on, to the second, and not a second less.
          const tooSoon = yield* scheduling
            .send(
              actor,
              post([second], "A synthetic announcement.", {
                at: "2026-06-17T06:59:59Z",
              })
            )
            .pipe(Effect.flip);

          assert.strictEqual(tooSoon._tag, "DuplicateContent");

          yield* scheduling.send(
            actor,
            post([second], "A synthetic announcement.", {
              at: "2026-06-17T07:00:00Z",
            })
          );

          // And the caller who means it says so.
          const meant = yield* scheduling.send(
            actor,
            post([second], "A synthetic announcement.", {
              allowDuplicate: true,
              at: "2026-06-16T09:00:00Z",
            })
          );

          assert.strictEqual(meant.post.status._tag, "scheduled");
        })
      ),
    timeout
  );

  it.effect(
    "lets one of two requests sent together through",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* races() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const actor = actorIn(workspaceId);

          const twice = post([channel], "A synthetic post, sent in a loop.", {
            at: "2026-06-16T08:00:00Z",
          });

          const results = yield* Effect.all(
            [
              scheduling.send(actor, twice).pipe(Effect.result),
              scheduling.send(actor, twice).pipe(Effect.result),
              scheduling.send(actor, twice).pipe(Effect.result),
            ],
            { concurrency: 3 }
          );

          assert.lengthOf(
            results.filter((result) => result._tag === "Success"),
            1
          );
          assert.strictEqual(yield* postsIn(workspaceId), 1);
        })
      ),
    timeout
  );

  it.effect(
    "leaves cancelled and failed posts, reposts and drafts alone",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* exceptions() {
          const scheduling = yield* PostScheduling;
          const followUp = yield* PostFollowUp;
          const drafts = yield* PostDrafts;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const actor = actorIn(workspaceId);

          // A cancelled post went nowhere: its words are free again.
          const cancelled = yield* scheduling.send(
            actor,
            post([channel], "A synthetic post, called off.", {
              at: "2026-06-16T08:00:00Z",
            })
          );

          yield* scheduling.cancel(actor, cancelled.post.id);
          yield* scheduling.send(
            actor,
            post([channel], "A synthetic post, called off.", {
              at: "2026-06-16T08:00:00Z",
            })
          );

          // So are those of a post the platform refused.
          yield* FakePlatform.use((platform) =>
            platform.script(channel, [
              { _tag: "fail", failure: new BadRequest({ code: "refused" }) },
            ])
          );

          const failed = yield* scheduling.send(
            actor,
            post([channel], "A synthetic post the platform refuses.")
          );

          yield* eventually("the post failed", isFinished(failed.post.id));

          const again = yield* scheduling.send(
            actor,
            post([channel], "A synthetic post the platform refuses.")
          );

          yield* eventually("the second went out", isFinished(again.post.id));

          // Sending the failed one again is the member's own decision, on
          // the post they see: a repost is never refused as a duplicate.
          const [target] = yield* targetsOf(failed.post.id);

          assert.strictEqual(target?.status._tag, "failed");

          if (target !== undefined) {
            yield* followUp.repost(actor, failed.post.id, target.id);
          }

          yield* eventually("the repost went out", isFinished(failed.post.id));
          assert.lengthOf(yield* callsOn(channel), 3);

          // A draft says nothing yet; once scheduled, it counts.
          const draft = yield* drafts.create(actor, {
            channelIds: [channel],
            content: contentOf("A synthetic draft."),
            options: [],
          });

          yield* scheduling.send(
            actor,
            post([channel], "A synthetic draft.", {
              allowDuplicate: true,
              at: "2026-06-20T08:00:00Z",
            })
          );

          const other = yield* drafts.create(actor, {
            channelIds: [channel],
            content: contentOf("A synthetic draft, scheduled by hand."),
            options: [],
          });

          yield* scheduling.scheduleDraft(actor, other.post.id, {
            channelIds: [channel],
            schedule: new Schedule({
              at: utc("2026-06-21T08:00:00Z"),
              timeZone: paris,
            }),
          });

          const afterDraft = yield* scheduling
            .send(
              actor,
              post([channel], "A synthetic draft, scheduled by hand.", {
                at: "2026-06-21T09:00:00Z",
              })
            )
            .pipe(Effect.flip);

          assert.strictEqual(afterDraft._tag, "DuplicateContent");

          // Taken back to draft, it goes out at no time.
          yield* scheduling.unschedule(actor, other.post.id);
          yield* scheduling.send(
            actor,
            post([channel], "A synthetic draft, scheduled by hand.", {
              at: "2026-06-21T09:00:00Z",
            })
          );

          assert.strictEqual(draft.post.status._tag, "draft");
        })
      ),
    timeout
  );

  it.effect(
    "lets a post that recurs every day through",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* recurs() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const actor = actorIn(workspaceId);

          const daily = new RecurringSchedule({
            recurrence: {
              _tag: "daily",
              time: { hour: 9, minute: 0 },
            },
            timeZone: paris,
          });

          // Across the change to summer time, when a day lasts 23 hours:
          // the shortest time between two days' posts.
          const occurrences = nextOccurrences(
            daily,
            utc("2027-03-26T12:00:00Z"),
            4
          );

          const sent = yield* Effect.all(
            occurrences.map(({ at }) =>
              scheduling.send(actor, {
                at: Option.some(at),
                channelIds: [channel],
                content: contentOf("A synthetic daily reminder."),
                idempotency: Option.none(),
                timeZone: paris,
              })
            )
          );

          assert.lengthOf(sent, 4);
        })
      ),
    timeout
  );
});
