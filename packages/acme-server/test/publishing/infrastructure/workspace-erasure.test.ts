import { assert, describe, it } from "@effect/vitest";
import { Effect, Exit, Layer, Option } from "effect";

import { PostRecords } from "#publishing/application/post-records.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PublicationScheduler } from "#publishing/application/publication-scheduler.ts";
import { DrizzleWorkspacePostStore } from "#publishing/infrastructure/drizzle-workspace-post-store.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import type { PostId } from "#shared/domain/ids.ts";

import {
  eventually,
  executionOf,
  isFinished,
  isSuspended,
  jobResult,
  newChannel,
  onServerAt,
  scheduleIn,
  schedulePost,
  setTime,
  settle,
} from "./harness.ts";

// Erasing a workspace's posts, as deleting the workspace or its last
// member's account does, against the jobs that would publish them.

const timeout = 60_000;

// PostRecords on the server's scheduler and transactions.
const PostRecordsTest = PostRecords.layer.pipe(
  Layer.provide(DrizzleWorkspacePostStore)
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
              ended.value.value === "cancelled"
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
});
