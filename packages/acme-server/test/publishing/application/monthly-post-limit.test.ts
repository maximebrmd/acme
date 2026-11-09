// A workspace's plan limits the posts going out in each calendar month
// (UTC). Here the plan allows two.
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Result } from "effect";
import type { Scope } from "effect";

import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostUsage } from "#publishing/application/post-usage.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import {
  scheduleIn,
  setTime,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, postsServerWith } from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
} from "#test/publishing/support.ts";

const allowed = 2;

const TwoPostsServer = postsServerWith(
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      scheduledPerMonth: () => Effect.succeed(Option.some(allowed)),
    })
  )
);

const onServerAt = <A, E>(
  start: string,
  test: Effect.Effect<A, E, Layer.Success<typeof TwoPostsServer> | Scope.Scope>
) =>
  setTime(start).pipe(
    Effect.andThen(test.pipe(Effect.provide(TwoPostsServer)))
  );

const freshWorkspace = newId(WorkspaceIdSchema);

const limitReached = new PlanLimitReached({
  allowed,
  limit: "scheduledPosts",
});

// A draft scheduled on the channel at `iso`.
const scheduledAt = Effect.fn("scheduledAt")(function* scheduledAt(
  workspaceId: WorkspaceId,
  channelId: ChannelId,
  iso: string
) {
  const actor = actorIn(workspaceId);

  const { post } = yield* PostDrafts.use((drafts) =>
    drafts.create(actor, { channelIds: [channelId], content: contentOf("Hi") })
  ).pipe(Effect.orDie);

  const scheduled = yield* PostScheduling.use((scheduling) =>
    scheduling.scheduleDraft(actor, post.id, {
      channelIds: [channelId],
      schedule: scheduleIn(iso),
    })
  ).pipe(Effect.result);

  return { failure: Result.getFailure(scheduled), postId: post.id };
});

describe("the monthly post limit", () => {
  it.effect(
    "counts the posts going out in a month, without the cancelled ones",
    () =>
      onServerAt(
        "2026-06-10T07:00:00Z",
        Effect.gen(function* month() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const channel = yield* connect(workspaceId, "mastodon");

          const first = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-20T08:00:00Z"
          );

          const second = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-30T23:30:00Z"
          );

          assert.deepStrictEqual(
            [first.failure, second.failure],
            [Option.none(), Option.none()]
          );

          const refused = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-21T08:00:00Z"
          );

          assert.deepStrictEqual(refused.failure, Option.some(limitReached));

          // Moving a post within its month takes no more room.
          yield* scheduling.reschedule(
            actor,
            first.postId,
            scheduleIn("2026-06-25T08:00:00Z")
          );

          // July has room; moving it back to June does not.
          yield* scheduling.reschedule(
            actor,
            refused.postId,
            scheduleIn("2026-07-01T00:00:00Z")
          );

          const back = yield* scheduling
            .reschedule(
              actor,
              refused.postId,
              scheduleIn("2026-06-29T08:00:00Z")
            )
            .pipe(Effect.flip);

          assert.deepStrictEqual(back, limitReached);

          const usage = yield* PostUsage.use((posts) =>
            posts.thisMonth(workspaceId)
          );

          assert.strictEqual(usage.scheduled, allowed);
          assert.deepStrictEqual(usage.resetsAt, utc("2026-07-01T00:00:00Z"));

          // A cancelled post gives its room back.
          yield* scheduling.cancel(actor, second.postId);

          yield* scheduling.reschedule(
            actor,
            refused.postId,
            scheduleIn("2026-06-29T08:00:00Z")
          );

          yield* scheduling.cancel(actor, first.postId);
          yield* scheduling.cancel(actor, refused.postId);
        })
      ),
    60_000
  );
});
