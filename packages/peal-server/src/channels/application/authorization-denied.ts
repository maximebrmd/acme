import { Schema } from "effect";

/** The account's owner refused to let Peal in, on the platform's page. */
export class AuthorizationDenied extends Schema.TaggedError<AuthorizationDenied>()(
  "AuthorizationDenied",
  {}
) {}
