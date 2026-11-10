import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { newId } from "#shared/application/ids.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { actorIn } from "#test/publishing/support.ts";

import {
  callsOn,
  eventually,
  isFinished,
  isTargetWaiting,
  journalOf,
  newChannel,
  outcomeOf,
  PublishingTest,
  scheduleIn,
  setTime,
  settle,
  storedPost,
  targetsOf,
} from "./harness.ts";

// A post of several parts on the in-memory cluster: each part is its own
// call, journaled before it is made, sent in order, and nothing is sent
// after a part that did not go live.

const timeout = 60_000;

const ThreadsTest = PostFollowUp.layer.pipe(Layer.provideMerge(PublishingTest));

const onServer = <A, E>(
  start: string,
  test: Effect.Effect<A, E, Layer.Success<typeof ThreadsTest>>
) =>
  setTime(start).pipe(Effect.andThen(test.pipe(Effect.provide(ThreadsTest))));

const part = (text: string, delaySeconds = 0) =>
  new PostPart({ delaySeconds, media: [], overrides: [], text });

// Schedules a thread on `channel` for 08:00, in a workspace of its own.
const scheduleThread = Effect.fn("test.scheduleThread")(
  function* scheduleThread(channel: ChannelId, followUps: readonly PostPart[]) {
    const workspaceId = yield* newId(WorkspaceIdSchema).pipe(
      Effect.provide(IdsLive)
    );

    const actor = actorIn(workspaceId);
    const scheduling = yield* PostScheduling;

    const { post } = yield* scheduling.schedule(actor, {
      channelIds: [channel],
      content: new PostContent({
        followUps,
        media: [],
        overrides: [],
        text: "A synthetic first part",
      }),
      schedule: scheduleIn("2026-06-15T08:00:00Z"),
    });

    return { actor, post };
  }
);

const onlyTarget = (postId: Parameters<typeof targetsOf>[0]) =>
  targetsOf(postId).pipe(
    Effect.map(([target]) => {
      assert(target !== undefined);

      return target;
    })
  );

const partsSent = (channel: ChannelId) =>
  callsOn(channel).pipe(
    Effect.map((calls) => calls.map(({ request }) => request.part))
  );

const liveIds = (target: {
  readonly liveParts: readonly {
    readonly platformPostId: Option.Option<string>;
  }[];
}) =>
  target.liveParts.map(({ platformPostId }) =>
    Option.getOrNull(platformPostId)
  );

describe("PublishTargetV2", () => {
  it.effect(
    "sends each part in order, each as its own journaled call",
    () =>
      onServer(
        "2026-06-15T08:00:00Z",
        Effect.gen(function* sendsInOrder() {
          const channel = yield* newChannel;

          const { post } = yield* scheduleThread(channel, [
            part("A second part"),
            part("A third part"),
          ]);

          yield* eventually("the post finishes", isFinished(post.id));

          assert.deepStrictEqual(yield* partsSent(channel), [0, 1, 2]);
          assert.strictEqual(yield* outcomeOf(post.id), "published");

          const target = yield* onlyTarget(post.id);

          // Published as its first part, with every part live.
          assert(target.status._tag === "published");
          assert.deepStrictEqual(
            target.status.platformPostId,
            target.liveParts[0]?.platformPostId
          );
          assert.deepStrictEqual(
            target.liveParts.map(({ index }) => index),
            [0, 1, 2]
          );
          assert.lengthOf(new Set(liveIds(target)), 3);

          const journal = yield* journalOf(target.id);

          assert.deepStrictEqual(
            journal.map(({ attempt, finished, part: sent }) => ({
              attempt,
              finished,
              part: sent,
            })),
            [
              { attempt: 1, finished: true, part: 0 },
              { attempt: 1, finished: true, part: 1 },
              { attempt: 1, finished: true, part: 2 },
            ]
          );
          assert.lengthOf(
            new Set(journal.map((call) => call.idempotency_key)),
            3
          );
        })
      ),
    timeout
  );

  it.effect(
    "waits as long as a part asks after the one before it, and not less",
    () =>
      onServer(
        "2026-06-15T08:00:00Z",
        Effect.gen(function* waitsBetweenParts() {
          const channel = yield* newChannel;

          const { post } = yield* scheduleThread(channel, [
            part("Five minutes later", 300),
          ]);

          const target = yield* onlyTarget(post.id);

          yield* eventually("the job waits", isTargetWaiting(target.id));

          assert.deepStrictEqual(yield* partsSent(channel), [0]);

          yield* setTime("2026-06-15T08:04:00Z");
          yield* settle();

          assert.deepStrictEqual(yield* partsSent(channel), [0]);
          assert.strictEqual(
            (yield* onlyTarget(post.id)).status._tag,
            "publishing"
          );

          yield* setTime("2026-06-15T08:05:01Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.deepStrictEqual(yield* partsSent(channel), [0, 1]);
          assert.strictEqual(yield* outcomeOf(post.id), "published");
        })
      ),
    timeout
  );

  it.effect(
    "stops at a part the platform refuses, and a repost sends from that part only",
    () =>
      onServer(
        "2026-06-15T08:00:00Z",
        Effect.gen(function* stopsAtRefusal() {
          const platform = yield* FakePlatform;
          const followUp = yield* PostFollowUp;
          const channel = yield* newChannel;

          yield* platform.script(channel, [
            { _tag: "succeed" },
            { _tag: "fail", failure: new BadRequest({ code: "synthetic" }) },
          ]);

          const { actor, post } = yield* scheduleThread(channel, [
            part("A second part"),
            part("A third part"),
          ]);

          yield* eventually("the post finishes", isFinished(post.id));

          const failed = yield* onlyTarget(post.id);

          // What went out stays out, and is told.
          assert(failed.status._tag === "failed");
          assert.strictEqual(failed.status.reason, "contentRejected");
          assert.deepStrictEqual(liveIds(failed), ["fake-1"]);
          assert.deepStrictEqual(yield* partsSent(channel), [0, 1]);
          assert.strictEqual(yield* outcomeOf(post.id), "partiallyPublished");

          yield* followUp.repost(actor, post.id, failed.id);
          yield* eventually("the post finishes again", isFinished(post.id));

          // The first part was never sent again.
          assert.deepStrictEqual(yield* partsSent(channel), [0, 1, 1, 2]);

          const published = yield* onlyTarget(post.id);

          assert(published.status._tag === "published");
          assert.deepStrictEqual(
            published.status.platformPostId,
            Option.some("fake-1")
          );
          assert.deepStrictEqual(liveIds(published), [
            "fake-1",
            "fake-2",
            "fake-3",
          ]);
          assert.strictEqual(yield* outcomeOf(post.id), "published");
        })
      ),
    timeout
  );

  it.effect(
    "never sends a part after one whose outcome is unknown",
    () =>
      onServer(
        "2026-06-15T08:00:00Z",
        Effect.gen(function* stopsAtUnknown() {
          const platform = yield* FakePlatform;
          const followUp = yield* PostFollowUp;
          const channel = yield* newChannel;

          yield* platform.script(channel, [
            { _tag: "succeed" },
            { _tag: "loseResponse" },
          ]);

          const { actor, post } = yield* scheduleThread(channel, [
            part("A second part"),
            part("A third part"),
          ]);

          yield* eventually("the post finishes", isFinished(post.id));
          yield* settle();

          const unconfirmed = yield* onlyTarget(post.id);

          assert.strictEqual(unconfirmed.status._tag, "unconfirmed");
          assert.deepStrictEqual(liveIds(unconfirmed), ["fake-1"]);
          assert.deepStrictEqual(yield* partsSent(channel), [0, 1]);
          assert.strictEqual(yield* outcomeOf(post.id), "unconfirmed");

          // The member found the second part live: the third was never
          // sent, and nothing sends it until they ask.
          const confirmed = yield* followUp.confirm(
            actor,
            post.id,
            unconfirmed.id,
            { _tag: "published", permalink: Option.none() }
          );

          const [afterConfirm] = confirmed.targets;

          assert(afterConfirm?.status._tag === "failed");
          assert.strictEqual(afterConfirm.status.reason, "partsNotSent");
          assert.lengthOf(afterConfirm.liveParts, 2);
          assert.strictEqual(yield* outcomeOf(post.id), "partiallyPublished");

          yield* settle();

          assert.deepStrictEqual(yield* partsSent(channel), [0, 1]);
        })
      ),
    timeout
  );

  it.effect(
    "sends nothing more once the post is cancelled between two parts",
    () =>
      onServer(
        "2026-06-15T08:00:00Z",
        Effect.gen(function* cancelsBetweenParts() {
          const scheduling = yield* PostScheduling;
          const channel = yield* newChannel;

          const { actor, post } = yield* scheduleThread(channel, [
            part("An hour later", 3600),
            part("And a third"),
          ]);

          const target = yield* onlyTarget(post.id);

          yield* eventually("the job waits", isTargetWaiting(target.id));
          yield* scheduling.cancel(actor, post.id);

          yield* setTime("2026-06-15T09:00:01Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.deepStrictEqual(yield* partsSent(channel), [0]);

          const cancelled = yield* onlyTarget(post.id);

          assert.strictEqual(cancelled.status._tag, "cancelled");
          assert.deepStrictEqual(liveIds(cancelled), ["fake-1"]);
          assert.strictEqual(yield* outcomeOf(post.id), "partiallyPublished");
          assert.strictEqual(
            (yield* storedPost(post.id)).post.status._tag,
            "finished"
          );
        })
      ),
    timeout
  );
});
