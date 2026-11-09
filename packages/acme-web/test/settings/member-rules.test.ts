import { describe, expect, it } from "@effect/vitest";

import {
  assignableRoles,
  mayRemove,
  ownersAmong,
  rolesFor,
} from "#settings/member-rules.ts";
import type { Manager } from "#settings/member-rules.ts";

const owner: Manager = {
  mayRemove: true,
  mayUpdate: true,
  role: "owner",
  userId: "owner",
};

const admin: Manager = { ...owner, role: "admin", userId: "admin" };

const viewer: Manager = {
  mayRemove: false,
  mayUpdate: false,
  role: "viewer",
  userId: "viewer",
};

const coOwner = { role: "owner", userId: "co-owner" };

const editor = { role: "editor", userId: "editor" };

describe(rolesFor, () => {
  it("lets an owner give any role, owner included", () => {
    expect(rolesFor(owner, editor, 1)).toStrictEqual([
      "owner",
      "admin",
      "editor",
      "contributor",
      "viewer",
    ]);
  });

  it("lets an admin give every role but owner, and leave owners alone", () => {
    expect(rolesFor(admin, editor, 1)).toStrictEqual([
      "admin",
      "editor",
      "contributor",
      "viewer",
    ]);
    expect(rolesFor(admin, coOwner, 2)).toStrictEqual([]);
  });

  it("keeps the last owner an owner", () => {
    expect(rolesFor(owner, owner, 1)).toStrictEqual([]);
    expect(rolesFor(owner, owner, 2)).toHaveLength(5);
  });

  it("gives nothing to a member who may not change roles", () => {
    expect(rolesFor(viewer, editor, 1)).toStrictEqual([]);
  });
});

describe(mayRemove, () => {
  it("lets owners and admins remove others, never themselves", () => {
    expect(mayRemove(owner, editor, 1)).toBeTruthy();
    expect(mayRemove(admin, editor, 1)).toBeTruthy();
    expect(mayRemove(owner, owner, 2)).toBeFalsy();
    expect(mayRemove(viewer, editor, 1)).toBeFalsy();
  });

  it("removes an owner only as an owner, while another remains", () => {
    expect(mayRemove(owner, coOwner, 2)).toBeTruthy();
    expect(mayRemove(owner, coOwner, 1)).toBeFalsy();
    expect(mayRemove(admin, coOwner, 2)).toBeFalsy();
  });
});

describe(ownersAmong, () => {
  it("counts the members whose roles include owner", () => {
    expect(
      ownersAmong([
        owner,
        coOwner,
        editor,
        { role: "admin, owner", userId: "x" },
      ])
    ).toBe(3);
  });
});

describe(assignableRoles, () => {
  it("leaves owner out for anyone but an owner", () => {
    expect(assignableRoles(admin)).not.toContain("owner");
    expect(assignableRoles(owner)).toContain("owner");
  });
});
