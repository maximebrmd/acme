import { DateTime, Effect, Schedule } from "effect";

import { newId } from "#shared/application/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { ErasureEntryIdSchema } from "#workspace/domain/erasure-ledger.ts";
import type { ErasureEntry } from "#workspace/domain/erasure-ledger.ts";

import { AccountStore } from "./account-store.ts";
import { ContextRecords } from "./context-records.ts";
import { ErasureIncomplete } from "./erasure-incomplete.ts";
import { ErasureLedger } from "./erasure-ledger.ts";

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
 * transaction that erased it committed. Files the store keeps are logged,
 * and deleted later: the erasure listed the folder for the media
 * context's sweep, which empties it.
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

/**
 * The ledger's entry for an erasure about to run, not yet confirmed: the
 * account closing, if one is, and the workspaces deleted, by id, now.
 */
export const erasureOf = Effect.fn("Erasure.entry")(function* erasureOf(
  userId: UserId | null,
  workspaceIds: readonly WorkspaceId[]
) {
  const entry: ErasureEntry = {
    at: yield* DateTime.now,
    confirmed: false,
    id: yield* newId(ErasureEntryIdSchema),
    userId,
    version: 1,
    workspaceIds,
  };

  return entry;
});

/**
 * Writes the erasure in the ledger, unconfirmed. Run it last in the
 * erasure's transaction: an erasure that cannot be recorded outside the
 * database does not commit, as a restore would bring it back unnoticed.
 */
export const recordErasure = (entry: ErasureEntry) =>
  ErasureLedger.use((ledger) => ledger.record(entry));

/**
 * Takes the entry back out of the ledger when its erasure's transaction
 * failed, so a restore never deletes what was not. A failure to do so is
 * logged: the entry stays unconfirmed, which a replay reports and leaves.
 */
export const discardOnFailure =
  (entry: ErasureEntry) =>
  <A, E, R>(erasure: Effect.Effect<A, E, R>) =>
    erasure.pipe(
      Effect.onError(() =>
        ErasureLedger.use((ledger) => ledger.discard(entry.id)).pipe(
          Effect.catchCause((cause) =>
            Effect.logError(
              "An erasure that failed stays unconfirmed in the ledger",
              cause
            ).pipe(Effect.annotateLogs({ erasureId: entry.id }))
          )
        )
      )
    );

/**
 * Confirms the entry once its erasure committed. The erasure stands
 * whatever happens here: an entry the store would not take is logged as
 * unconfirmed, by id, for whoever replays the ledger after a restore.
 */
export const confirmErasure = Effect.fn("Erasure.confirm")(
  function* confirmErasure(entry: ErasureEntry) {
    const ledger = yield* ErasureLedger;

    yield* ledger.record({ ...entry, confirmed: true }).pipe(
      Effect.retry(retry),
      Effect.catchTag("ErasureLedgerUnavailable", (failure) =>
        Effect.logError(
          "An erasure that committed stays unconfirmed in the ledger",
          failure.cause
        ).pipe(
          Effect.annotateLogs({
            erasureId: entry.id,
            "event.name": "peal.erasure.unconfirmed",
          })
        )
      )
    );
  }
);
