import { Schema } from "effect";

// What a member may do to another in the members list, as Better Auth's
// organization routes allow it: the page offers only what they would
// accept, and they check it all again.

/** A workspace's roles, from most to least trusted. */
export const RoleSchema = Schema.Literals([
  "owner",
  "admin",
  "editor",
  "contributor",
  "viewer",
]);

export type Role = typeof RoleSchema.Type;

/** Someone in the members list, or the member looking at it. */
export interface Someone {
  /** Their role, as stored: one name, or several separated by commas. */
  readonly role: string;
  readonly userId: string;
}

/** The member managing the others, and what their role lets them do. */
export interface Manager extends Someone {
  readonly mayRemove: boolean;
  readonly mayUpdate: boolean;
}

export const isOwner = (role: string): boolean =>
  role
    .split(",")
    .map((name) => name.trim())
    .includes("owner");

/** How many of the members own the workspace. */
export const ownersAmong = (members: readonly Someone[]): number =>
  members.filter(({ role }) => isOwner(role)).length;

/**
 * The roles the manager may give: every one for an owner, all but owner
 * for anyone else.
 */
export const assignableRoles = (manager: Someone): readonly Role[] =>
  isOwner(manager.role)
    ? RoleSchema.literals
    : RoleSchema.literals.filter((role) => role !== "owner");

/**
 * The roles the manager may move the member to, or none when they may not
 * change the member's role: only owners change owners, and the last owner
 * stays one.
 */
export const rolesFor = (
  manager: Manager,
  member: Someone,
  owners: number
): readonly Role[] => {
  if (!manager.mayUpdate || (isOwner(member.role) && !isOwner(manager.role))) {
    return [];
  }

  if (isOwner(member.role) && owners <= 1) {
    return [];
  }

  return assignableRoles(manager);
};

/**
 * Whether the manager may remove the member: never themselves, an owner
 * only as an owner and while another owner remains.
 */
export const mayRemove = (
  manager: Manager,
  member: Someone,
  owners: number
): boolean => {
  if (!manager.mayRemove || member.userId === manager.userId) {
    return false;
  }

  return isOwner(member.role) ? isOwner(manager.role) && owners > 1 : true;
};
