import { describe, expect, it } from "@effect/vitest";

import { PermissionSchema } from "#shared/domain/access.ts";
import { permissionsFor, rolesOf } from "#workspace/domain/roles.ts";

describe(permissionsFor, () => {
  it("gives the owner every permission", () => {
    expect(permissionsFor("owner")).toStrictEqual(PermissionSchema.literals);
  });

  it("gives an admin everything but deleting the workspace", () => {
    expect(permissionsFor("admin")).toStrictEqual(
      PermissionSchema.literals.filter(
        (permission) => permission !== "organization:delete"
      )
    );
  });

  it("lets an editor publish but not manage the workspace", () => {
    const editor = permissionsFor("editor");

    expect(editor).toContain("post:publish");
    expect(editor).toContain("post:approve");
    expect(editor).not.toContain("member:create");
    expect(editor).not.toContain("apiKey:create");
    expect(editor).not.toContain("channel:connect");
  });

  it("lets a contributor draft without scheduling or publishing", () => {
    expect(permissionsFor("contributor")).toStrictEqual([
      "analytics:read",
      "assistant:use",
      "channel:read",
      "media:read",
      "media:upload",
      "post:read",
      "post:create",
      "post:update",
    ]);
  });

  it("lets those who write posts ask the writing assistant", () => {
    expect(permissionsFor("editor")).toContain("assistant:use");
    expect(permissionsFor("contributor")).toContain("assistant:use");
    expect(permissionsFor("viewer")).not.toContain("assistant:use");
  });

  it("lets a viewer read only", () => {
    expect(permissionsFor("viewer")).toStrictEqual([
      "analytics:read",
      "channel:read",
      "media:read",
      "post:read",
    ]);
  });

  it("merges the roles of a comma-separated role", () => {
    expect(permissionsFor("viewer, contributor")).toStrictEqual(
      permissionsFor("contributor")
    );
  });

  it("grants nothing for a role Peal does not know", () => {
    expect(permissionsFor("member")).toStrictEqual([]);
  });
});

describe(rolesOf, () => {
  it("keeps known roles, most trusted first", () => {
    expect(rolesOf("viewer,owner,ghost")).toStrictEqual(["owner", "viewer"]);
  });
});
