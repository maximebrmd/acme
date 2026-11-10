import { assert, describe, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { actorFor, userPermissions } from "#workspace/domain/membership.ts";
import type { Membership } from "#workspace/domain/membership.ts";
import {
  adsPermissions,
  grantedPermissions,
  personOnlyPermissions,
  publishingPermissions,
  scopesFor,
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

// What an owner holds less what reaches an ad network, which takes the ads
// scope, and less what no application does.
const withoutAds = ownerPermissions.filter(
  (permission) =>
    !adsPermissions.has(permission) && !personOnlyPermissions.has(permission)
);

describe(grantedPermissions, () => {
  it("leaves everything but ads to workspace:write with workspace:publish", () => {
    assert.deepStrictEqual(
      grantedPermissions(
        grant(["workspace:read", "workspace:write", "workspace:publish"]),
        studio,
        ownerPermissions
      ),
      withoutAds
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
      withoutAds.filter((permission) => !publishingPermissions.has(permission))
    );
    assert.include(permissions, "post:create");
    assert.include(permissions, "media:upload");
    assert.notInclude(permissions, "post:schedule");
    assert.notInclude(permissions, "post:approve");
    assert.notInclude(permissions, "post:publish");
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
      withoutAds
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

      assert.deepStrictEqual(actor.permissions, withoutAds);
    }
  });

  it("shows no permission in the workspaces its token is not bound to", () => {
    const principal = through(
      grant(["workspace:write", "workspace:publish"], Option.some(studio))
    );

    assert.deepStrictEqual(userPermissions(principal, shop, "owner"), []);
    assert.deepStrictEqual(
      userPermissions(principal, studio, "owner"),
      withoutAds
    );
  });
});

// What a grant leaves an owner of the ads permissions.
const ads = (scopes: readonly string[]) =>
  grantedPermissions(grant(scopes), studio, ownerPermissions).filter(
    (permission) => permission.startsWith("ads:")
  );

describe("ads through an OAuth client", () => {
  it("leaves reading ads to any workspace scope", () => {
    assert.deepStrictEqual(ads(["workspace:read"]), ["ads:read"]);
  });

  it("gives nothing for the ads scope alone", () => {
    assert.deepStrictEqual(
      grantedPermissions(grant(["workspace:ads"]), studio, ownerPermissions),
      []
    );
  });

  it("asks for workspace:ads beside workspace:write to manage ad accounts", () => {
    assert.deepStrictEqual(ads(["workspace:write"]), ["ads:read"]);
    assert.deepStrictEqual(ads(["workspace:write", "workspace:ads"]), [
      "ads:read",
      "ads:manage",
    ]);
  });

  it("asks for workspace:publish and workspace:ads to spend", () => {
    assert.deepStrictEqual(ads(["workspace:write", "workspace:publish"]), [
      "ads:read",
    ]);
    assert.deepStrictEqual(ads(["workspace:publish", "workspace:ads"]), [
      "ads:read",
      "ads:spend",
    ]);
  });

  it("never lets an application turn spending on or set its ceiling", () => {
    assert.notInclude(
      ads([
        "workspace:read",
        "workspace:write",
        "workspace:publish",
        "workspace:ads",
      ]),
      "ads:authorize"
    );
  });

  it("names every scope a permission takes", () => {
    assert.deepStrictEqual(scopesFor("ads:spend"), [
      "workspace:ads",
      "workspace:publish",
    ]);
    assert.deepStrictEqual(scopesFor("ads:manage"), [
      "workspace:write",
      "workspace:ads",
    ]);
    assert.deepStrictEqual(scopesFor("post:schedule"), ["workspace:publish"]);
    assert.deepStrictEqual(scopesFor("ads:read"), ["workspace:read"]);
  });
});

describe("ads by role", () => {
  it("lets owners alone turn spending on", () => {
    assert.include(permissionsFor("owner"), "ads:authorize");
    assert.notInclude(permissionsFor("admin"), "ads:authorize");
  });

  it("lets owners and admins alone spend and manage ad accounts", () => {
    for (const role of ["owner", "admin"]) {
      assert.include(permissionsFor(role), "ads:spend");
      assert.include(permissionsFor(role), "ads:manage");
    }

    for (const role of ["editor", "contributor", "viewer"]) {
      assert.notInclude(permissionsFor(role), "ads:spend");
      assert.notInclude(permissionsFor(role), "ads:manage");
      assert.notInclude(permissionsFor(role), "ads:authorize");
    }
  });

  it("lets editors read ads, and nobody below", () => {
    assert.include(permissionsFor("editor"), "ads:read");
    assert.notInclude(permissionsFor("contributor"), "ads:read");
    assert.notInclude(permissionsFor("viewer"), "ads:read");
  });

  it("leaves staff acting as an owner reading only", () => {
    const impersonating = new UserPrincipal({
      impersonatedBy: Option.some(userId),
      oauth: Option.none(),
      userId,
    });

    assert.deepStrictEqual(
      userPermissions(impersonating, studio, "owner").filter((permission) =>
        permission.startsWith("ads:")
      ),
      ["ads:read"]
    );
  });
});
