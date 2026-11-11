import type { GenericEndpointContext } from "better-auth";
import { APIError, getSessionFromCtx } from "better-auth/api";
import { Option, Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What Better Auth's hooks ask the rest of the server about two-step
 * verification, from the database on every request: the account's flag,
 * never a session's cached copy of it, and each workspace's requirement.
 */
export interface TwoStepPolicy {
  /**
   * Whether one of these workspaces requires two-step verification while
   * the user's account does not have it on. A failure refuses the request.
   */
  readonly lockedOut: (
    userId: string,
    workspaceIds: readonly WorkspaceId[]
  ) => Promise<boolean>;
  /**
   * The names of the workspaces the user belongs to that require it. A
   * failure refuses the request.
   */
  readonly requiredBy: (userId: string) => Promise<readonly string[]>;
}

// Better Auth's routes of a workspace that a member the workspace refuses
// for want of two-step verification still reaches: those that list their
// workspaces and invitations or switch between them (the picker), answer
// an invitation, leave, or make a workspace of their own.
const exempt: ReadonlySet<string> = new Set([
  "/organization/accept-invitation",
  "/organization/check-slug",
  "/organization/create",
  "/organization/get-invitation",
  "/organization/leave",
  "/organization/list",
  "/organization/list-user-invitations",
  "/organization/reject-invitation",
  "/organization/set-active",
]);

// The others, which read or change one workspace: its members, roles,
// invitations, settings and subscriptions. Listed so a test fails on a
// route an upgrade adds until it is placed in one set or the other; a
// route of these prefixes in neither is guarded anyway.
const guarded: ReadonlySet<string> = new Set([
  "/organization/cancel-invitation",
  "/organization/delete",
  "/organization/get-active-member",
  "/organization/get-active-member-role",
  "/organization/get-full-organization",
  "/organization/get-organization",
  "/organization/has-permission",
  "/organization/invite-member",
  "/organization/list-invitations",
  "/organization/list-members",
  "/organization/remove-member",
  "/organization/update",
  "/organization/update-member-role",
  "/subscription/billing-portal",
  "/subscription/cancel",
  "/subscription/list",
  "/subscription/restore",
  "/subscription/success",
  "/subscription/upgrade",
]);

/** How the guard treats a route of Better Auth's workspace prefixes. */
export const workspaceRouteKind = (
  path: string
): "exempt" | "guarded" | "unlisted" => {
  if (exempt.has(path)) {
    return "exempt";
  }

  return guarded.has(path) ? "guarded" : "unlisted";
};

const isWorkspaceRoute = (path: string): boolean =>
  path.startsWith("/organization/") || path.startsWith("/subscription/");

const decodeSession = Schema.decodeUnknownOption(
  Schema.Struct({
    session: Schema.Struct({
      activeOrganizationId: Schema.optional(Schema.NullOr(Schema.String)),
    }),
    user: Schema.Struct({ id: Schema.NonEmptyString }),
  })
);

// What a request may name a workspace by: its id (the Stripe plugin's
// `referenceId` for a subscription), its slug, or an invitation of it.
const NamingSchema = Schema.Struct({
  invitationId: Schema.optionalKey(Schema.NullOr(Schema.String)),
  organizationId: Schema.optionalKey(Schema.NullOr(Schema.String)),
  organizationSlug: Schema.optionalKey(Schema.NullOr(Schema.String)),
  referenceId: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

type Naming = typeof NamingSchema.Type;

const decodeNaming = Schema.decodeUnknownOption(NamingSchema);

// The same fields, whatever they hold: one that is not text is refused.
const decodeNamed = Schema.decodeUnknownOption(
  Schema.Struct({
    invitationId: Schema.optionalKey(Schema.Unknown),
    organizationId: Schema.optionalKey(Schema.Unknown),
    organizationSlug: Schema.optionalKey(Schema.Unknown),
    referenceId: Schema.optionalKey(Schema.Unknown),
  })
);

const decodeId = Schema.decodeUnknownOption(WorkspaceIdSchema);

const decodeOwner = Schema.decodeUnknownOption(
  Schema.Struct({ organizationId: WorkspaceIdSchema })
);

const decodeFound = Schema.decodeUnknownOption(
  Schema.Struct({ id: WorkspaceIdSchema })
);

const invalidId = () =>
  APIError.from("BAD_REQUEST", {
    code: "INVALID_ID",
    message:
      "organizationId, referenceId and invitationId are lower-case UUIDs, as Peal issues them",
  });

// An id as Better Auth issues it, or the request is refused: a workspace
// the guard cannot read is never let through.
const idOf = (value: string): WorkspaceId =>
  Option.getOrThrowWith(decodeId(value), invalidId);

const given = (value: string | null | undefined): readonly string[] =>
  value === undefined || value === null || value === "" ? [] : [value];

// The workspaces one part names: by id, by slug, or by an invitation of it.
const workspacesNamedBy = async (
  ctx: GenericEndpointContext,
  { invitationId, organizationId, organizationSlug, referenceId }: Naming
): Promise<readonly WorkspaceId[]> => {
  const { adapter } = ctx.context;

  const bySlug = await Promise.all(
    given(organizationSlug).map(async (slug) => {
      const row: unknown = await adapter.findOne({
        model: "organization",
        select: ["id"],
        where: [{ field: "slug", value: slug }],
      });

      return Option.toArray(decodeFound(row)).map(({ id }) => id);
    })
  );

  const byInvitation = await Promise.all(
    given(invitationId).map(async (id) => {
      const row: unknown = await adapter.findOne({
        model: "invitation",
        select: ["organizationId"],
        where: [{ field: "id", value: idOf(id) }],
      });

      return Option.toArray(decodeOwner(row)).map(
        ({ organizationId: owner }) => owner
      );
    })
  );

  return [
    ...[...given(organizationId), ...given(referenceId)].map(idOf),
    ...bySlug.flat(),
    ...byInvitation.flat(),
  ];
};

/** The workspaces a request names, in its body and its query. */
const namedWorkspaces = async (
  ctx: GenericEndpointContext
): Promise<readonly WorkspaceId[]> => {
  const parts: readonly unknown[] = [ctx.body ?? {}, ctx.query ?? {}];

  const namings = parts.flatMap((part) =>
    Option.match(decodeNaming(part), {
      // A name that is not text cannot be read: refused.
      onNone: () => {
        if (Option.isSome(decodeNamed(part))) {
          throw invalidId();
        }

        return [];
      },
      onSome: (naming) => [naming],
    })
  );

  const named = await Promise.all(
    namings.map(async (naming) => await workspacesNamedBy(ctx, naming))
  );

  return named.flat();
};

/**
 * Part of Better Auth's before hook: its routes that read or change one
 * workspace never pass WorkspaceAccess, so a member whose account lacks the
 * two-step verification the workspace requires is refused them here, as
 * the API refuses them. The workspace is the one the request names, or the
 * session's active one. The routes a refused member needs (their
 * workspaces, the picker, invitations, leaving, making one of their own)
 * stay open. Better Auth's calls from Peal's own API carry no request:
 * WorkspaceAccess checked them.
 */
export const refuseLockedOutMembers = async (
  ctx: GenericEndpointContext,
  policy: TwoStepPolicy
): Promise<void> => {
  if (
    ctx.request === undefined ||
    !isWorkspaceRoute(ctx.path) ||
    workspaceRouteKind(ctx.path) === "exempt"
  ) {
    return;
  }

  // The session as the route reads it: Better Auth keeps one for the
  // request, so the active workspace checked here is the one the route
  // acts on.
  const found = decodeSession(
    await getSessionFromCtx(ctx, { disableRefresh: true })
  );

  // Without a session the route answers itself.
  if (Option.isNone(found)) {
    return;
  }

  const { session, user } = found.value;
  const named = await namedWorkspaces(ctx);

  const workspaceIds =
    named.length > 0
      ? named
      : Option.toArray(
          Option.fromNullishOr(session.activeOrganizationId).pipe(
            Option.map(idOf)
          )
        );

  if (
    workspaceIds.length > 0 &&
    (await policy.lockedOut(user.id, workspaceIds))
  ) {
    throw APIError.from("FORBIDDEN", {
      code: "TWO_STEP_REQUIRED",
      message:
        "This workspace requires two-step verification. Turn it on in your Peal account settings, then try again.",
    });
  }
};

const enableRoute = "/two-factor/enable";

const disableRoute = "/two-factor/disable";

/**
 * Part of Better Auth's before hook, on two-step verification's own
 * routes. Turning it on waits for a confirmed email address: where
 * accounts work before theirs is confirmed, the confirmation link signs
 * the account in, past any second step. Turning it off is refused while a
 * workspace the user belongs to requires it, so nobody finds themselves
 * locked out afterwards: they leave it first.
 */
export const guardTwoStepChanges = async (
  ctx: GenericEndpointContext,
  policy: TwoStepPolicy
): Promise<void> => {
  if (ctx.path !== enableRoute && ctx.path !== disableRoute) {
    return;
  }

  const found = decodeSession(
    await getSessionFromCtx(ctx, { disableRefresh: true })
  );

  // Without a session the route answers itself.
  if (Option.isNone(found)) {
    return;
  }

  const { user } = found.value;

  if (ctx.path === enableRoute) {
    // Read again: a session's copy of the user may be minutes old.
    const stored = await ctx.context.internalAdapter.findUserById(user.id);

    if (stored?.emailVerified !== true) {
      throw APIError.from("BAD_REQUEST", {
        code: "EMAIL_NOT_VERIFIED_FOR_TWO_STEP",
        message:
          "Confirm your email address before turning on two-step verification",
      });
    }

    return;
  }

  const requiring = await policy.requiredBy(user.id);

  if (requiring.length > 0) {
    throw APIError.from("FORBIDDEN", {
      code: "TWO_STEP_REQUIRED_BY_WORKSPACE",
      message: `Two-step verification stays on while you are a member of a workspace that requires it: ${requiring.join(", ")}`,
    });
  }
};
