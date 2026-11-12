import { Schema } from "effect";

/** The server's short link settings cannot be used: it does not start. */
export class InvalidShortLinkSettings extends Schema.TaggedError<InvalidShortLinkSettings>()(
  "InvalidShortLinkSettings",
  { reason: Schema.String }
) {}
