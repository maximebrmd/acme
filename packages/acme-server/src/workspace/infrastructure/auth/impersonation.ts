import type { GenericEndpointContext } from "better-auth";
import { APIError, getSessionFromCtx } from "better-auth/api";
import { Schema } from "effect";

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
 * Whether staff impersonating a member are refused a Better Auth route: every
 * workspace route but those that only read, those that give an OAuth client
 * access, those that change the account, and those that subscribe, cancel
 * or open the billing portal. Creating, inviting, accepting, changing roles,
 * removing, deleting, granting access, changing the account and paying all
 * outlive the impersonation, as what `withheldWhileImpersonating` lists
 * does, and these routes never reach Acme's API, which applies that list.
 */
export const refusedWhileImpersonating = (path: string): boolean =>
  grantsAccess.has(path) ||
  changesAccount.has(path) ||
  (path.startsWith("/organization/") && !allowedWhileImpersonating.has(path)) ||
  (path.startsWith("/subscription/") && !billingReads.has(path));

const isImpersonation = Schema.is(
  Schema.Struct({
    session: Schema.Struct({ impersonatedBy: Schema.NonEmptyString }),
  })
);

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
