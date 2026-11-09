import { Schema } from "effect";

/**
 * Only a member in their own session orders, cancels or withdraws: never
 * an API key, an OAuth client, nor staff impersonating the member.
 */
export class PersonRequired extends Schema.TaggedError<PersonRequired>()(
  "PersonRequired",
  {}
) {}
