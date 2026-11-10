import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Fiber, Option } from "effect";
import { TestClock } from "effect/testing";

import { PostOutcomes } from "#publishing/application/post-outcomes.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { newId } from "#shared/application/ids.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
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

// Waiting, for a bounded time, until a post went out on its channels: what
// `send` answers with when asked to wait.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const freshWorkspace = newId(WorkspaceIdSchema);

const now = (
  channels: readonly [ChannelId, ...ChannelId[]],
  text: string,
  at?: string
): SendPostRequest => ({
  at: Option.fromUndefinedOr(at).pipe(Option.map(utc)),
  channelIds: channels,
  content: contentOf(text),
  idempotency: Option.none(),
  timeZone: TimeZoneIdSchema.make("Europe/Paris"),
});

const publishedOn = (channelId: ChannelId, postId: PostId) =>
  targetsOf(postId).pipe(
    Effect.map((all) =>
      all.some(
        (target) =>
          target.channelId === channelId && target.status._tag === "published"
      )
    )
  );

describe("PostOutcomes.await", () => {
  it.effect(
    "answers each channel's result once all have one, or what it has when the time runs out",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* waits() {
          const scheduling = yield* PostScheduling;
          const outcomes = yield* PostOutcomes;
          const platform = yield* FakePlatform;
          const workspaceId = yield* freshWorkspace;
          const quick = yield* connect(workspaceId, "mastodon");
          const slow = yield* connect(workspaceId, "mastodon");
          const refusing = yield* connect(workspaceId, "mastodon");
          const actor = actorIn(workspaceId);

          yield* platform.script(slow, [{ _tag: "hang" }]);
          yield* platform.script(refusing, [
            { _tag: "fail", failure: new BadRequest({ code: "refused" }) },
          ]);

          const sent = yield* scheduling.send(
            actor,
            now([quick, slow, refusing], "A synthetic post, out now.")
          );

          const waiting = yield* outcomes
            .await(actor, sent.post.id, Duration.seconds(30))
            .pipe(Effect.forkChild);

          yield* eventually(
            "the quick channel published",
            publishedOn(quick, sent.post.id)
          );

          // The slow channel says nothing: the time runs out.
          yield* TestClock.adjust(Duration.seconds(31));

          const partial = yield* Fiber.join(waiting);

          assert.isFalse(partial.settled);
          assert.strictEqual(partial.post.status._tag, "publishing");
          assert.deepStrictEqual(
            partial.targets.map(({ channelId, status }) => [
              channelId,
              status._tag,
            ]),
            [
              [quick, "published"],
              [slow, "publishing"],
              [refusing, "failed"],
            ]
          );

          // Asked again, it answers as soon as the last channel has.
          const again = yield* outcomes
            .await(actor, sent.post.id, Duration.seconds(30))
            .pipe(Effect.forkChild);

          yield* platform.release(slow);
          yield* eventually("the post finished", isFinished(sent.post.id));
          yield* TestClock.adjust(Duration.seconds(1));

          const whole = yield* Fiber.join(again);

          assert.isTrue(whole.settled);
          assert.strictEqual(whole.post.status._tag, "finished");

          const [first, , third] = whole.targets;

          assert.strictEqual(first?.status._tag, "published");

          assert.strictEqual(third?.status._tag, "failed");

          if (third?.status._tag === "failed") {
            assert.strictEqual(third.status.reason, "contentRejected");
          }

          // A finished post is answered at once, however long is asked.
          const done = yield* outcomes.await(
            actor,
            sent.post.id,
            Duration.seconds(30)
          );

          assert.isTrue(done.settled);
        })
      ),
    timeout
  );

  it.effect(
    "does not wait for a post whose time comes later, nor longer than a minute",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* bounded() {
          const scheduling = yield* PostScheduling;
          const outcomes = yield* PostOutcomes;
          const platform = yield* FakePlatform;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const actor = actorIn(workspaceId);

          const later = yield* scheduling.send(
            actor,
            now(
              [channel],
              "A synthetic post, for later.",
              "2026-06-15T09:00:00Z"
            )
          );

          // Its time is past the wait: answered at once, still scheduled.
          const scheduled = yield* outcomes.await(
            actor,
            later.post.id,
            Duration.seconds(30)
          );

          assert.isFalse(scheduled.settled);
          assert.strictEqual(scheduled.post.status._tag, "scheduled");

          // No time to wait: the post as it stands.
          yield* platform.script(channel, [{ _tag: "hang" }]);

          const hanging = yield* scheduling.send(
            actor,
            now([channel], "A synthetic post that hangs.")
          );

          yield* eventually(
            "the call is in flight",
            callsOn(channel).pipe(Effect.map((calls) => calls.length === 1))
          );

          const atOnce = yield* outcomes.await(
            actor,
            hanging.post.id,
            Duration.zero
          );

          assert.isFalse(atOnce.settled);

          // An hour asked is a minute waited.
          const capped = yield* outcomes
            .await(actor, hanging.post.id, Duration.hours(1))
            .pipe(Effect.forkChild);

          yield* TestClock.adjust(Duration.seconds(61));

          assert.isFalse((yield* Fiber.join(capped)).settled);

          yield* platform.release(channel);
          yield* eventually("the post finished", isFinished(hanging.post.id));

          // Another workspace's post is no post, and reading needs a role.
          const stranger = yield* outcomes
            .await(actorIn(yield* freshWorkspace), later.post.id, Duration.zero)
            .pipe(Effect.flip);

          assert.strictEqual(stranger._tag, "PostNotFound");

          const missing = yield* outcomes
            .await(actor, yield* newId(PostIdSchema), Duration.zero)
            .pipe(Effect.flip);

          assert.strictEqual(missing._tag, "PostNotFound");

          const denied = yield* outcomes
            .await(actorIn(workspaceId, []), later.post.id, Duration.zero)
            .pipe(Effect.flip);

          assert.strictEqual(denied._tag, "MissingPermission");

          yield* scheduling.cancel(actor, later.post.id);
        })
      ),
    timeout
  );
});
