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
    "/oauth2/public-client",
    "/organization/list-members",
    "/organization/set-active",
    "/subscription/list",
    "/subscription/success",
  ])("allows %s, which only reads", (path) => {
    expect(refusedWhileImpersonating(path)).toBeFalsy();
  });
});
