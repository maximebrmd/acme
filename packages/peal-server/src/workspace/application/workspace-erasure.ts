import { Effect, Schedule } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

import { AccountStore } from "./account-store.ts";
import { ContextRecords } from "./context-records.ts";
import { ErasureIncomplete } from "./erasure-incomplete.ts";

/**
 * Deletes a workspace and everything every context keeps in it, its media
 * files aside, once `ContextRecords.settleWorkspaces` settled it at Stripe.
 * Run it in a transaction, which it joins: the workspace goes whole or not
 * at all.
 */
export const eraseWorkspace = Effect.fn("Workspace.erase")(
  function* eraseWorkspace(workspaceId: WorkspaceId) {
    const records = yield* ContextRecords;
    const store = yield* AccountStore;

    yield* records.eraseWorkspace(workspaceId);
    yield* store.deleteWorkspace(workspaceId);
  }
);

/**
 * Says an erasure failed once settling cancelled subscriptions at Stripe,
 * whatever stopped it, and logs it: the workspaces stay, on the free plan
 * once Stripe's events come, and deleting them again goes without
 * cancelling anything more. The person hears their subscriptions were
 * cancelled (`ErasureIncomplete`), not the bare failure. An erasure that
 * cancelled nothing fails as it did.
 */
export const reportCancelledFirst =
  (subscriptionsCancelled: number) =>
  <A, E extends { readonly _tag: string }, R>(
    erasure: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | ErasureIncomplete, R> =>
    subscriptionsCancelled === 0
      ? erasure
      : erasure.pipe(
          Effect.catch(({ _tag: reason }) =>
            Effect.logWarning(
              "An erasure failed after its subscriptions were cancelled at Stripe"
            ).pipe(
              Effect.annotateLogs({ reason, subscriptionsCancelled }),
              Effect.andThen(
                Effect.fail(
                  new ErasureIncomplete({ reason, subscriptionsCancelled })
                )
              )
            )
          )
        );

// A store briefly unavailable gets three more tries, over a few seconds.
const retry = { schedule: Schedule.exponential("500 millis"), times: 3 };

/**
 * Deletes the media files of a workspace erased a moment ago, once the
 * transaction that erased it committed. Files the store keeps are only
 * logged: nothing refers to them any more, and the workspace is gone.
 */
export const removeWorkspaceFiles = Effect.fn("Workspace.removeFiles")(
  function* removeWorkspaceFiles(workspaceId: WorkspaceId) {
    const records = yield* ContextRecords;

    yield* records.removeWorkspaceFiles(workspaceId).pipe(
      Effect.retry(retry),
      Effect.catchTag("WorkspaceFilesRemain", (failure) =>
        Effect.logError(
          "The media files of a deleted workspace remain in the store",
          failure.cause
        )
      ),
      Effect.annotateLogs({ workspaceId })
    );
  }
);
