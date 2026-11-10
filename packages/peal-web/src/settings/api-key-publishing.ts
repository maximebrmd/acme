import type { Permission } from "peal-contract";

/**
 * The permissions that let a key send posts out, or approve them: a key
 * without any of them writes drafts at most.
 */
export const publishingPermissions: readonly Permission[] = [
  "post:schedule",
  "post:publish",
  "post:approve",
];

/** Whether a key with these permissions may schedule or publish posts. */
export const mayPublish = (permissions: readonly Permission[]): boolean =>
  permissions.some((permission) => publishingPermissions.includes(permission));
