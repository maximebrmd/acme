import { Schema } from "effect";

/**
 * Why an action does not apply to an account:
 *
 * - `self`: staff do not ban, sign out or impersonate themselves;
 * - `staff`: staff do not impersonate other staff;
 * - `verified`: the address is confirmed already;
 * - `expired`: a ban must end in the future;
 * - `banned`: a banned account cannot be signed in as, by staff either.
 */
export const StaffRefusalSchema = Schema.Literals([
  "self",
  "staff",
  "verified",
  "expired",
  "banned",
]);

export type StaffRefusal = typeof StaffRefusalSchema.Type;
