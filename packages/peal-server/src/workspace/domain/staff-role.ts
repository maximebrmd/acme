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

/**
 * The role that, with the staff role, lets an account answer legal
 * requests: a few named people, apart from staff who help users, since an
 * answer hands closed accounts' identities and addresses to an authority.
 */
export const legalRole = "legal";

/** Whether an account's roles let it answer legal requests. */
export const isLegalRole = (role: Option.Option<string>): boolean =>
  isStaffRole(role) &&
  Option.exists(role, (roles) =>
    roles.split(",").some((name) => name.trim() === legalRole)
  );
