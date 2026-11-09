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
  // Changed something while acting as it: the event's operation names the
  // change, its workspace and object ids say where and on what.
  "impersonatedChange",
  // Stopped acting as it, or signed out of the session that did.
  "stopImpersonating",
  // The server ended a session acting as it: its staff member was banned,
  // signed out everywhere or no longer staff, or the account was banned or
  // signed out everywhere.
  "impersonationEnded",
  // Answered a legal request (`legal` context): the reason holds the
  // authority and its reference, the target the account it named.
  "legalDisclosure",
]);

export type StaffAction = typeof StaffActionSchema.Type;
