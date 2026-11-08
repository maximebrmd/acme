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
]);

export type AuthEmail = typeof AuthEmailSchema.Type;
