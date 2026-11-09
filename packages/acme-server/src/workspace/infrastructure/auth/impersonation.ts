import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
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

/**
 * Whether staff impersonating a member are refused a Better Auth route: every
 * workspace route but those that only read. Creating, inviting, accepting,
 * changing roles, removing and deleting all outlive the impersonation, as
 * what `withheldWhileImpersonating` lists does, and these routes never reach
 * Acme's API, which applies that list.
 */
export const refusedWhileImpersonating = (path: string): boolean =>
  path.startsWith("/organization/") && !allowedWhileImpersonating.has(path);

const isImpersonation = Schema.is(
  Schema.Struct({
    session: Schema.Struct({ impersonatedBy: Schema.NonEmptyString }),
  })
);

/** Better Auth's before hook: refuses those routes to an impersonation. */
export const refuseImpersonatedChanges = createAuthMiddleware(async (ctx) => {
  if (!refusedWhileImpersonating(ctx.path)) {
    return;
  }

  if (isImpersonation(await getSessionFromCtx(ctx))) {
    throw APIError.from("FORBIDDEN", {
      code: "IMPERSONATION_READ_ONLY",
      message: "Staff impersonating a member cannot change workspaces",
    });
  }
});
