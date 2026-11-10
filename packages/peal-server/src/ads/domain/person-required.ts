import { Schema } from "effect";

/**
 * Only a person signed in to Peal does this, in their own session: not an
 * API key, an application acting for them, or staff acting as them.
 * Signing in to an ad network, and deciding what ads may spend, are theirs.
 */
export class PersonRequired extends Schema.TaggedError<PersonRequired>()(
  "PersonRequired",
  {}
) {}
