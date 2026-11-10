import { assert, describe, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { actorFor, userPermissions } from "#workspace/domain/membership.ts";
import type { Membership } from "#workspace/domain/membership.ts";
import {
  grantedPermissions,
  publishingPermissions,
} from "#workspace/domain/oauth-grant.ts";
import type { OAuthGrant } from "#workspace/domain/oauth-grant.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const now = DateTime.makeUnsafe("2026-11-09T12:00:00Z");

const studio = WorkspaceIdSchema.make("5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60");

const shop = WorkspaceIdSchema.make("0d3f6b1a-2c4e-4f5a-8b6c-7d8e9f0a1b2c");

const userId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

const owner: Membership = { ban: Option.none(), role: "owner" };

const grant = (
  scopes: readonly string[],
  workspaceId: Option.Option<typeof studio> = Option.none()
): OAuthGrant => ({ clientId: "synthetic-client", scopes, workspaceId });

const through = (oauth: OAuthGrant) =>
  new UserPrincipal({
    impersonatedBy: Option.none(),
    oauth: Option.some(oauth),
    userId,
  });

const ownerPermissions = permissionsFor("owner");

describe(grantedPermissions, () => {
  it("leaves everything to workspace:write with workspace:publish", () => {
    assert.deepStrictEqual(
      grantedPermissions(
        grant(["workspace:read", "workspace:write", "workspace:publish"]),
        studio,
        ownerPermissions
      ),
      ownerPermissions
    );
  });

  it("leaves workspace:write everything but what puts posts out", () => {
    const permissions = grantedPermissions(
      grant(["workspace:read", "workspace:write"]),
      studio,
      ownerPermissions
    );

    assert.deepStrictEqual(
      permissions,
      ownerPermissions.filter(
        (permission) => !publishingPermissions.has(permission)
      )
    );
    assert.include(permissions, "post:create");
    assert.include(permissions, "media:upload");
    assert.notInclude(permissions, "post:schedule");
    assert.notInclude(permissions, "post:approve");
    assert.notInclude(permissions, "post:publish");
    // A reply to a comment is public too.
    assert.notInclude(permissions, "engagement:reply");
    assert.include(permissions, "engagement:read");
  });

  it("leaves workspace:publish reading and what puts posts out", () => {
    const permissions = grantedPermissions(
      grant(["workspace:publish"]),
      studio,
      ownerPermissions
    );

    assert.include(permissions, "post:schedule");
    assert.include(permissions, "post:publish");
    assert.include(permissions, "post:approve");
    assert.include(permissions, "engagement:reply");
    assert.include(permissions, "channel:read");
    assert.notInclude(permissions, "post:create");
    assert.notInclude(permissions, "media:upload");
  });

  it("gives workspace:publish no more than the role holds", () => {
    const permissions = grantedPermissions(
      grant(["workspace:write", "workspace:publish"]),
      studio,
      permissionsFor("contributor")
    );

    assert.deepStrictEqual(permissions, permissionsFor("contributor"));
    assert.notInclude(permissions, "post:schedule");
  });

  it("leaves only reading to workspace:read", () => {
    const permissions = grantedPermissions(
      grant(["openid", "workspace:read"]),
      studio,
      ownerPermissions
    );

    assert.include(permissions, "channel:read");
    assert.include(permissions, "post:read");
    assert.isTrue(
      permissions.every((permission) => permission.endsWith(":read"))
    );
  });

  it("leaves nothing without a workspace scope", () => {
    assert.deepStrictEqual(
      grantedPermissions(
        grant(["openid", "offline_access"]),
        studio,
        ownerPermissions
      ),
      []
    );
  });

  it("leaves nothing outside the workspace a token is bound to", () => {
    const bound = grant(
      ["workspace:write", "workspace:publish"],
      Option.some(studio)
    );

    assert.deepStrictEqual(
      grantedPermissions(bound, shop, ownerPermissions),
      []
    );
    assert.deepStrictEqual(
      grantedPermissions(bound, studio, ownerPermissions),
      ownerPermissions
    );
  });
});

describe("an OAuth client acting for a user", () => {
  it("acts in the workspace its token is bound to, with what its scopes leave", () => {
    const actor = Result.getOrThrow(
      actorFor(
        through(grant(["workspace:read"], Option.some(studio))),
        studio,
        Option.some(owner),
        now
      )
    );

    assert.include(actor.permissions, "channel:read");
    assert.notInclude(actor.permissions, "post:publish");
  });

  it("may not act in another workspace, even one its user belongs to", () => {
    const result = actorFor(
      through(grant(["workspace:write"], Option.some(studio))),
      shop,
      Option.some(owner),
      now
    );

    assert.isTrue(Result.isFailure(result));

    if (Result.isFailure(result)) {
      assert.strictEqual(result.failure._tag, "WorkspaceMismatch");
    }
  });

  it("acts wherever its user belongs when its token is not bound", () => {
    const principal = through(grant(["workspace:write", "workspace:publish"]));

    for (const workspaceId of [studio, shop]) {
      const actor = Result.getOrThrow(
        actorFor(principal, workspaceId, Option.some(owner), now)
      );

      assert.deepStrictEqual(actor.permissions, ownerPermissions);
    }
  });

  it("shows no permission in the workspaces its token is not bound to", () => {
    const principal = through(
      grant(["workspace:write", "workspace:publish"], Option.some(studio))
    );

    assert.deepStrictEqual(userPermissions(principal, shop, "owner"), []);
    assert.deepStrictEqual(
      userPermissions(principal, studio, "owner"),
      ownerPermissions
    );
  });
});
