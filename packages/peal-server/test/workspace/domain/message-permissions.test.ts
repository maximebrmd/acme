import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import {
  userPermissions,
  withheldWhileImpersonating,
} from "#workspace/domain/membership.ts";
import { grantedPermissions } from "#workspace/domain/oauth-grant.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

// Direct messages are private correspondence: reading them is a
// permission of its own, which owners, admins and editors hold, never one
// a read-only application or role carries.

const studio = WorkspaceIdSchema.make("5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60");

const userId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

const grant = (scopes: readonly string[]) => ({
  clientId: "synthetic-client",
  scopes,
  workspaceId: Option.none(),
});

describe("reading direct messages", () => {
  it("is held by owners, admins and editors, never by contributors or viewers", () => {
    expect(
      ["owner", "admin", "editor"].map((role) =>
        permissionsFor(role).includes("engagement:readMessages")
      )
    ).toStrictEqual([true, true, true]);
    expect(
      ["contributor", "viewer"].map((role) =>
        permissionsFor(role).includes("engagement:readMessages")
      )
    ).toStrictEqual([false, false]);
  });

  it("is never carried by workspace:read, and needs workspace:publish", () => {
    const owner = permissionsFor("owner");

    expect(
      grantedPermissions(grant(["workspace:read"]), studio, owner)
    ).not.toContain("engagement:readMessages");
    expect(
      grantedPermissions(
        grant(["workspace:read", "workspace:write", "workspace:publish"]),
        studio,
        owner
      )
    ).toContain("engagement:readMessages");
  });

  it("is withheld from staff acting as a member", () => {
    expect(
      withheldWhileImpersonating.has("engagement:readMessages")
    ).toBeTruthy();
    expect(
      userPermissions(
        new UserPrincipal({
          impersonatedBy: Option.some(userId),
          oauth: Option.none(),
          userId,
        }),
        studio,
        "owner"
      )
    ).not.toContain("engagement:readMessages");
  });
});
