import { Schema } from "effect";

/**
 * The server requires staff to have two-step verification on to use the
 * console, and this staff member's account does not.
 */
export class StaffTwoStepRequired extends Schema.TaggedError<StaffTwoStepRequired>()(
  "StaffTwoStepRequired",
  {}
) {}
