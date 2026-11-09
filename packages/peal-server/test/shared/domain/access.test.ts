import { describe, expect, it } from "@effect/vitest";

import {
  Actor,
  can,
  grantOf,
  PermissionSchema,
  permissionsOf,
  statements,
} from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

describe("the permission vocabulary", () => {
  it("lists every action of every resource, and nothing else", () => {
    const fromStatements = Object.entries(statements).flatMap(
      ([resource, actions]) => actions.map((action) => `${resource}:${action}`)
    );

    expect(fromStatements.toSorted()).toStrictEqual(
      [...PermissionSchema.literals].toSorted()
    );
  });
});

describe(permissionsOf, () => {
  it("flattens a grant into permissions, in vocabulary order", () => {
    expect(
      permissionsOf({ analytics: ["read"], post: ["publish", "read"] })
    ).toStrictEqual(["analytics:read", "post:read", "post:publish"]);
  });

  it("drops actions and resources the vocabulary does not know", () => {
    expect(
      permissionsOf({ post: ["read", "teleport"], team: ["create"] })
    ).toStrictEqual(["post:read"]);
  });

  it("turns back into the grant it came from", () => {
    const grant = { media: ["read", "upload"], post: ["read"] };

    expect(grantOf(permissionsOf(grant))).toStrictEqual(grant);
  });
});

describe(can, () => {
  const actor = new Actor({
    permissions: ["post:read"],
    subject: { _tag: "apiKey", apiKeyId: "key-1" },
    workspaceId,
  });

  it("allows what the actor was granted", () => {
    expect(can(actor, "post:read")).toBeTruthy();
  });

  it("refuses anything else", () => {
    expect(can(actor, "post:publish")).toBeFalsy();
  });
});
