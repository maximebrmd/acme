import { Match, Option, Result, Schema } from "effect";
import type { DateTime } from "effect";

import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BanSchema, isBanned } from "./ban.ts";
import { BannedUser } from "./banned-user.ts";
import { NotAMember } from "./not-a-member.ts";
import { grantedPermissions } from "./oauth-grant.ts";
import type { PartnerId } from "./partner-id.ts";
import type { Principal } from "./principal.ts";
import { permissionsFor } from "./roles.ts";
import { TwoStepRequired } from "./two-step-required.ts";
import type { UserPrincipal } from "./user-principal.ts";
import { WorkspaceMismatch } from "./workspace-mismatch.ts";

/**
 * Whether the user's account has two-step verification on, and whether the
 * workspace requires it of its members.
 */
export const TwoStepStandingSchema = Schema.Struct({
  enabled: Schema.Boolean,
  required: Schema.Boolean,
});

export type TwoStepStanding = typeof TwoStepStandingSchema.Type;

/**
 * A user's place in one workspace, whether staff banned the user, and their
 * two-step verification against the workspace's requirement.
 */
export const MembershipSchema = Schema.Struct({
  ban: Schema.Option(BanSchema),
  role: Schema.String,
  twoStep: TwoStepStandingSchema,
});

export type Membership = typeof MembershipSchema.Type;

/**
 * What staff impersonating a member may not do in the member's name:
 * schedule, approve or publish, connect accounts, change billing, handle
 * API keys, manage webhooks, a partner account or delete the workspace,
 * set the image provider the workspace's prompts and key go to,
 * connect an ad account, spend on ads or decide what ads may spend,
 * or require two-step verification of the workspace's members, which all
 * outlive the impersonation or reach outside Peal; nor answer
 * the comments under the workspace's posts, nor read them, nor read or
 * answer its direct messages: other people wrote those, messages are
 * private correspondence, and staff need none of them to help a member. They may
 * write and edit drafts, each change recorded in the audit log
 * under their own name (the ImpersonationGuard), while the drafts carry the
 * member's.
 */
export const withheldWhileImpersonating: ReadonlySet<Permission> = new Set([
  "ads:authorize",
  "ads:manage",
  "ads:spend",
  "apiKey:create",
  "apiKey:delete",
  "apiKey:read",
  "apiKey:update",
  "assistant:configure",
  "billing:manage",
  "channel:connect",
  "engagement:message",
  "engagement:read",
  "engagement:reply",
  "organization:delete",
  "organization:secure",
  "partner:manage",
  "post:approve",
  "post:publish",
  "post:schedule",
  "webhook:manage",
]);

export type AccessDenied =
  | BannedUser
  | NotAMember
  | TwoStepRequired
  | WorkspaceMismatch;

/**
 * Answers a refusal of `actorFor` case by case, every case named: a reason
 * added to `AccessDenied` does not compile until each caller decides what
 * it means. `TwoStepRequired` is not a removal: what waits for the person
 * waits, as it works again once they turn two-step verification on.
 */
export const answerAccessDenied = Match.typeTags<AccessDenied>();

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
 * workspace that owns it, with the permissions it was given. A partner key
 * acts only in the workspaces its partner owns (`ownedBy`), with the
 * permissions it was given, as a key of that workspace would: any other
 * workspace, its partner's home workspace included, reads as one that does
 * not exist. Keys belong to workspaces, not people: two-step verification
 * does not concern them. A user acts in a workspace they are a member of,
 * unless banned, or unless the workspace requires two-step verification
 * and their account does not have it on, with what their roles allow;
 * through an OAuth client bound to a workspace, in that workspace only.
 * Staff acting as the user are let in or not by the user's account.
 */
export const actorFor = (
  principal: Principal,
  workspaceId: WorkspaceId,
  membership: Option.Option<Membership>,
  now: DateTime.Utc,
  ownedBy: Option.Option<PartnerId> = Option.none()
): Result.Result<Actor, AccessDenied> => {
  if (principal._tag === "PartnerKeyPrincipal") {
    return Option.contains(ownedBy, principal.partnerId)
      ? Result.succeed(
          new Actor({
            permissions: principal.permissions,
            subject: { _tag: "apiKey", apiKeyId: principal.partnerKeyId },
            workspaceId,
          })
        )
      : Result.fail(new NotAMember({ workspaceId }));
  }

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

  const { twoStep } = membership.value;

  if (twoStep.required && !twoStep.enabled) {
    return Result.fail(new TwoStepRequired({ workspaceId }));
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
        ...Option.match(principal.oauth, {
          onNone: () => ({}),
          onSome: ({ clientId }) => ({ clientId }),
        }),
        impersonatedBy: principal.impersonatedBy,
        userId: principal.userId,
      },
      workspaceId,
    })
  );
};
