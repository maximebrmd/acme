import { describe, expect, it } from "@effect/vitest";

import { authWithoutDatabase, servedRoutes } from "#test/workspace/support.ts";
import { refusedWhileImpersonating } from "#workspace/infrastructure/auth/impersonation.ts";

describe(refusedWhileImpersonating, () => {
  // Tokens an OAuth client gets outlive the impersonation.
  it.each([
    "/device/approve",
    "/oauth2/authorize",
    "/oauth2/consent",
    "/oauth2/continue",
    "/oauth2/update-consent",
  ])("refuses %s, which gives a client access", (path) => {
    expect(refusedWhileImpersonating(path)).toBeTruthy();
  });

  it.each([
    "/organization/create",
    "/organization/delete",
    "/organization/invite-member",
  ])("refuses %s, which changes a workspace", (path) => {
    expect(refusedWhileImpersonating(path)).toBeTruthy();
  });

  it.each([
    "/change-password",
    "/revoke-other-sessions",
    "/revoke-session",
    "/update-user",
  ])("refuses %s, which changes the account", (path) => {
    expect(refusedWhileImpersonating(path)).toBeTruthy();
  });

  // Two-step verification is the member's: turning it on or off, its key
  // and recovery codes, and verifying a code, which spends a recovery code.
  it("refuses every route of two-step verification the server serves", () => {
    const routes = servedRoutes(authWithoutDatabase()).filter((path) =>
      path.startsWith("/two-factor/")
    );

    expect(routes).toEqual(
      expect.arrayContaining([
        "/two-factor/disable",
        "/two-factor/enable",
        "/two-factor/generate-backup-codes",
        "/two-factor/get-totp-uri",
        "/two-factor/verify-backup-code",
        "/two-factor/verify-totp",
      ])
    );
    expect(routes.filter((path) => !refusedWhileImpersonating(path))).toEqual(
      []
    );
  });

  it.each([
    "/subscription/billing-portal",
    "/subscription/cancel",
    "/subscription/restore",
    "/subscription/upgrade",
  ])("refuses %s, which pays or stops paying", (path) => {
    expect(refusedWhileImpersonating(path)).toBeTruthy();
  });

  it.each([
    "/device",
    "/get-session",
    "/list-sessions",
    "/oauth2/public-client",
    "/organization/list-members",
    "/organization/set-active",
    "/subscription/list",
    "/subscription/success",
  ])("allows %s, which only reads", (path) => {
    expect(refusedWhileImpersonating(path)).toBeFalsy();
  });
});
