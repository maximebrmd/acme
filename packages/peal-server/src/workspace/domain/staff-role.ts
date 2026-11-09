import { Option } from "effect";

/**
 * The role that makes an account staff: Better Auth's admin role, which the
 * admin plugin is configured with (`adminRoles`).
 */
export const staffRole = "admin";

/**
 * Whether an account's role makes it staff. Better Auth stores roles
 * comma-separated; an account without one is a plain user.
 */
export const isStaffRole = (role: Option.Option<string>): boolean =>
  Option.exists(role, (roles) =>
    roles.split(",").some((name) => name.trim() === staffRole)
  );
