import { Schema } from "effect";

import { LocaleSchema } from "#shared/domain/locale.ts";

// Every account email carries one link, and goes out in its reader's language.
const link = {
  locale: LocaleSchema,
  to: Schema.NonEmptyString,
  url: Schema.NonEmptyString,
};

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
  // Tells the account's address that a copy of its data was downloaded,
  // from the web app or the command line. Its link opens account settings.
  Schema.TaggedStruct("DataExported", {
    ...link,
    via: Schema.Literals(["commandLine", "web"]),
  }),
]);

export type AuthEmail = typeof AuthEmailSchema.Type;
