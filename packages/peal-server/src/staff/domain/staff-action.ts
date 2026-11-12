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
  // Applied a request to cancel a contract or withdraw from one, which
  // the form could not tie to its contract, to a workspace's (`billing`
  // context): the object ids hold the request's.
  "applyContractRequest",
  // Closed such a request without applying it.
  "closeContractRequest",
  // Opened a partner account for a workspace (`workspace` context): the
  // event's workspace is the account's home workspace, and it names no
  // account of a person.
  "grantPartner",
  // Turned off the account's two-step verification for its person, who lost
  // their phone and recovery codes: deleted its authenticator, codes and
  // trusted browsers, and signed it out everywhere.
  "resetTwoStep",
  // Turned a short link off (`shortlinks` context): it answers 410. The
  // event's workspace is the link's, and its code is among the object ids.
  "disableShortLink",
  // Turned it back on.
  "enableShortLink",
  // Turned off every short link of the event's workspace still on: the
  // object ids hold how many (`links`).
  "disableWorkspaceShortLinks",
  // Moved every workspace of one billing account into another (`billing`
  // context), the first deleted: the object ids hold both accounts'.
  "mergeBillingAccounts",
  // Required a payment method of a billing account, which then has no
  // free tier: the object ids hold the account's.
  "requirePaymentMethod",
  // Gave such an account its free tier back.
  "restoreFreeTier",
]);

export type StaffAction = typeof StaffActionSchema.Type;
