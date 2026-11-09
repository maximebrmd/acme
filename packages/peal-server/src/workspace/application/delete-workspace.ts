import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
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
import type {
  ContextRecords,
  WorkspaceErasureOptions,
} from "./context-records.ts";
import type { WorkspaceBusy } from "./workspace-busy.ts";
import { eraseWorkspace, removeWorkspaceFiles } from "./workspace-erasure.ts";
import type { WorkspaceSubscribed } from "./workspace-subscribed.ts";

/**
 * Deletes the actor's workspace, for good, with everything in it. Needs
 * organization:delete (owners), the owner in person (`ownSession`), and the
 * workspace's name, typed again, which spaces around it aside must match.
 * A subscription Stripe may still bill it through is cancelled at once,
 * when `options` says the owner agreed to; otherwise the deletion is
 * refused (`WorkspaceSubscribed`, with what cancelling would end). Refused
 * too while Stripe cannot be reached, or while one of its posts is going
 * out. The owner is emailed a confirmation, in their language.
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
      | MissingPermission
      | NotAMember
      | SessionRequired
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
        AccountStore | ContextRecords | TransactionRunner
      >();

      const store = yield* AccountStore;
      const mail = yield* AccountMail;
      const { transaction } = yield* TransactionRunner;

      const remove = Effect.fn("DeleteWorkspace.delete")(function* remove(
        actor: Actor,
        principal: UserPrincipal,
        confirmation: string,
        options: WorkspaceErasureOptions
      ) {
        yield* Effect.fromResult(authorize(actor, "organization:delete"));
        const userId = yield* Effect.fromResult(ownSession(principal));

        const { workspaceId } = actor;

        const { subscriptionsCancelled, workspaceName } = yield* transaction(
          Effect.gen(function* deleteInTransaction() {
            // Locked first, as closing an account locks its workspaces
            // before erasing them: the two wait for each other, never
            // deadlock, and the name checked is the one deleted.
            const { name } = yield* store.workspace(workspaceId).pipe(
              Effect.flatMap(
                Option.match({
                  onNone: () => Effect.fail(new NotAMember({ workspaceId })),
                  onSome: Effect.succeed,
                })
              )
            );

            if (confirmation.trim() !== name.trim()) {
              yield* new WorkspaceNameMismatch({ workspaceId });
            }

            const erased = yield* eraseWorkspace(workspaceId, options);

            return { ...erased, workspaceName: name };
          })
        );

        yield* removeWorkspaceFiles(workspaceId);

        // Ids only: what a restore of the database must delete again.
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
