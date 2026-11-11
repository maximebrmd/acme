import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  BillingUnavailable,
  DeletionIncomplete,
  CurrentMember,
  Forbidden,
  MediaStoreUnavailable,
  PartnerOwnsWorkspaces,
  WorkspaceBusy,
  WorkspaceNameMismatch,
  WorkspaceNotFound,
} from "peal-contract";
import type { WorkspaceSecurity as WorkspaceSecurityAnswer } from "peal-contract";

import { actorOf } from "#shared/api/actor.ts";
import { forbidden, personRequired } from "#shared/api/forbidden.ts";
import { DeleteWorkspace } from "#workspace/application/delete-workspace.ts";
import { WorkspaceSecurity } from "#workspace/application/workspace-security.ts";
import type { WorkspaceSecurityView } from "#workspace/application/workspace-security.ts";

import { userPrincipalOf } from "./principal.ts";
import { subscribedOf } from "./subscribed.ts";

const securityView = ({
  membersWithoutTwoStep,
  twoStepRequired,
}: WorkspaceSecurityView): WorkspaceSecurityAnswer => ({
  ...Option.match(membersWithoutTwoStep, {
    onNone: () => ({}),
    onSome: (count) => ({ membersWithoutTwoStep: count }),
  }),
  twoStepRequired,
});

export const WorkspacesHandlers = HttpApiBuilder.group(
  Api,
  "workspaces",
  Effect.fn(function* workspacesHandlers(handlers) {
    const deletion = yield* DeleteWorkspace;
    const security = yield* WorkspaceSecurity;

    return handlers.handleAll({
      delete: ({ payload }) =>
        Effect.gen(function* remove() {
          const member = yield* CurrentMember;

          // An API key belongs to the workspace: it never deletes it.
          const principal =
            member.principal._tag === "user"
              ? userPrincipalOf(member.principal)
              : yield* personRequired();

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
                ErasureIncomplete: ({ subscriptionsCancelled }) =>
                  Effect.fail(
                    new DeletionIncomplete({ subscriptionsCancelled })
                  ),
                ErasureLedgerUnavailable: ({ cause }) =>
                  Effect.logWarning(
                    "The erasure ledger could not be written, so nothing was deleted",
                    cause
                  ).pipe(
                    Effect.andThen(Effect.fail(new MediaStoreUnavailable()))
                  ),
                MissingPermission: forbidden,
                NotAMember: () => Effect.fail(new WorkspaceNotFound()),
                PartnerOwnsWorkspaces: ({ owned }) =>
                  Effect.fail(new PartnerOwnsWorkspaces({ owned })),
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
      secure: ({ payload }) =>
        Effect.gen(function* secure() {
          const actor = actorOf(yield* CurrentMember);

          return securityView(
            yield* security.require(actor, payload.twoStepRequired).pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                DirectoryUnavailable: Effect.die,
                MissingPermission: forbidden,
                PersonRequired: forbidden,
                // The owner's own account, not a member's: told so.
                TwoStepRequired: () =>
                  Effect.fail(
                    new Forbidden({
                      message:
                        "Turn two-step verification on for your own account first, in your account settings: then require it of the workspace's members.",
                      reason: "twoStepRequired",
                    })
                  ),
              })
            )
          );
        }),
      security: () =>
        Effect.gen(function* read() {
          const actor = actorOf(yield* CurrentMember);

          return securityView(
            yield* security.read(actor).pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                DirectoryUnavailable: Effect.die,
              })
            )
          );
        }),
    });
  })
);
