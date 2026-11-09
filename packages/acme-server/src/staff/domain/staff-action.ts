import { Schema } from "effect";

/**
 * What staff do to an account, each recorded in the audit log. Events are
 * stored with it: add members, never rename or remove one.
 */
export const StaffActionSchema = Schema.Literals([
  // Banned the account, for good or for a while, and signed it out.
  "ban",
  // Lifted its ban.
  "unban",
  // Ended every session it had.
  "revokeSessions",
  // Emailed it a new link to confirm its address.
  "resendVerification",
  // Signed in as it, for an hour.
  "impersonate",
]);

export type StaffAction = typeof StaffActionSchema.Type;
