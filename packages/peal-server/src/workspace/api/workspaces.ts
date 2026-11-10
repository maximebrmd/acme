import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  BillingUnavailable,
  CurrentMember,
  Forbidden,
  MediaStoreUnavailable,
  WorkspaceBusy,
  WorkspaceNameMismatch,
  WorkspaceNotFound,
} from "peal-contract";

import { actorOf } from "#shared/api/actor.ts";
import { DeleteWorkspace } from "#workspace/application/delete-workspace.ts";

import { userPrincipalOf } from "./principal.ts";
import { subscribedOf } from "./subscribed.ts";

const forbidden = () => Effect.fail(new Forbidden());

export const WorkspacesHandlers = HttpApiBuilder.group(
  Api,
  "workspaces",
  Effect.fn(function* workspacesHandlers(handlers) {
    const deletion = yield* DeleteWorkspace;

    return handlers.handleAll({
      delete: ({ payload }) =>
        Effect.gen(function* remove() {
          const member = yield* CurrentMember;

          // An API key belongs to the workspace: it never deletes it.
          const principal =
            member.principal._tag === "user"
              ? userPrincipalOf(member.principal)
              : yield* new Forbidden();

          yield* deletion
            .delete(actorOf(member), principal, payload.name, {
              cancelSubscriptions: payload.cancelSubscriptions === true,
            })
            .pipe(
              Effect.catchTags({
                BillingUnavailable: ({ workspaceId }) =>
                  Effect.logWarning(
                    "Stripe could not be reached to expire a workspace's open checkouts"
                  ).pipe(
                    Effect.annotateLogs({ workspaceId }),
                    Effect.andThen(
                      Effect.fail(new BillingUnavailable({ workspaceId }))
                    )
                  ),
                DatabaseError: Effect.die,
                ErasureLedgerUnavailable: ({ cause }) =>
                  Effect.logWarning(
                    "The erasure ledger could not be written, so nothing was deleted",
                    cause
                  ).pipe(
                    Effect.andThen(Effect.fail(new MediaStoreUnavailable()))
                  ),
                MissingPermission: forbidden,
                NotAMember: () => Effect.fail(new WorkspaceNotFound()),
                SessionRequired: forbidden,
                WorkspaceBusy: ({ workspaceId }) =>
                  Effect.fail(new WorkspaceBusy({ workspaceId })),
                WorkspaceNameMismatch: () =>
                  Effect.fail(new WorkspaceNameMismatch()),
                WorkspaceSubscribed: (refused) =>
                  Effect.fail(subscribedOf(refused)),
              })
            );
        }),
    });
  })
);
