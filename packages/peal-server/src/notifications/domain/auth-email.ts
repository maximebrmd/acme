import { Schema } from "effect";

import { LocaleSchema } from "#shared/domain/locale.ts";

// Every account email carries one link, and goes out in its reader's language.
const link = {
  locale: LocaleSchema,
  to: Schema.NonEmptyString,
  url: Schema.NonEmptyString,
};

/**
 * What became of a request to cancel a contract or withdraw from one, as
 * its acknowledgement says it: `confirm`, it waits for the link to be
 * followed; `review`, a person will look at it; `cancelled` or `withdrawn`,
 * it was applied; or why its contract refused it.
 */
export const ContractRequestOutcomeSchema = Schema.Literals([
  "confirm",
  "review",
  "cancelled",
  "withdrawn",
  "nothingToCancel",
  "notSubscribed",
  "expired",
  "business",
]);

export type ContractRequestOutcome = typeof ContractRequestOutcomeSchema.Type;

const instant = Schema.DateTimeUtc;

/**
 * What changed in an account's two-step verification: turned on or off by
 * its person, new recovery codes made, one used to sign in, or reset by the
 * people who run the server.
 */
export const TwoStepChangeSchema = Schema.Literals([
  "turnedOn",
  "turnedOff",
  "recoveryCodesRenewed",
  "recoveryCodeUsed",
  "resetByStaff",
]);

export type TwoStepChange = typeof TwoStepChangeSchema.Type;

/** An email that signing in depends on. */
export const AuthEmailSchema = Schema.Union([
  // Confirms the address of a new account.
  Schema.TaggedStruct("VerifyEmail", link),
  // Lets someone who forgot their password choose a new one.
  Schema.TaggedStruct("ResetPassword", link),
  // Invites someone, who may not have an account yet, to a workspace.
  Schema.TaggedStruct("Invitation", {
    ...link,
    inviterName: Schema.String,
    role: Schema.String,
    workspaceName: Schema.String,
  }),
  // Confirms, to the address it had, that an account was deleted with its
  // data, as its owner asked, how many subscriptions of the workspaces
  // it deleted were cancelled, and what the law has the server keep of it,
  // in years: null when nothing, and without the identity and the account's
  // years on a server that stopped keeping them. Its link opens Peal.
  Schema.TaggedStruct("AccountDeleted", {
    ...link,
    legalHold: Schema.NullOr(
      Schema.Struct({
        accountYears: Schema.NullOr(Schema.Int),
        connectionYears: Schema.Int,
        identityYears: Schema.NullOr(Schema.Int),
      })
    ),
    subscriptionsCancelled: Schema.Int,
  }),
  // Confirms, to the owner who deleted it, that a workspace is deleted, and
  // whether its subscription was cancelled. Its link opens their workspaces.
  Schema.TaggedStruct("WorkspaceDeleted", {
    ...link,
    subscriptionsCancelled: Schema.Int,
    workspaceName: Schema.String,
  }),
  // Tells the account's address what changed in its two-step
  // verification, so a change someone else made is noticed: with how many
  // recovery codes are left when one was used. Its link opens account
  // settings.
  Schema.TaggedStruct("TwoStepChanged", {
    ...link,
    kind: TwoStepChangeSchema,
    recoveryCodesLeft: Schema.NullOr(Schema.Int),
  }),
  // Tells the account's address that a copy of its data was downloaded,
  // from the web app or the command line. Its link opens account settings.
  Schema.TaggedStruct("DataExported", {
    ...link,
    via: Schema.Literals(["commandLine", "web"]),
  }),
  // Acknowledges, to the address its sender gave, a request to cancel a
  // contract or withdraw from it: when it was received and what it said
  // (the name, the contract as written, empty when not given, the day
  // wanted), then what became of it. Its link applies it (`confirm`), or
  // opens Peal.
  Schema.TaggedStruct("ContractRequestAcknowledged", {
    ...link,
    contract: Schema.String,
    desiredAt: Schema.NullOr(instant),
    effectiveAt: Schema.NullOr(instant),
    kind: Schema.Literals(["cancellation", "withdrawal"]),
    name: Schema.String,
    outcome: ContractRequestOutcomeSchema,
    receivedAt: instant,
    refunded: Schema.NullOr(
      Schema.Struct({ amount: Schema.Int, currency: Schema.NonEmptyString })
    ),
  }),
]);

export type AuthEmail = typeof AuthEmailSchema.Type;
