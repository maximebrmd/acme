import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { planClosure } from "#workspace/domain/account-closure.ts";
import type {
  ErasureEntry,
  ErasureEntryId,
} from "#workspace/domain/erasure-ledger.ts";
import { LastOwner } from "#workspace/domain/last-owner.ts";

import { AccountStore } from "./account-store.ts";
import { ContextRecords } from "./context-records.ts";
import type { ErasureLedgerUnavailable } from "./erasure-ledger-unavailable.ts";
import { ErasureLedger } from "./erasure-ledger.ts";
import { eraseWorkspace, removeWorkspaceFiles } from "./workspace-erasure.ts";

/** What applying one entry of the ledger again did. */
export interface ReplayedEntry {
  /** The account it erased again, if the restore had brought it back. */
  readonly account: UserId | null;
  readonly id: ErasureEntryId;
  /** The workspaces it erased again. */
  readonly workspaces: readonly WorkspaceId[];
}

/** An entry that could not be applied, and why. */
export interface FailedEntry {
  readonly id: ErasureEntryId;
  /**
   * The tag of what refused: a post going out, Stripe still billing, or a
   * workspace the account would leave without a member or an owner.
   */
  readonly reason: string;
}

/** What a replay of the ledger did. */
export interface ReplayReport {
  /** Entries whose account and workspaces were all gone already. */
  readonly alreadyGone: number;
  /** Entries read from the ledger. */
  readonly entries: number;
  /** Entries that erased something again. */
  readonly erased: readonly ReplayedEntry[];
  /** Entries that were refused, left as the restore brought them back. */
  readonly failed: readonly FailedEntry[];
  /**
   * Entries the server never confirmed: erasures whose end it did not see.
   * Left alone unless the replay is told to apply them too.
   */
  readonly unconfirmed: readonly ErasureEntry[];
  /**
   * The keys of the ledger's objects that do not read as entries: what
   * each asked to erase is unknown, and was not applied.
   */
  readonly unreadable: readonly string[];
}

/** How a replay treats what it cannot be sure of. */
export interface ReplayOptions {
  /** Apply the entries never confirmed too. */
  readonly applyUnconfirmed: boolean;
}

// An entry that was refused: reported, and the replay goes on.
const refused = (entry: ErasureEntry, reason: string) =>
  Effect.logWarning("An erasure could not be applied again").pipe(
    Effect.annotateLogs({ erasureId: entry.id, reason }),
    Effect.as({
      done: null,
      failed: { id: entry.id, reason } satisfies FailedEntry,
    })
  );

/**
 * Applies the erasure ledger again, after the database was restored from a
 * backup: every account closed and every workspace deleted since that
 * backup is back, and each is erased again, as the person asked, before
 * the server takes requests. It erases what the ledger names and the
 * database still holds, and nothing else, so running it again, or on a
 * database that was not restored, changes nothing. Each entry goes in a
 * transaction of its own: one that is refused (a post going out, Stripe
 * still billing) is reported and the rest go on. No password or name is
 * asked again, no subscription cancelled (they were, when the erasure
 * first ran, and Stripe is not restored) and no email sent. A closed
 * account's identity is held for the law again, as closed when it first
 * was, on a server that keeps it. Media files went when the erasure first
 * ran; what a restore cannot bring back is removed again all the same.
 */
export class ReplayErasures extends Context.Service<
  ReplayErasures,
  {
    readonly replay: (
      options: ReplayOptions
    ) => Effect.Effect<ReplayReport, DatabaseError | ErasureLedgerUnavailable>;
  }
>()("peal-server/workspace/application/ReplayErasures") {
  static readonly layer = Layer.effect(
    ReplayErasures,
    Effect.gen(function* ReplayErasuresLive() {
      const ports = yield* Effect.context<
        AccountStore | ContextRecords | TransactionRunner
      >();

      const store = yield* AccountStore;
      const records = yield* ContextRecords;
      const ledger = yield* ErasureLedger;
      const { transaction } = yield* TransactionRunner;

      // The account, erased as closing it erased it, if it is back.
      const eraseAccount = Effect.fn("ReplayErasures.eraseAccount")(
        function* eraseAccount(
          userId: UserId,
          entry: ErasureEntry,
          restored: readonly WorkspaceId[]
        ) {
          const account = yield* store.records(userId);

          if (Option.isNone(account)) {
            return false;
          }

          // As closing the account checked: besides the workspaces it
          // deleted then, the restore may have made the account the only
          // member, or the only owner, of one others had joined since.
          // Erasing it would leave that workspace to nobody, its posts
          // still going out: refused, for whoever restores to decide.
          const others = (yield* store.standings(userId)).filter(
            ({ workspaceId }) => !restored.includes(workspaceId)
          );

          const plan = yield* Effect.fromResult(planClosure(others));

          if (plan.deleted.length > 0) {
            return yield* new LastOwner({
              workspaces: others
                .filter(({ workspaceId }) => plan.deleted.includes(workspaceId))
                .map(({ workspaceId, workspaceName }) => ({
                  id: workspaceId,
                  name: workspaceName,
                })),
            });
          }

          // Read before anything goes, as closing the account reads it.
          const identification = yield* store.identification(userId, restored);

          yield* Effect.forEach(restored, eraseWorkspace, { discard: true });
          yield* records.eraseUser(userId, account.value.user.email);
          yield* store.deleteUser(userId);

          yield* Effect.forEach(
            Option.toArray(identification),
            (held) => records.holdIdentification(held, entry.at),
            { discard: true }
          );

          return true;
        }
      );

      const apply = Effect.fn("ReplayErasures.apply")(function* apply(
        entry: ErasureEntry
      ) {
        const replayed = yield* transaction(
          Effect.gen(function* applyInTransaction() {
            // Locked as a deletion locks them, and only those still there.
            const found = yield* Effect.all(
              entry.workspaceIds.map((id) =>
                store
                  .workspace(id)
                  .pipe(
                    Effect.map((workspace) =>
                      Option.isSome(workspace) ? [id] : []
                    )
                  )
              )
            );

            const restored = found.flat();

            const closed =
              entry.userId === null
                ? false
                : yield* eraseAccount(entry.userId, entry, restored);

            // A workspace deleted on its own, or whose account is gone.
            if (!closed) {
              yield* Effect.forEach(restored, eraseWorkspace, {
                discard: true,
              });
            }

            const done: ReplayedEntry = {
              account: closed ? entry.userId : null,
              id: entry.id,
              workspaces: restored,
            };

            return done;
          })
        );

        yield* Effect.forEach(entry.workspaceIds, removeWorkspaceFiles, {
          discard: true,
        });

        if (replayed.account !== null || replayed.workspaces.length > 0) {
          // Ids only, as the ledger holds them.
          yield* Effect.logInfo("Erased again after a restore").pipe(
            Effect.annotateLogs({
              erasureId: entry.id,
              "event.name": "peal.erasure.replayed",
              userId: replayed.account,
              workspaceIds: replayed.workspaces.join(","),
            })
          );
        }

        return replayed;
      });

      const replay = Effect.fn("ReplayErasures.replay")(function* replay(
        options: ReplayOptions
      ) {
        const entries = yield* ledger.entries;

        const unconfirmed = options.applyUnconfirmed
          ? []
          : entries.filter(({ confirmed }) => !confirmed);

        const applied = yield* Effect.forEach(
          entries.filter(
            ({ confirmed }) => confirmed || options.applyUnconfirmed
          ),
          (entry) =>
            apply(entry).pipe(
              Effect.map((done) => ({ done, failed: null })),
              Effect.catchTags({
                BillingUnavailable: ({ _tag }) => refused(entry, _tag),
                LastOwner: ({ _tag }) => refused(entry, _tag),
                WorkspaceBusy: ({ _tag }) => refused(entry, _tag),
                WorkspaceSubscribed: ({ _tag }) => refused(entry, _tag),
              })
            )
        );

        const done = applied.flatMap((result) =>
          result.done === null ? [] : [result.done]
        );

        const erased = done.filter(
          ({ account, workspaces }) => account !== null || workspaces.length > 0
        );

        const report: ReplayReport = {
          alreadyGone: done.length - erased.length,
          entries: entries.length,
          erased,
          failed: applied.flatMap((result) =>
            result.failed === null ? [] : [result.failed]
          ),
          unconfirmed,
          unreadable: yield* ledger.unreadable,
        };

        return report;
      }, Effect.provideContext(ports));

      return ReplayErasures.of({ replay });
    })
  );
}
