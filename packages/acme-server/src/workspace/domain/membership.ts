import { Option, Result, Schema } from "effect";
import type { DateTime } from "effect";

import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BanSchema, isBanned } from "./ban.ts";
import { BannedUser } from "./banned-user.ts";
import { NotAMember } from "./not-a-member.ts";
import type { Principal } from "./principal.ts";
import { permissionsFor } from "./roles.ts";
import { WorkspaceMismatch } from "./workspace-mismatch.ts";

/** A user's place in one workspace, and whether staff banned the user. */
export const MembershipSchema = Schema.Struct({
  ban: Schema.Option(BanSchema),
  role: Schema.String,
});

export type Membership = typeof MembershipSchema.Type;

/**
 * What staff impersonating a member may not do in the member's name: publish,
 * connect accounts, change billing or handle API keys, which all outlive the
 * impersonation or reach outside Acme.
 */
export const withheldWhileImpersonating: ReadonlySet<Permission> = new Set([
  "apiKey:create",
  "apiKey:delete",
  "apiKey:read",
  "apiKey:update",
  "billing:manage",
  "channel:connect",
  "post:publish",
]);

export type AccessDenied = BannedUser | NotAMember | WorkspaceMismatch;

/**
 * The actor a principal is in a workspace. An API key acts only in the
 * workspace that owns it, with the permissions it was given. A user acts in a
 * workspace they are a member of, unless banned, with what their roles allow.
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

  if (Option.isNone(membership)) {
    return Result.fail(new NotAMember({ workspaceId }));
  }

  if (isBanned(membership.value.ban, now)) {
    return Result.fail(new BannedUser({ userId: principal.userId }));
  }

  const permissions = permissionsFor(membership.value.role);

  return Result.succeed(
    new Actor({
      permissions: Option.isSome(principal.impersonatedBy)
        ? permissions.filter(
            (permission) => !withheldWhileImpersonating.has(permission)
          )
        : permissions,
      subject: {
        _tag: "user",
        impersonatedBy: principal.impersonatedBy,
        userId: principal.userId,
      },
      workspaceId,
    })
  );
};
