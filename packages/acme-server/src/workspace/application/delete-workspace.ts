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

import { AccountStore } from "./account-store.ts";
import type { ContextRecords } from "./context-records.ts";
import type { WorkspaceBusy } from "./workspace-busy.ts";
import { eraseWorkspace, removeWorkspaceFiles } from "./workspace-erasure.ts";

/**
 * Deletes the actor's workspace, for good, with everything in it. Needs
 * organization:delete (owners), the owner in person (`ownSession`), and the
 * workspace's name, typed again, which spaces around it aside must match.
 */
export class DeleteWorkspace extends Context.Service<
  DeleteWorkspace,
  {
    readonly delete: (
      actor: Actor,
      principal: UserPrincipal,
      confirmation: string
    ) => Effect.Effect<
      void,
      | DatabaseError
      | MissingPermission
      | NotAMember
      | SessionRequired
      | WorkspaceBusy
      | WorkspaceNameMismatch
    >;
  }
>()("acme-server/workspace/application/DeleteWorkspace") {
  static readonly layer = Layer.effect(
    DeleteWorkspace,
    Effect.gen(function* DeleteWorkspaceLive() {
      const ports = yield* Effect.context<
        AccountStore | ContextRecords | TransactionRunner
      >();

      const store = yield* AccountStore;
      const { transaction } = yield* TransactionRunner;

      const remove = Effect.fn("DeleteWorkspace.delete")(function* remove(
        actor: Actor,
        principal: UserPrincipal,
        confirmation: string
      ) {
        yield* Effect.fromResult(authorize(actor, "organization:delete"));
        yield* Effect.fromResult(ownSession(principal));

        const { workspaceId } = actor;

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

        yield* transaction(eraseWorkspace(workspaceId));
        yield* removeWorkspaceFiles(workspaceId);
      }, Effect.provideContext(ports));

      return DeleteWorkspace.of({ delete: remove });
    })
  );
}
