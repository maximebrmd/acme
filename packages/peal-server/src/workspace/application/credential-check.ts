import { Array, Context, Effect, Layer, Match, Option, Result } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Permission } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import type { ApiKey } from "#workspace/domain/api-key.ts";
import type { BannedUser } from "#workspace/domain/banned-user.ts";
import { answerAccessDenied } from "#workspace/domain/membership.ts";
import type { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import type { PartnerKey } from "#workspace/domain/partner-key.ts";
import type { Partner } from "#workspace/domain/partner.ts";
import type { Principal } from "#workspace/domain/principal.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { Accounts } from "./accounts.ts";
import { ApiKeyIssuer } from "./api-key-issuer.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import { CustomerWorkspaces } from "./customer-workspaces.ts";
import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { NotSignedIn } from "./not-signed-in.ts";
import { PartnerStore } from "./partner-store.ts";
import { ResolveMember } from "./resolve-member.ts";

/** Why a workspace an OAuth token is bound to lets the person do nothing. */
export type BoundRefusal = "twoStepRequired";

/** The workspace an OAuth token is bound to, and what it may do there. */
export interface BoundWorkspace {
  readonly id: WorkspaceId;
  readonly name: string;
  /** None where the workspace refuses the person (`refused`). */
  readonly permissions: readonly Permission[];
  readonly refused: Option.Option<BoundRefusal>;
}

/** Who a credential is and what it may do: never the credential itself. */
export type CredentialDescription =
  | {
      readonly _tag: "user";
      /** The OAuth client acting for the person; none in a session. */
      readonly application: Option.Option<{
        readonly clientId: string;
        readonly scopes: readonly string[];
        /** None for a token bound to no workspace, or one left since. */
        readonly workspace: Option.Option<BoundWorkspace>;
      }>;
      readonly userId: string;
    }
  | {
      readonly _tag: "apiKey";
      readonly key: ApiKey;
      readonly workspaceName: string;
    }
  | {
      readonly _tag: "partnerKey";
      readonly key: PartnerKey;
      readonly partner: Partner;
    };

type Failure =
  | AuthUnavailable
  | BannedUser
  | DatabaseError
  | DirectoryUnavailable
  | NotSignedIn;

// What the middleware found, read again: revoked or gone between its read
// and this one, it is no credential.
const found = <A>(option: Option.Option<A>) =>
  Option.match(option, {
    onNone: () => Effect.fail(new NotSignedIn()),
    onSome: Effect.succeed,
  });

/**
 * Who the credential a request sends is, and what it may do: for any
 * principal `Authentication` knows, which already refused one revoked or
 * expired. It reads no workspace's data but its name, never a partner's
 * workspaces, and holds no key or token. A suspended account is refused,
 * as everywhere; a workspace that requires two-step verification refuses
 * nothing here, and is named as refusing in the workspace of a token bound
 * to it, decided by `ResolveMember` as every request into it is.
 */
export class CredentialCheck extends Context.Service<
  CredentialCheck,
  {
    readonly describe: (
      principal: Principal
    ) => Effect.Effect<CredentialDescription, Failure>;
  }
>()("peal-server/workspace/application/CredentialCheck") {
  static readonly layer = Layer.effect(
    CredentialCheck,
    Effect.gen(function* CredentialCheckLive() {
      const accounts = yield* Accounts;
      const members = yield* ResolveMember;
      const keys = yield* ApiKeyIssuer;
      const partners = yield* PartnerStore;
      const workspaces = yield* CustomerWorkspaces;

      const ofUser = Effect.fn("CredentialCheck.ofUser")(function* ofUser(
        principal: UserPrincipal
      ) {
        // Refuses an account gone or suspended.
        const { account } = yield* accounts.current(principal);

        const application = yield* Option.match(principal.oauth, {
          onNone: () => Effect.succeedNone,
          onSome: Effect.fnUntraced(function* bound(grant) {
            const workspace = yield* Option.match(grant.workspaceId, {
              onNone: () => Effect.succeedNone,
              onSome: Effect.fnUntraced(function* boundTo(workspaceId) {
                const membership = Array.findFirst(
                  account.workspaces,
                  ({ id }) => id === workspaceId
                );

                if (Option.isNone(membership)) {
                  return Option.none<BoundWorkspace>();
                }

                const { name } = membership.value;

                const decided = (yield* members.resolveMany(principal, [
                  workspaceId,
                ])).get(workspaceId);

                if (decided === undefined) {
                  return Option.none<BoundWorkspace>();
                }

                const refusedBy = (refusal: BoundRefusal) =>
                  Effect.succeed(
                    Option.some<BoundWorkspace>({
                      id: workspaceId,
                      name,
                      permissions: [],
                      refused: Option.some(refusal),
                    })
                  );

                return yield* Result.match(decided, {
                  onFailure: answerAccessDenied({
                    BannedUser: (banned) => Effect.fail(banned),
                    // Left since the account was read: nothing of it.
                    NotAMember: () => Effect.succeedNone,
                    TwoStepRequired: () => refusedBy("twoStepRequired"),
                    WorkspaceMismatch: () => Effect.succeedNone,
                  }),
                  onSuccess: (actor) =>
                    Effect.succeed(
                      Option.some<BoundWorkspace>({
                        id: workspaceId,
                        name,
                        permissions: actor.permissions,
                        refused: Option.none(),
                      })
                    ),
                });
              }),
            });

            return Option.some({
              clientId: grant.clientId,
              scopes: grant.scopes,
              workspace,
            });
          }),
        });

        return {
          _tag: "user",
          application,
          userId: account.id,
        } satisfies CredentialDescription;
      });

      const ofApiKey = Effect.fn("CredentialCheck.ofApiKey")(function* ofApiKey(
        principal: ApiKeyPrincipal
      ) {
        const key = yield* found(
          Array.findFirst(
            yield* keys.list(principal.workspaceId),
            ({ id }) => id === principal.apiKeyId
          )
        );

        const workspaceName = yield* found(
          yield* workspaces.nameOf(principal.workspaceId)
        );

        return {
          _tag: "apiKey",
          key,
          workspaceName,
        } satisfies CredentialDescription;
      });

      const ofPartnerKey = Effect.fn("CredentialCheck.ofPartnerKey")(
        function* ofPartnerKey(principal: PartnerKeyPrincipal) {
          const partner = yield* found(
            yield* partners.get(principal.partnerId)
          );

          const key = yield* found(
            Array.findFirst(
              yield* partners.keys(principal.partnerId),
              ({ id }) => id === principal.partnerKeyId
            )
          );

          return {
            _tag: "partnerKey",
            key,
            partner,
          } satisfies CredentialDescription;
        }
      );

      // Every kind of principal is a case: one added does not compile
      // until it is described.
      const describe = Match.typeTags<
        Principal,
        Effect.Effect<CredentialDescription, Failure>
      >()({
        ApiKeyPrincipal: ofApiKey,
        PartnerKeyPrincipal: ofPartnerKey,
        UserPrincipal: ofUser,
      });

      return CredentialCheck.of({ describe });
    })
  );
}
