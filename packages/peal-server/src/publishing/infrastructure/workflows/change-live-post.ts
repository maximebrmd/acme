import { Duration, Effect } from "effect";
import { ClusterSchema } from "effect/cluster";
import { Activity, DurableClock, Workflow } from "effect/workflow";

import {
  ChangeOutcomeSchema,
  claimRemovalRun,
  RemovalClaimSchema,
  removalAttemptRun,
  settleChangeRun,
} from "#publishing/application/live-post-removal.ts";
import type {
  ChangeEnding,
  ChangeOutcome,
} from "#publishing/application/live-post-removal.ts";
import { LivePostChangeIdSchema } from "#publishing/domain/live-post-change-id.ts";
import type { LivePostChangeId } from "#publishing/domain/live-post-change-id.ts";
import { RemovalDecisionSchema } from "#publishing/domain/removal-decision.ts";
import type { EarlierRemovals } from "#publishing/domain/removal-decision.ts";

import { retryingDatabase } from "./activity-retry.ts";

/**
 * Carries out one change of a live post: deletes its parts from the
 * platform, one at a time, in the order the change lists them (the last
 * part of a thread first), or edits its one part, each through the
 * channel's gate, trying a part again as long as the decision says
 * (`decideRemoval`), then records how it ended. The first part that
 * cannot be deleted or edited ends it: the parts left stay on the change
 * for a member who asks again.
 *
 * The payload is the change's id alone: nothing a post says is ever in
 * its history. Persisted contract from its first release: the tag, the
 * payload, the idempotency key (the change's id), the activity names
 * `claim`, `call/<part>/<n>` and `settle`, the clock names
 * `retry/<part>/<n>`, and every result schema
 * (`test/publishing/infrastructure/fixtures/persisted/ChangeLivePostV1`).
 */
export const ChangeLivePostV1 = Workflow.make("ChangeLivePostV1", {
  idempotencyKey: ({ changeId }) => changeId,
  payload: { changeId: LivePostChangeIdSchema },
  success: ChangeOutcomeSchema,
});

const callAt = (
  changeId: LivePostChangeId,
  part: number,
  attempt: number,
  earlier: EarlierRemovals
) =>
  Activity.make({
    execute: removalAttemptRun({ changeId, earlier, part }).pipe(
      retryingDatabase
    ),
    name: `call/${part}/${attempt}`,
    success: RemovalDecisionSchema,
  });

// Deletes one part, trying again while the decision says so: whether it
// is off the platform, or how the change ends.
const removePart = Effect.fn("ChangeLivePostV1.removePart")(
  function* removePart(changeId: LivePostChangeId, part: number) {
    let attempt = 1;
    let earlier: EarlierRemovals = { rateLimited: 0, unavailable: 0 };
    let decision = yield* callAt(changeId, part, attempt, earlier);

    while (decision._tag === "retry") {
      yield* DurableClock.sleep({
        duration: decision.delay,
        inMemoryThreshold: Duration.zero,
        name: `retry/${part}/${attempt}`,
      });

      earlier = decision.rateLimited
        ? { ...earlier, rateLimited: earlier.rateLimited + 1 }
        : { ...earlier, unavailable: earlier.unavailable + 1 };
      attempt += 1;
      decision = yield* callAt(changeId, part, attempt, earlier);
    }

    return decision;
  }
);

const settle = (changeId: LivePostChangeId, ending: ChangeEnding) =>
  Activity.make({
    execute: settleChangeRun(changeId, ending).pipe(retryingDatabase),
    name: "settle",
    success: ChangeOutcomeSchema,
  }).annotate(ClusterSchema.WithTransaction, true);

export const ChangeLivePostV1Live = ChangeLivePostV1.toLayer(
  Effect.fn("ChangeLivePostV1")(function* changeLivePost({ changeId }) {
    const claim = yield* Activity.make({
      execute: claimRemovalRun(changeId).pipe(retryingDatabase),
      name: "claim",
      success: RemovalClaimSchema,
    });

    if (claim._tag === "gone") {
      const outcome: ChangeOutcome = "gone";

      return outcome;
    }

    for (const part of claim.indexes) {
      const decision = yield* removePart(changeId, part);

      if (decision._tag === "gone") {
        const outcome: ChangeOutcome = "gone";

        return outcome;
      }

      if (decision._tag === "failed") {
        return yield* settle(changeId, {
          _tag: "failed",
          code: decision.code,
        });
      }
    }

    return yield* settle(changeId, { _tag: "done", parts: claim.indexes });
  })
);
