import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { authWithoutDatabase, servedRoutes } from "#test/workspace/support.ts";
import {
  workspaceRouteKind,
  workspacesChecked,
} from "#workspace/infrastructure/auth/two-step.ts";

const activeId = "0190f3a0-0000-7000-8000-0000000000a1";

const ownId = "0190f3a0-0000-7000-8000-0000000000a2";

describe(workspaceRouteKind, () => {
  const routes = servedRoutes(authWithoutDatabase()).filter(
    (path) =>
      path.startsWith("/organization/") || path.startsWith("/subscription/")
  );

  // Better Auth's workspace routes never pass WorkspaceAccess: each is
  // either guarded, so a member a workspace refuses for want of two-step
  // verification is refused it, or left open on purpose. A route an
  // upgrade adds fails here until it is placed.
  it("places every workspace route the server serves", () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(
      routes.filter((path) => workspaceRouteKind(path) === "unlisted")
    ).toStrictEqual([]);
  });

  it.each([
    "/organization/accept-invitation",
    "/organization/create",
    "/organization/leave",
    "/organization/list",
    "/organization/set-active",
  ])("leaves %s open to a member a workspace refuses", (path) => {
    expect(workspaceRouteKind(path)).toBe("exempt");
  });

  it.each([
    "/organization/get-full-organization",
    "/organization/invite-member",
    "/organization/list-members",
    "/organization/remove-member",
    "/organization/update-member-role",
    "/subscription/upgrade",
  ])("guards %s", (path) => {
    expect(workspaceRouteKind(path)).toBe("guarded");
  });

  it("never leaves open a route it does not know", () => {
    expect(workspaceRouteKind("/organization/synthetic-new-route")).toBe(
      "unlisted"
    );
  });
});

describe(workspacesChecked, () => {
  const active = Option.some(WorkspaceIdSchema.make(activeId));
  const own = WorkspaceIdSchema.make(ownId);

  it("checks the active workspace on a listed route only when the route falls back to it", () => {
    expect(
      workspacesChecked({ active, listed: true, named: [own], readsOne: true })
    ).toStrictEqual([own]);
    expect(
      workspacesChecked({ active, listed: true, named: [], readsOne: false })
    ).toStrictEqual([activeId]);
    expect(
      workspacesChecked({ active, listed: true, named: [], readsOne: true })
    ).toStrictEqual([activeId]);
  });

  it("always checks the active workspace on a route in neither list, which reads fields no list says", () => {
    expect(
      workspacesChecked({ active, listed: false, named: [own], readsOne: true })
    ).toStrictEqual([own, activeId]);
  });
});
