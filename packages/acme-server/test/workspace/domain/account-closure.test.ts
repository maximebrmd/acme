import { describe, expect, it } from "@effect/vitest";
import { Option, Result } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { planClosure } from "#workspace/domain/account-closure.ts";
import type { MembershipStanding } from "#workspace/domain/account-closure.ts";
import type { OAuthGrant } from "#workspace/domain/oauth-grant.ts";
import {
  ownSession,
  ownSessionOrCommandLine,
} from "#workspace/domain/own-session.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const workspace = (
  id: string,
  role: string,
  memberRoles: readonly string[]
): MembershipStanding => ({
  memberRoles,
  role,
  workspaceId: WorkspaceIdSchema.make(id),
  workspaceName: `Workspace ${id.slice(0, 1)}`,
});

const solo = workspace("1a2b3c4d-0000-4000-8000-000000000001", "owner", [
  "owner",
]);

const coOwned = workspace("2a2b3c4d-0000-4000-8000-000000000002", "owner", [
  "owner",
  "owner",
  "viewer",
]);

const joined = workspace("3a2b3c4d-0000-4000-8000-000000000003", "editor", [
  "owner",
  "editor",
]);

const ownedAlone = workspace("4a2b3c4d-0000-4000-8000-000000000004", "owner", [
  "owner",
  "admin",
]);

describe(planClosure, () => {
  it("deletes the workspaces where the account is alone, and leaves the others", () => {
    expect(planClosure([solo, coOwned, joined])).toStrictEqual(
      Result.succeed({
        deleted: [solo.workspaceId],
        left: [coOwned.workspaceId, joined.workspaceId],
      })
    );
  });

  it("refuses while the account alone owns a workspace that others use", () => {
    const refused = planClosure([solo, ownedAlone, joined]);

    expect(Result.isFailure(refused)).toBeTruthy();
    expect(
      Result.match(refused, {
        onFailure: ({ workspaces }) => workspaces,
        onSuccess: () => [],
      })
    ).toStrictEqual([{ id: ownedAlone.workspaceId, name: "Workspace 4" }]);
  });

  it("closes an account that belongs to no workspace", () => {
    expect(planClosure([])).toStrictEqual(
      Result.succeed({ deleted: [], left: [] })
    );
  });
});

describe(ownSession, () => {
  const userId = UserIdSchema.make("5a2b3c4d-0000-4000-8000-000000000005");

  it("is the user signed in with their own session", () => {
    expect(
      ownSession(new UserPrincipal({ impersonatedBy: Option.none(), userId }))
    ).toStrictEqual(Result.succeed(userId));
  });

  it("is nobody through an OAuth client, or staff impersonating them", () => {
    const throughClient = new UserPrincipal({
      impersonatedBy: Option.none(),
      oauth: Option.some({
        clientId: "acme-cli",
        scopes: ["workspace:write"],
        workspaceId: Option.none(),
      }),
      userId,
    });

    const impersonated = new UserPrincipal({
      impersonatedBy: Option.some(
        UserIdSchema.make("6a2b3c4d-0000-4000-8000-000000000006")
      ),
      userId,
    });

    expect(Result.isFailure(ownSession(throughClient))).toBeTruthy();
    expect(Result.isFailure(ownSession(impersonated))).toBeTruthy();
  });
});

describe(ownSessionOrCommandLine, () => {
  const userId = UserIdSchema.make("7a2b3c4d-0000-4000-8000-000000000007");

  const studio = WorkspaceIdSchema.make("8a2b3c4d-0000-4000-8000-000000000008");

  const through = (grant: OAuthGrant) =>
    new UserPrincipal({
      impersonatedBy: Option.none(),
      oauth: Option.some(grant),
      userId,
    });

  it("is the user in person, or through the command line", () => {
    expect(
      ownSessionOrCommandLine(
        new UserPrincipal({ impersonatedBy: Option.none(), userId })
      )
    ).toStrictEqual(Result.succeed(userId));
    expect(
      ownSessionOrCommandLine(
        through({
          clientId: "acme-cli",
          scopes: ["offline_access", "workspace:read"],
          workspaceId: Option.none(),
        })
      )
    ).toStrictEqual(Result.succeed(userId));
  });

  it("is nobody through another client, one bound to a workspace, one granted no workspace scope, or staff", () => {
    const refused = [
      through({
        clientId: "synthetic-agent",
        scopes: ["workspace:write"],
        workspaceId: Option.none(),
      }),
      through({
        clientId: "acme-cli",
        scopes: ["workspace:write"],
        workspaceId: Option.some(studio),
      }),
      through({
        clientId: "acme-cli",
        scopes: ["openid"],
        workspaceId: Option.none(),
      }),
      new UserPrincipal({
        impersonatedBy: Option.some(
          UserIdSchema.make("9a2b3c4d-0000-4000-8000-000000000009")
        ),
        userId,
      }),
    ];

    for (const principal of refused) {
      expect(Result.isFailure(ownSessionOrCommandLine(principal))).toBeTruthy();
    }
  });
});
