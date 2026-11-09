import { Option, Result, Schema } from "effect";
import type { DateTime } from "effect";

import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BanSchema, isBanned } from "./ban.ts";
import { BannedUser } from "./banned-user.ts";
import { NotAMember } from "./not-a-member.ts";
import { grantedPermissions } from "./oauth-grant.ts";
import type { Principal } from "./principal.ts";
import { permissionsFor } from "./roles.ts";
import type { UserPrincipal } from "./user-principal.ts";
import { WorkspaceMismatch } from "./workspace-mismatch.ts";

/** A user's place in one workspace, and whether staff banned the user. */
export const MembershipSchema = Schema.Struct({
  ban: Schema.Option(BanSchema),
  role: Schema.String,
});

export type Membership = typeof MembershipSchema.Type;

/**
 * What staff impersonating a member may not do in the member's name: publish,
 * connect accounts, change billing, handle API keys or delete the workspace,
 * which all outlive the impersonation or reach outside Peal.
 */
export const withheldWhileImpersonating: ReadonlySet<Permission> = new Set([
  "apiKey:create",
  "apiKey:delete",
  "apiKey:read",
  "apiKey:update",
  "billing:manage",
  "channel:connect",
  "organization:delete",
  "post:publish",
]);

export type AccessDenied = BannedUser | NotAMember | WorkspaceMismatch;

/**
 * What a user may do in a workspace where they hold `role`: what the role
 * allows, less what staff impersonating them may not do, and, through an
 * OAuth client, less what its grant leaves out.
 */
export const userPermissions = (
  principal: UserPrincipal,
  workspaceId: WorkspaceId,
  role: string
): readonly Permission[] => {
  const allowed = permissionsFor(role);

  const permissions = Option.isSome(principal.impersonatedBy)
    ? allowed.filter(
        (permission) => !withheldWhileImpersonating.has(permission)
      )
    : allowed;

  return Option.match(principal.oauth, {
    onNone: () => permissions,
    onSome: (grant) => grantedPermissions(grant, workspaceId, permissions),
  });
};

// The workspace a token is bound to, when it names another than `requested`.
const boundElsewhere = (
  principal: UserPrincipal,
  requested: WorkspaceId
): Option.Option<WorkspaceId> =>
  principal.oauth.pipe(
    Option.flatMap((grant) => grant.workspaceId),
    Option.filter((bound) => bound !== requested)
  );

/**
 * The actor a principal is in a workspace. An API key acts only in the
 * workspace that owns it, with the permissions it was given. A user acts in a
 * workspace they are a member of, unless banned, with what their roles allow;
 * through an OAuth client bound to a workspace, in that workspace only.
 */
export const actorFor = (
  principal: Principal,
  workspaceId: WorkspaceId,
  membership: Option.Option<Membership>,
  now: DateTime.Utc
): Result.Result<Actor, AccessDenied> => {
  if (principal._tag === "ApiKeyPrincipal") {
    return principal.workspaceId === workspaceId
      ? Result.succeed(
          new Actor({
            permissions: principal.permissions,
            subject: { _tag: "apiKey", apiKeyId: principal.apiKeyId },
            workspaceId,
          })
        )
      : Result.fail(
          new WorkspaceMismatch({
            owner: principal.workspaceId,
            requested: workspaceId,
          })
        );
  }

  const bound = boundElsewhere(principal, workspaceId);

  if (Option.isSome(bound)) {
    return Result.fail(
      new WorkspaceMismatch({ owner: bound.value, requested: workspaceId })
    );
  }

  if (Option.isNone(membership)) {
    return Result.fail(new NotAMember({ workspaceId }));
  }

  if (isBanned(membership.value.ban, now)) {
    return Result.fail(new BannedUser({ userId: principal.userId }));
  }

  return Result.succeed(
    new Actor({
      permissions: userPermissions(
        principal,
        workspaceId,
        membership.value.role
      ),
      subject: {
        _tag: "user",
        impersonatedBy: principal.impersonatedBy,
        userId: principal.userId,
      },
      workspaceId,
    })
  );
};
