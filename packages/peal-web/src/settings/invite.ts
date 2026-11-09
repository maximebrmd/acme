import { authClient } from "#auth/client.ts";

import type { Role } from "./member-rules.ts";

/**
 * Invites someone to the workspace with one of Peal's roles, or, with
 * `resend`, sends a pending invitation again with a new expiry. Better
 * Auth's client types roles from its own defaults, which Peal's replace, so
 * this calls its route directly; the server checks the role.
 */
export const invite = async (request: {
  readonly email: string;
  readonly organizationId: string;
  readonly resend: boolean;
  readonly role: Role;
}) =>
  await authClient.$fetch("/organization/invite-member", {
    body: request,
    method: "POST",
  });
