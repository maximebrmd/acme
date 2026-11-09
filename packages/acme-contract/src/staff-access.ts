import { HttpApiError, HttpApiMiddleware } from "effect/http-api";

import type { CurrentStaff } from "./current-staff.ts";
import { sessionCookie } from "./session-cookie.ts";

/**
 * The staff console's guard: a staff member (Better Auth's admin role) in
 * their own session, never an API key, an OAuth client or staff
 * impersonating someone. Anyone else, signed in or not, gets 404, as if the
 * console were not there. It provides CurrentStaff to the endpoints behind
 * it, and needs no other middleware.
 */
export class StaffAccess extends HttpApiMiddleware.Service<
  StaffAccess,
  { provides: CurrentStaff }
>()("acme-contract/StaffAccess", {
  error: HttpApiError.NotFound,
  security: { session: sessionCookie },
}) {}
