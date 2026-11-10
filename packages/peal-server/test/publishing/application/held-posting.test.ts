import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Option, Result } from "effect";
import type { Layer } from "effect";

import { PostBatches } from "#publishing/application/post-batches.ts";
import { PostChecks } from "#publishing/application/post-checks.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostOutcomes } from "#publishing/application/post-outcomes.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  FakeApprovalGate,
  GateLog,
} from "#test/publishing/fakes/fake-approval-gate.ts";
import {
  setTime,
  storedPost,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, postsServerBehind } from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
  postAllowance,
} from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The ways of making a post in one call (send, several at once, a file's
// rows), a check and a wait, in a workspace whose gate holds every post
// until it is approved.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const GatedServer = postsServerBehind(
  FakeApprovalGate,
  attachableMedia(),
  postAllowance(),
  PostEvents.none
);

const onGatedServer = <A, E>(
  test: Effect.Effect<A, E, Layer.Success<typeof GatedServer>>
) =>
  setTime(start).pipe(Effect.andThen(test.pipe(Effect.provide(GatedServer))));

const freshWorkspace = newId(WorkspaceIdSchema);

const at8 = (
  channel: ChannelId,
  text: string,
  more: Partial<SendPostRequest> = {}
): SendPostRequest => ({
  at: Option.some(utc("2026-06-15T08:00:00Z")),
  channelIds: [channel],
  content: contentOf(text),
  idempotency: Option.none(),
  timeZone: TimeZoneIdSchema.make("Europe/Paris"),
  ...more,
});

describe("posting in one call behind an ApprovalGate", () => {
  it.effect(
    "holds a thread whole: every part kept, no job, and compared with the others that wait by all its parts",
    () =>
      onGatedServer(
        Effect.gen(function* holdsThreads() {
          const scheduling = yield* PostScheduling;
          const checks = yield* PostChecks;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);

          const thread = (ending: string) =>
            at8(channel, "What we found at low tide.", {
              content: new PostContent({
                followUps: [
                  new PostPart({
                    delaySeconds: 60,
                    media: [],
                    overrides: [],
                    text: ending,
                  }),
                ],
                media: [],
                overrides: [],
                text: "What we found at low tide.",
              }),
            });

          const held = yield* scheduling.send(editor, thread("The anemones."));

          assert.strictEqual(held.post.status._tag, "awaitingApproval");
          assert.deepStrictEqual(
            held.post.content.followUps.map(({ text }) => text),
            ["The anemones."]
          );
          // Nothing of it goes out while it waits: no job, no part live.
          assert.deepStrictEqual(
            (yield* storedPost(held.post.id)).execution,
            Option.none()
          );
          assert.deepStrictEqual(
            held.targets.map(({ liveParts, status }) => [
              status._tag,
              liveParts.length,
            ]),
            [["pending", 0]]
          );

          // The same thread asked for again would go out twice once both
          // are approved; another ending is another post, and waits too.
          const twice = yield* scheduling
            .send(editor, thread("The anemones."))
            .pipe(Effect.flip);

          assert.strictEqual(twice._tag, "DuplicateContent");
          assert.strictEqual(
            (yield* scheduling.send(editor, thread("The crabs."))).post.status
              ._tag,
            "awaitingApproval"
          );

          // A check says a thread would wait, and previews every part.
          const checked = yield* checks.check(editor, {
            channelIds: [channel],
            content: thread("The gulls.").content,
            when: Option.some({ at: Option.none() }),
          });

          assert.isTrue(checked.awaitsApproval);
          assert.deepStrictEqual(
            checked.channels.map(({ parts }) => parts.map(({ text }) => text)),
            [["The gulls."]]
          );
        })
      ),
    timeout
  );

  it.effect(
    "holds each post of a batch, without a job, and refuses the same content held twice",
    () =>
      onGatedServer(
        Effect.gen(function* holds() {
          const scheduling = yield* PostScheduling;
          const batches = yield* PostBatches;
          const gate = yield* GateLog;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);

          const outcomes = yield* batches.send(editor, [
            at8(channel, "A synthetic post, held."),
            at8(channel, "Another synthetic post, held."),
            // The first again: it waits already, and would go out twice.
            at8(channel, "A synthetic post, held."),
          ]);

          const made = outcomes.flatMap((outcome) =>
            Result.isSuccess(outcome) ? [outcome.success.post] : []
          );

          assert.deepStrictEqual(
            outcomes.map((outcome) =>
              Result.isSuccess(outcome)
                ? outcome.success.post.status._tag
                : outcome.failure._tag
            ),
            ["awaitingApproval", "awaitingApproval", "DuplicateContent"]
          );
          // The gate was asked for each one made. (This fake keeps what it
          // was asked outside the transaction the refused one rolled back.)
          assert.includeMembers(
            [...(yield* gate.held)],
            made.map(({ id }) => id)
          );
          assert.lengthOf(made, 2);

          for (const post of made) {
            assert.deepStrictEqual(
              (yield* storedPost(post.id)).execution,
              Option.none()
            );
          }

          // Alone too, and meant, it is let through to wait.
          const twice = yield* scheduling
            .send(editor, at8(channel, "A synthetic post, held."))
            .pipe(Effect.flip);

          assert.strictEqual(twice._tag, "DuplicateContent");

          const meant = yield* scheduling.send(
            editor,
            at8(channel, "A synthetic post, held.", { allowDuplicate: true })
          );

          assert.strictEqual(meant.post.status._tag, "awaitingApproval");
        })
      ),
    timeout
  );

  it.effect(
    "lets whoever the gate lets ask send several at once, as one alone",
    () =>
      onGatedServer(
        Effect.gen(function* asks() {
          const batches = yield* PostBatches;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");

          // A contributor writes drafts, and may not schedule: here they
          // ask, and what they ask for waits.
          const contributor = actorIn(
            workspaceId,
            permissionsFor("contributor")
          );

          const [asked] = yield* batches.send(contributor, [
            at8(channel, "A synthetic post a contributor asks for."),
          ]);

          assert.isTrue(asked !== undefined && Result.isSuccess(asked));

          const checked = yield* batches.check(contributor, [
            at8(channel, "A synthetic post a contributor checks."),
          ]);

          assert.deepStrictEqual(
            checked.map(({ _tag }) => _tag),
            ["checked"]
          );

          // A viewer asks for nothing.
          const viewer = yield* batches
            .send(actorIn(workspaceId, permissionsFor("viewer")), [
              at8(channel, "A synthetic post nobody may ask for."),
            ])
            .pipe(Effect.flip);

          assert.strictEqual(viewer._tag, "MissingPermission");
        })
      ),
    timeout
  );

  it.effect(
    "says a checked post would wait, and answers a wait for one at once",
    () =>
      onGatedServer(
        Effect.gen(function* checksAndWaits() {
          const scheduling = yield* PostScheduling;
          const checks = yield* PostChecks;
          const outcomes = yield* PostOutcomes;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);

          const request = at8(channel, "A synthetic post to check.");

          const timed = yield* checks.check(editor, {
            channelIds: request.channelIds,
            content: request.content,
            when: Option.some({ at: request.at }),
          });

          assert.isTrue(timed.awaitsApproval);

          // A draft's content alone is sent nowhere: nothing waits.
          const untimed = yield* checks.check(editor, {
            channelIds: request.channelIds,
            content: request.content,
            when: Option.none(),
          });

          assert.isFalse(untimed.awaitsApproval);

          // No outcome can come while it waits for a person: the answer
          // is the post as it stands, without the clock moving at all.
          const held = yield* scheduling.send(editor, request);

          const awaited = yield* outcomes.await(
            editor,
            held.post.id,
            Duration.seconds(30)
          );

          assert.isFalse(awaited.settled);
          assert.strictEqual(awaited.post.status._tag, "awaitingApproval");
        })
      ),
    timeout
  );
});
