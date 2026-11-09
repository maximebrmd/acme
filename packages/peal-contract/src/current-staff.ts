import { Context } from "effect";

/** Someone who runs the server, in their own session. */
export interface Staff {
  readonly userId: string;
}

/**
 * Provided by the StaffAccess middleware to the staff console's endpoints:
 * the staff member who sends the request.
 */
export class CurrentStaff extends Context.Service<CurrentStaff, Staff>()(
  "peal-contract/CurrentStaff"
) {}
