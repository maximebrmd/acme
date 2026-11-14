import { assert, describe, it } from "@effect/vitest";
import { Effect, Exit, Layer, Option } from "effect";

import { PostRecords } from "#publishing/application/post-records.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PublicationScheduler } from "#publishing/application/publication-scheduler.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { DrizzleLivePostChangeStore } from "#publishing/infrastructure/drizzle-live-post-change-store.ts";
import { DrizzleWorkspacePostStore } from "#publishing/infrastructure/drizzle-workspace-post-store.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { WorkflowLivePostJobs } from "#publishing/infrastructure/workflow-live-post-jobs.ts";
import { PublishTargetV2 } from "#publishing/infrastructure/workflows/publish-parts.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { actorIn } from "#test/publishing/support.ts";

import {
  callsOn,
  eventually,
  executionOf,
  isFinished,
  isSuspended,
  isTargetWaiting,
  jobResult,
  newChannel,
  onServerAt,
  scheduleIn,
  schedulePost,
  setTime,
  settle,
  targetsOf,
} from "./harness.ts";

// Erasing a workspace's posts, as deleting the workspace or its last
// member's account does, against the jobs that would publish them.

const timeout = 60_000;

// PostRecords on the server's scheduler and transactions.
const PostRecordsTest = PostRecords.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      DrizzleWorkspacePostStore,
      DrizzleLivePostChangeStore,
      WorkflowLivePostJobs
    )
  )
);

// A scheduler whose stops are lost, so the job wakes for a post erased
// while it slept.
const PostRecordsLosingInterrupts = PostRecordsTest.pipe(
  Layer.provide(
    Layer.effect(
      PublicationScheduler,
      PublicationScheduler.use((scheduler) =>
        Effect.succeed(
          PublicationScheduler.of({ ...scheduler, cancel: () => Effect.void })
        )
      )
    )
  )
);

// The same for the jobs that send a round: one wakes between two parts for
// a target erased meanwhile.
const PostRecordsLosingRoundInterrupts = PostRecordsTest.pipe(
  Layer.provide(
    Layer.effect(
      PublicationScheduler,
      PublicationScheduler.use((scheduler) =>
        Effect.succeed(
          PublicationScheduler.of({
            ...scheduler,
            cancel: () => Effect.void,
            cancelRound: () => Effect.void,
          })
        )
      )
    )
  )
);

const isComplete = (executionId: string) =>
  jobResult(executionId).pipe(Effect.map(Option.isSome));

const isGone = (postId: PostId) =>
  PostRepository.use((posts) => posts.find(postId)).pipe(
    Effect.map(Option.isNone)
  );

describe("PostRecords.eraseWorkspace", () => {
  it.effect(
    "deletes the workspace's posts and stops their jobs",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* stopsJobs() {
          const platform = yield* FakePlatform;
          const records = yield* PostRecords;
          const channel = yield* newChannel;

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));

          const job = yield* executionOf(post.id);

          yield* records.eraseWorkspace(post.workspaceId);

          assert.isTrue(yield* isGone(post.id));

          yield* eventually("the job stops", isComplete(job));

          const stopped = yield* jobResult(job);

          assert.isTrue(
            Option.isSome(stopped) && Exit.hasInterrupts(stopped.value)
          );

          yield* setTime("2026-06-15T08:00:00Z");
          yield* settle();

          assert.lengthOf(yield* platform.calls, 0);
        }).pipe(Effect.provide(PostRecordsTest))
      ),
    timeout
  );

  it.effect(
    "ends a job that wakes for a post erased while it slept",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* endsLateJob() {
          const platform = yield* FakePlatform;
          const records = yield* PostRecords;
          const channel = yield* newChannel;

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));

          const job = yield* executionOf(post.id);

          yield* records.eraseWorkspace(post.workspaceId);
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the job ends", isComplete(job));

          const ended = yield* jobResult(job);

          assert.isTrue(
            Option.isSome(ended) &&
              Exit.isSuccess(ended.value) &&
              ended.value.value === "superseded"
          );
          assert.lengthOf(yield* platform.calls, 0);
        }).pipe(Effect.provide(PostRecordsLosingInterrupts))
      ),
    timeout
  );

  it.effect(
    "is refused while a post of the workspace is going out",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* refusedWhilePublishing() {
          const platform = yield* FakePlatform;
          const records = yield* PostRecords;
          const channel = yield* newChannel;

          yield* platform.script(channel, [{ _tag: "hang" }]);

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually(
            "the call is in flight",
            platform.calls.pipe(Effect.map((calls) => calls.length === 1))
          );

          const refused = yield* records
            .eraseWorkspace(post.workspaceId)
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "PostsPublishing");
          assert.isFalse(yield* isGone(post.id));

          yield* platform.release(channel);
          yield* eventually("the post finishes", isFinished(post.id));
        }).pipe(Effect.provide(PostRecordsTest))
      ),
    timeout
  );

  it.effect(
    "keeps a channel while a post goes out through it, and only that channel",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* channelBusy() {
          const platform = yield* FakePlatform;
          const records = yield* PostRecords;
          const channel = yield* newChannel;
          const other = yield* newChannel;

          yield* platform.script(channel, [{ _tag: "hang" }]);

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          // Scheduled, not yet going out: nothing keeps the channel.
          yield* records.ensureChannelIdle(post.workspaceId, channel);

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually(
            "the call is in flight",
            platform.calls.pipe(Effect.map((calls) => calls.length === 1))
          );

          const refused = yield* records
            .ensureChannelIdle(post.workspaceId, channel)
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "PostsPublishing");

          // Another channel of the workspace is not kept by it.
          yield* records.ensureChannelIdle(post.workspaceId, other);

          yield* platform.release(channel);
          yield* eventually("the post finishes", isFinished(post.id));
          yield* records.ensureChannelIdle(post.workspaceId, channel);
        }).pipe(Effect.provide(PostRecordsTest))
      ),
    timeout
  );

  // A post of two parts, the second an hour after the first, at 08:00.
  const scheduleThread = Effect.fn("test.scheduleThread")(
    function* scheduleThread(channel: ChannelId) {
      const workspaceId = yield* newId(WorkspaceIdSchema).pipe(
        Effect.provide(IdsLive)
      );

      const { post } = yield* PostScheduling.use((scheduling) =>
        scheduling.schedule(actorIn(workspaceId), {
          channelIds: [channel],
          content: new PostContent({
            followUps: [
              new PostPart({
                delaySeconds: 3600,
                media: [],
                overrides: [],
                text: "A synthetic second part",
              }),
            ],
            media: [],
            overrides: [],
            text: "A synthetic first part",
          }),
          schedule: scheduleIn("2026-06-15T08:00:00Z"),
        })
      );

      return post;
    }
  );

  const waitingBetweenParts = Effect.fn("test.waitingBetweenParts")(
    function* waitingBetweenParts(channel: ChannelId) {
      const post = yield* scheduleThread(channel);

      yield* eventually("the job sleeps", isSuspended(post.id));
      yield* setTime("2026-06-15T08:00:00Z");

      const [target] = yield* targetsOf(post.id);

      assert(target !== undefined);

      yield* eventually(
        "the first part is out",
        callsOn(channel).pipe(Effect.map((calls) => calls.length === 1))
      );
      yield* eventually("the job waits", isTargetWaiting(target.id));

      return { post, target };
    }
  );

  it.effect(
    "erases a workspace whose thread waits between two parts, and sends nothing more",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* erasesWaitingThread() {
          const records = yield* PostRecords;
          const channel = yield* newChannel;
          const { post, target } = yield* waitingBetweenParts(channel);

          // Publishing, with a part left for an hour from now: no call is
          // in flight, so nothing keeps the workspace.
          yield* records.ensureErasable(post.workspaceId);
          yield* records.eraseWorkspace(post.workspaceId);

          assert.isTrue(yield* isGone(post.id));

          // The wait was stopped with the erasure.
          yield* eventually(
            "the round's job ends",
            isTargetWaiting(target.id).pipe(Effect.map((waits) => !waits))
          );

          yield* setTime("2026-06-15T09:00:01Z");
          yield* settle();

          assert.lengthOf(yield* callsOn(channel), 1);
        }).pipe(Effect.provide(PostRecordsTest))
      ),
    timeout
  );

  it.effect(
    "sends nothing when the job of an erased thread wakes all the same",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* wakesForNothing() {
          const records = yield* PostRecords;
          const channel = yield* newChannel;
          const { post, target } = yield* waitingBetweenParts(channel);

          yield* records.eraseWorkspace(post.workspaceId);
          yield* setTime("2026-06-15T09:00:01Z");

          const executionId = yield* PublishTargetV2.executionId({
            codeVersion: 1,
            round: 1,
            targetId: target.id,
          });

          yield* eventually(
            "the round's job ends",
            PublishTargetV2.poll(executionId).pipe(
              Effect.map(
                (result) =>
                  Option.isSome(result) && result.value._tag === "Complete"
              )
            )
          );

          const ended = yield* PublishTargetV2.poll(executionId);

          // It ended by itself, not on a defect: the target was gone.
          assert.isTrue(
            Option.isSome(ended) &&
              ended.value._tag === "Complete" &&
              Exit.isSuccess(ended.value.exit) &&
              ended.value.exit.value === "superseded"
          );
          assert.lengthOf(yield* callsOn(channel), 1);
        }).pipe(Effect.provide(PostRecordsLosingRoundInterrupts))
      ),
    timeout
  );
});
