import { Schema } from "effect";

/**
 * The request carries no session or API key that works: none at all, an
 * expired or revoked one, or a key that was never issued.
 */
export class NotSignedIn extends Schema.TaggedError<NotSignedIn>()(
  "NotSignedIn",
  {}
) {}
