import type { GenericEndpointContext } from "better-auth";
import { APIError, getSessionFromCtx } from "better-auth/api";
import { Option, Schema } from "effect";

// Better Auth's workspace routes that read, or change only the session that
// calls them.
const allowedWhileImpersonating: ReadonlySet<string> = new Set([
  "/organization/check-slug",
  "/organization/get-active-member",
  "/organization/get-active-member-role",
  "/organization/get-full-organization",
  "/organization/get-invitation",
  "/organization/get-organization",
  "/organization/get-role",
  "/organization/has-permission",
  "/organization/list",
  "/organization/list-invitations",
  "/organization/list-members",
  "/organization/list-roles",
  "/organization/list-team-members",
  "/organization/list-teams",
  "/organization/list-user-invitations",
  "/organization/list-user-teams",
  "/organization/set-active",
  "/organization/set-active-team",
]);

// The routes that let an OAuth client act as the member: authorizing it,
// agreeing to what it asks or widening what it was agreed to (the client is
// then given it without asking), and approving the command line's sign-in.
// Their tokens would outlive the impersonation.
const grantsAccess: ReadonlySet<string> = new Set([
  "/device/approve",
  "/oauth2/authorize",
  "/oauth2/consent",
  "/oauth2/continue",
  "/oauth2/update-consent",
]);

// The routes that change the account itself: its name, language, address
// and password, and its sessions. Staff read an account to help; changing
// it in the member's name would outlive the impersonation, or end the
// member's own sessions.
const changesAccount: ReadonlySet<string> = new Set([
  "/change-email",
  "/change-password",
  "/delete-user",
  "/revoke-other-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/update-user",
]);

// The Stripe plugin's routes that only read, or that Stripe sends the
// browser back to.
const billingReads: ReadonlySet<string> = new Set([
  "/subscription/list",
  "/subscription/success",
]);

/**
 * Whether a Better Auth route changes a workspace: every workspace route
 * but those that only read or change the calling session alone, and the
 * Stripe plugin's that subscribe, cancel or open the billing portal.
 */
export const changesWorkspace = (path: string): boolean =>
  (path.startsWith("/organization/") && !allowedWhileImpersonating.has(path)) ||
  (path.startsWith("/subscription/") && !billingReads.has(path));

/**
 * Whether staff impersonating a member are refused a Better Auth route: every
 * workspace route but those that only read, those that give an OAuth client
 * access, those that change the account, and those that subscribe, cancel
 * or open the billing portal. Creating, inviting, accepting, changing roles,
 * removing, deleting, granting access, changing the account and paying all
 * outlive the impersonation, as what `withheldWhileImpersonating` lists
 * does, and these routes never reach Peal's API, which applies that list.
 */
export const refusedWhileImpersonating = (path: string): boolean =>
  grantsAccess.has(path) || changesAccount.has(path) || changesWorkspace(path);

const isImpersonation = Schema.is(
  Schema.Struct({
    session: Schema.Struct({ impersonatedBy: Schema.NonEmptyString }),
  })
);

// What the guard reads of a session staff act as someone in.
const decodeImpersonation = Schema.decodeUnknownOption(
  Schema.Struct({
    session: Schema.Struct({
      activeOrganizationId: Schema.optional(Schema.NullOr(Schema.String)),
      impersonatedBy: Schema.NonEmptyString,
    }),
    user: Schema.Struct({ id: Schema.NonEmptyString }),
  })
);

// The routes that end the session staff act as someone in.
const stopsImpersonating: ReadonlySet<string> = new Set([
  "/admin/stop-impersonating",
  "/sign-out",
]);

// The routes that are not GET but only read.
const readsOnly: ReadonlySet<string> = new Set([
  "/organization/check-slug",
  "/organization/has-permission",
]);

/** A request to Better Auth's routes in a session staff act as someone in. */
export interface ImpersonatedAuthRequest {
  /** Whether it reads, changes something, or stops the impersonation. */
  readonly kind: "change" | "read" | "stop";
  /** The ids its body names (`organizationId`, `memberId`…), never more. */
  readonly objectIds: Readonly<Record<string, string | undefined>>;
  /** `auth:` and the route's path. */
  readonly operation: string;
  readonly staffId: string;
  readonly userId: string;
  /** The session's active workspace, or the one the body names. */
  readonly workspaceId: string | null;
}

/**
 * Checks a request in a session staff act as someone in, and records it:
 * false when it must be refused, as its staff member is no longer staff.
 */
export type ImpersonationCheck = (
  request: ImpersonatedAuthRequest
) => Promise<boolean>;

const kindOf = (
  method: string,
  path: string
): ImpersonatedAuthRequest["kind"] => {
  if (method === "GET" || method === "HEAD" || readsOnly.has(path)) {
    return "read";
  }

  return stopsImpersonating.has(path) ? "stop" : "change";
};

// The ids a body of the sign-in service's routes may name. The audit log
// keeps only values shaped like ids.
const bodyIdFields = [
  "invitationId",
  "memberId",
  "organizationId",
  "referenceId",
  "subscriptionId",
  "teamId",
  "userId",
] as const;

const bodyIdDecoders = bodyIdFields.map(
  (name) =>
    [
      name,
      Schema.decodeUnknownOption(Schema.Struct({ [name]: Schema.String })),
    ] as const
);

/** The ids a request's body names, by name: those fields' values alone. */
export const bodyIdsOf = ({
  body,
}: Pick<GenericEndpointContext, "body">): Readonly<
  Record<string, string | undefined>
> =>
  Object.fromEntries(
    bodyIdDecoders.flatMap(([name, decode]) =>
      Option.toArray(decode(body)).map((fields) => [name, fields[name]])
    )
  );

/**
 * Part of Better Auth's before hook: a request to its routes, sent by a
 * browser, in a session staff act as someone in, goes through `check` before
 * the route runs, which refuses it once the staff member is no longer
 * staff, and records each change it asks for. Better Auth's calls from
 * Peal's own API carry no request: the API's Authentication checked and
 * recorded them.
 */
export const guardImpersonatedRequest = async (
  ctx: GenericEndpointContext,
  check: ImpersonationCheck
): Promise<void> => {
  const { request } = ctx;

  if (request === undefined || !request.headers.has("cookie")) {
    return;
  }

  // Refreshing is left to the route, which reads the session again or
  // reuses this one: get-session would otherwise refresh it twice.
  const found = decodeImpersonation(
    await getSessionFromCtx(ctx, { disableRefresh: true })
  );

  if (Option.isNone(found)) {
    return;
  }

  const { session, user } = found.value;

  const objectIds = bodyIdsOf(ctx);

  const admitted = await check({
    kind: kindOf(request.method, ctx.path),
    objectIds,
    operation: `auth:${ctx.path}`,
    staffId: session.impersonatedBy,
    userId: user.id,
    workspaceId:
      objectIds["organizationId"] ?? session.activeOrganizationId ?? null,
  });

  if (!admitted) {
    throw APIError.from("UNAUTHORIZED", {
      code: "IMPERSONATION_ENDED",
      message: "The staff member acting as this account is no longer staff",
    });
  }
};

/** Part of Better Auth's before hook: refuses those routes to an impersonation. */
export const refuseImpersonatedChanges = async (
  ctx: GenericEndpointContext
): Promise<void> => {
  if (!refusedWhileImpersonating(ctx.path)) {
    return;
  }

  if (isImpersonation(await getSessionFromCtx(ctx))) {
    throw APIError.from("FORBIDDEN", {
      code: "IMPERSONATION_READ_ONLY",
      message:
        "Staff impersonating a member cannot change workspaces or the account, or give access to them",
    });
  }
};
