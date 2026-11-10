import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { NotAMember } from "#workspace/domain/not-a-member.ts";
import { ownSession } from "#workspace/domain/own-session.ts";
import type { SessionRequired } from "#workspace/domain/session-required.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";
import { WorkspaceNameMismatch } from "#workspace/domain/workspace-name-mismatch.ts";

import { AccountMail } from "./account-mail.ts";
import { AccountStore } from "./account-store.ts";
import type { BillingUnavailable } from "./billing-unavailable.ts";
import { ContextRecords } from "./context-records.ts";
import type { WorkspaceErasureOptions } from "./context-records.ts";
import type { ErasureLedgerUnavailable } from "./erasure-ledger-unavailable.ts";
import type { ErasureLedger } from "./erasure-ledger.ts";
import type { ErasureIncomplete } from "./erasure-incomplete.ts";
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
import type { WorkspaceSubscribed } from "./workspace-subscribed.ts";

/**
 * Deletes the actor's workspace, for good, with everything in it. Needs
 * organization:delete (owners), the owner in person (`ownSession`), and the
 * workspace's name, typed again, which spaces around it aside must match.
 * A subscription Stripe may still bill it through is cancelled at once,
 * when `options` says the owner agreed to, before the erasure's
 * transaction, as Stripe's side cannot be rolled back; otherwise the
 * deletion is refused (`WorkspaceSubscribed`, with what cancelling would
 * end). Refused too while Stripe cannot be reached, or while one of its
 * posts is going out. The erasure is written in the ledger kept outside
 * the database before it commits, by id only, so a restore of the database
 * deletes the workspace again; when the ledger cannot be written, nothing
 * is deleted. The owner is emailed a confirmation, in their language.
 */
export class DeleteWorkspace extends Context.Service<
  DeleteWorkspace,
  {
    readonly delete: (
      actor: Actor,
      principal: UserPrincipal,
      confirmation: string,
      options: WorkspaceErasureOptions
    ) => Effect.Effect<
      void,
      | BillingUnavailable
      | DatabaseError
      | ErasureLedgerUnavailable
      | MissingPermission
      | NotAMember
      | SessionRequired
      | ErasureIncomplete
      | WorkspaceBusy
      | WorkspaceNameMismatch
      | WorkspaceSubscribed
    >;
  }
>()("peal-server/workspace/application/DeleteWorkspace") {
  static readonly layer = Layer.effect(
    DeleteWorkspace,
    Effect.gen(function* DeleteWorkspaceLive() {
      const ports = yield* Effect.context<
        AccountStore | ContextRecords | ErasureLedger | Ids | TransactionRunner
      >();

      const store = yield* AccountStore;
      const records = yield* ContextRecords;
      const mail = yield* AccountMail;
      const { transaction } = yield* TransactionRunner;

      // The workspace, locked when in a transaction.
      const found = (workspaceId: Actor["workspaceId"]) =>
        store.workspace(workspaceId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new NotAMember({ workspaceId })),
              onSome: Effect.succeed,
            })
          )
        );

      const remove = Effect.fn("DeleteWorkspace.delete")(function* remove(
        actor: Actor,
        principal: UserPrincipal,
        confirmation: string,
        options: WorkspaceErasureOptions
      ) {
        yield* Effect.fromResult(authorize(actor, "organization:delete"));
        const userId = yield* Effect.fromResult(ownSession(principal));

        const { workspaceId } = actor;

        // The name is checked before Stripe is asked anything, as
        // cancelling cannot be undone.
        const { name: workspaceName } = yield* found(workspaceId);

        if (confirmation.trim() !== workspaceName.trim()) {
          yield* new WorkspaceNameMismatch({ workspaceId });
        }

        const { subscriptionsCancelled } = yield* records.settleWorkspaces(
          [workspaceId],
          options
        );

        const erasure = yield* erasureOf(null, [workspaceId]);

        yield* transaction(
          Effect.gen(function* deleteInTransaction() {
            // Locked first, as closing an account locks its workspaces
            // before erasing them: the two wait for each other, never
            // deadlock.
            yield* found(workspaceId);
            yield* eraseWorkspace(workspaceId);
            // Last: nothing is committed that the ledger does not hold.
            yield* recordErasure(erasure);
          })
        ).pipe(
          discardOnFailure(erasure),
          reportCancelledFirst(subscriptionsCancelled)
        );

        yield* confirmErasure(erasure);

        yield* removeWorkspaceFiles(workspaceId);

        // Ids only, as the ledger holds them.
        yield* Effect.logInfo("Deleted a workspace").pipe(
          Effect.annotateLogs({
            "event.name": "peal.erasure",
            subscriptionsCancelled,
            workspaceId,
          })
        );

        const owner = yield* store.records(userId);

        if (Option.isSome(owner)) {
          const { email, locale } = owner.value.user;

          yield* mail.workspaceDeleted({
            email,
            locale,
            subscriptionsCancelled,
            workspaceName,
          });
        }
      }, Effect.provideContext(ports));

      return DeleteWorkspace.of({ delete: remove });
    })
  );
}
