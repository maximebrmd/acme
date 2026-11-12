import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Why staff may not do this to this account:
 *
 * - `self`: staff do not ban, sign out or impersonate themselves.
 * - `staff`: staff do not impersonate other staff.
 * - `verified`: the address is confirmed already.
 * - `expired`: a ban must end in the future;
 * - `banned`: a banned account cannot be signed in as, by staff either;
 * - `twoStepOff`: two-step verification is off on the account, so there
 *   is nothing to reset.
 */
export const StaffRefusalSchema = Schema.Literals([
  "self",
  "staff",
  "verified",
  "expired",
  "banned",
  "twoStepOff",
]).annotate({ identifier: "StaffRefusal" });

export type StaffRefusal = typeof StaffRefusalSchema.Type;

/** The account exists, and this action does not apply to it. */
export class StaffActionRefused extends Schema.TaggedError<StaffActionRefused>()(
  "StaffActionRefused",
  { ...errorEnvelope, reason: StaffRefusalSchema },
  {
    description:
      "The action does not apply to this account: staff acting on themselves, impersonating other staff, an address already confirmed, a ban that would end in the past, acting as a banned account, or resetting two-step verification an account does not have on (`twoStepOff`).",
    httpApiStatus: 409,
  }
) {}
