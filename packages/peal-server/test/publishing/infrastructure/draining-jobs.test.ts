import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { WorkflowEngine } from "effect/workflow";

import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import {
  ExecutionIdSchema,
  PublicationScheduler,
} from "#publishing/application/publication-scheduler.ts";
import { WorkflowPublicationScheduler } from "#publishing/infrastructure/workflow-publication-scheduler.ts";
import { PublishTargetV2 } from "#publishing/infrastructure/workflows/publish-parts.ts";
import { PublishPostV1 } from "#publishing/infrastructure/workflows/publish-post.ts";
import { PublishTargetV1 } from "#publishing/infrastructure/workflows/publish-target.ts";

import {
  callsOn,
  eventually,
  isFinished,
  newChannel,
  onServerAt,
  outcomeOf,
  PublishingTest,
  scheduleIn,
  schedulePost,
  targetsOf,
} from "./harness.ts";

// Jobs stored before posts had parts were started at version 1, and their
// history may hold PublishTargetV1 children: they must end as they began,
// while every job started now runs PublishTargetV2.

// Starts post jobs as the release before parts did.
const SchedulerBeforeParts = Layer.effect(
  PublicationScheduler,
  Effect.gen(function* SchedulerBeforeParts() {
    const scheduler = yield* PublicationScheduler;
    const engine = yield* WorkflowEngine.WorkflowEngine;

    return PublicationScheduler.of({
      ...scheduler,
      schedule: ({ postId, revision, scheduledAt }) =>
        PublishPostV1.execute(
          { codeVersion: 1, postId, revision, scheduledAt },
          { discard: true }
        ).pipe(
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.map((executionId) => ExecutionIdSchema.make(executionId))
        ),
    });
  })
).pipe(Layer.provide(WorkflowPublicationScheduler));

const PublishingBeforePartsTest = Layer.fresh(PostScheduling.layer).pipe(
  Layer.provide(SchedulerBeforeParts),
  Layer.provideMerge(PublishingTest)
);

// Whether a target job of this workflow ran for the target's first round.
const ranAs = (
  workflow: typeof PublishTargetV1 | typeof PublishTargetV2,
  targetId: Parameters<typeof PublishTargetV1.executionId>[0]["targetId"]
) =>
  workflow.executionId({ codeVersion: 1, round: 1, targetId }).pipe(
    Effect.flatMap((executionId) => workflow.poll(executionId)),
    Effect.map(Option.isSome)
  );

describe("the target job a post's job runs", () => {
  it.effect(
    "is PublishTargetV1 for a job started before posts had parts",
    () =>
      onServerAt(
        "2026-06-15T08:00:00Z",
        Effect.gen(function* drainsV1() {
          const channel = yield* newChannel;

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the post finishes", isFinished(post.id));

          const [target] = yield* targetsOf(post.id);

          assert(target !== undefined);
          assert.isTrue(yield* ranAs(PublishTargetV1, target.id));
          assert.isFalse(yield* ranAs(PublishTargetV2, target.id));
          assert.strictEqual(yield* outcomeOf(post.id), "published");
          assert.lengthOf(yield* callsOn(channel), 1);
        }),
        PublishingBeforePartsTest
      ),
    60_000
  );

  it.effect(
    "is PublishTargetV2 for every job started now",
    () =>
      onServerAt(
        "2026-06-15T08:00:00Z",
        Effect.gen(function* runsV2() {
          const channel = yield* newChannel;

          const post = yield* schedulePost(
            [channel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the post finishes", isFinished(post.id));

          const [target] = yield* targetsOf(post.id);

          assert(target !== undefined);
          assert.isTrue(yield* ranAs(PublishTargetV2, target.id));
          assert.isFalse(yield* ranAs(PublishTargetV1, target.id));
          assert.lengthOf(target.liveParts, 1);
        })
      ),
    60_000
  );
});
