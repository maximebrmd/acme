import { Schema } from "effect";

/**
 * Why staff may not do this to this account:
 *
 * - `self`: staff do not ban, sign out or impersonate themselves.
 * - `staff`: staff do not impersonate other staff.
 * - `verified`: the address is confirmed already.
 * - `expired`: a ban must end in the future;
 * - `banned`: a banned account cannot be signed in as, by staff either.
 */
export const StaffRefusalSchema = Schema.Literals([
  "self",
  "staff",
  "verified",
  "expired",
  "banned",
]).annotate({ identifier: "StaffRefusal" });

export type StaffRefusal = typeof StaffRefusalSchema.Type;

/** The account exists, and this action does not apply to it. */
export class StaffActionRefused extends Schema.TaggedError<StaffActionRefused>()(
  "StaffActionRefused",
  { reason: StaffRefusalSchema },
  {
    description:
      "The action does not apply to this account: staff acting on themselves, impersonating other staff, an address already confirmed, a ban that would end in the past, or acting as a banned account.",
    httpApiStatus: 409,
  }
) {}
