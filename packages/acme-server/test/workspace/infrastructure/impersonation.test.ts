import { describe, expect, it } from "@effect/vitest";

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

  it.each([
    "/device",
    "/get-session",
    "/list-sessions",
    "/oauth2/public-client",
    "/organization/list-members",
    "/organization/set-active",
  ])("allows %s, which only reads", (path) => {
    expect(refusedWhileImpersonating(path)).toBeFalsy();
  });
});
