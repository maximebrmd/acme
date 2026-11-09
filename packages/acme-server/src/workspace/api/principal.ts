import type { Member, Principal as ContractPrincipal } from "acme-contract";
import { Option } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import type { Principal } from "#workspace/domain/principal.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

// The contract describes principals for every client; the domain brands
// their ids. These convert between the two at the HTTP boundary.

export const toContractPrincipal = (principal: Principal): ContractPrincipal =>
  principal._tag === "UserPrincipal"
    ? {
        _tag: "user",
        impersonatedBy: Option.getOrNull(principal.impersonatedBy),
        userId: principal.userId,
      }
    : {
        _tag: "apiKey",
        apiKeyId: principal.apiKeyId,
        permissions: principal.permissions,
        workspaceId: principal.workspaceId,
      };

export const userPrincipalOf = (
  principal: Extract<ContractPrincipal, { readonly _tag: "user" }>
): UserPrincipal =>
  new UserPrincipal({
    impersonatedBy: Option.fromNullishOr(principal.impersonatedBy).pipe(
      Option.map((id) => UserIdSchema.make(id))
    ),
    userId: UserIdSchema.make(principal.userId),
  });

export const principalOf = (principal: ContractPrincipal): Principal =>
  principal._tag === "user"
    ? userPrincipalOf(principal)
    : new ApiKeyPrincipal({
        apiKeyId: principal.apiKeyId,
        permissions: principal.permissions,
        workspaceId: WorkspaceIdSchema.make(principal.workspaceId),
      });

export const memberOf = (actor: Actor, principal: Principal): Member => ({
  permissions: actor.permissions,
  principal: toContractPrincipal(principal),
  workspaceId: actor.workspaceId,
});
