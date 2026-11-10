import { Schema } from "effect";

/** No link has this token. Says nothing of the token, which is a secret. */
export class LinkNotFound extends Schema.TaggedError<LinkNotFound>()(
  "LinkNotFound",
  {}
) {}
