import { Context, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { CustomerWorkspace } from "#workspace/domain/customer-workspace.ts";
import { MissingPartnerScope } from "#workspace/domain/missing-partner-scope.ts";
import type { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";

import { AccountStore } from "./account-store.ts";
import type { BillingUnavailable } from "./billing-unavailable.ts";
import { ContextRecords } from "./context-records.ts";
import { CustomerWorkspaceNotFound } from "./customer-workspace-not-found.ts";
import { CustomerWorkspaces } from "./customer-workspaces.ts";
import type { ErasureIncomplete } from "./erasure-incomplete.ts";
import type { ErasureLedgerUnavailable } from "./erasure-ledger-unavailable.ts";
import type { ErasureLedger } from "./erasure-ledger.ts";
import type { WorkspaceBusy } from "./workspace-busy.ts";
import {
  confirmErasure,
  discardOnFailure,
  eraseWorkspace,
  erasureOf,
  recordErasure,
  removeWorkspaceFiles,
  reportCancelledFirst,
} from "./workspace-erasure.ts";

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

/**
 * Offboards one of a partner's customers: deletes the workspace the
 * partner owns for them, for good, with everything in it, as
 * `DeleteWorkspace` deletes a workspace for its owner. The same erasure:
 * every context's records, the ledger kept outside the database so a
 * restore deletes it again, the media files once the rest committed.
 *
 * Needs a partner key with `workspaces:delete`. It reaches only workspaces
 * the key's partner owns: those have no members, so no person's workspace
 * is ever deleted this way, and any other reads as one that does not
 * exist. Refused while one of its posts is going out. A workspace a
 * partner owns has no subscription of its own, so nothing is cancelled at
 * Stripe; its open checkouts, should it have any, are expired as for any
 * workspace.
 */
export class OffboardWorkspace extends Context.Service<
  OffboardWorkspace,
  {
    readonly offboard: (
      key: PartnerKeyPrincipal,
      workspaceId: string
    ) => Effect.Effect<
      void,
      | BillingUnavailable
      | CustomerWorkspaceNotFound
      | DatabaseError
      | ErasureIncomplete
      | ErasureLedgerUnavailable
      | MissingPartnerScope
      | WorkspaceBusy
    >;
  }
>()("peal-server/workspace/application/OffboardWorkspace") {
  static readonly layer = Layer.effect(
    OffboardWorkspace,
    Effect.gen(function* OffboardWorkspaceLive() {
      const ports = yield* Effect.context<
        AccountStore | ContextRecords | ErasureLedger | Ids | TransactionRunner
      >();

      const workspaces = yield* CustomerWorkspaces;
      const records = yield* ContextRecords;
      const { transaction } = yield* TransactionRunner;

      // The workspace, while the key's partner owns it.
      const ownedBy = Effect.fn("OffboardWorkspace.ownedBy")(function* ownedBy(
        key: PartnerKeyPrincipal,
        requested: string
      ) {
        const id = decodeWorkspaceId(requested);

        const owned = Option.isSome(id)
          ? yield* workspaces.ofPartner(key.partnerId, id.value)
          : Option.none<CustomerWorkspace>();

        if (Option.isNone(owned)) {
          return yield* new CustomerWorkspaceNotFound();
        }

        return owned.value;
      });

      const offboard = Effect.fn("OffboardWorkspace.offboard")(
        function* offboard(key: PartnerKeyPrincipal, requested: string) {
          if (!key.scopes.includes("workspaces:delete")) {
            yield* new MissingPartnerScope({ scope: "workspaces:delete" });
          }

          const owned = yield* ownedBy(key, requested);

          const workspaceId = owned.id;

          // In the ledger first, unconfirmed, as for any erasure.
          const erasure = yield* erasureOf(null, [workspaceId]);

          yield* recordErasure(erasure);

          // No member ever ordered for a workspace a partner owns, so
          // Stripe holds no subscription of it: one found would be a bug.
          const { subscriptionsCancelled } = yield* records
            .settleWorkspaces([workspaceId], { cancelSubscriptions: true })
            .pipe(
              discardOnFailure(erasure),
              Effect.catchTag("WorkspaceSubscribed", Effect.die)
            );

          yield* Effect.uninterruptible(
            Effect.gen(function* erase() {
              yield* transaction(
                Effect.gen(function* deleteInTransaction() {
                  // Still the partner's, and locked: an offboarding sent
                  // twice deletes once.
                  yield* ownedBy(key, workspaceId);

                  yield* AccountStore.use((store) =>
                    store.workspace(workspaceId)
                  );

                  yield* eraseWorkspace(workspaceId).pipe(
                    Effect.catchTag("WorkspaceSubscribed", Effect.die)
                  );
                })
              ).pipe(
                discardOnFailure(erasure),
                reportCancelledFirst(subscriptionsCancelled)
              );

              yield* confirmErasure(erasure);
              yield* removeWorkspaceFiles(workspaceId);

              // Ids only, as the ledger holds them.
              yield* Effect.logInfo("Offboarded a partner's workspace").pipe(
                Effect.annotateLogs({
                  "event.name": "peal.erasure",
                  partnerId: key.partnerId,
                  partnerKeyId: key.partnerKeyId,
                  subscriptionsCancelled,
                  workspaceId,
                })
              );
            })
          );
        },
        Effect.provideContext(ports)
      );

      return OffboardWorkspace.of({ offboard });
    })
  );
}
