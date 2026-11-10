import { Schema } from "effect";

/** The server's ads settings cannot be used: it does not start. */
export class InvalidAdsSettings extends Schema.TaggedError<InvalidAdsSettings>()(
  "InvalidAdsSettings",
  { reason: Schema.String }
) {}
