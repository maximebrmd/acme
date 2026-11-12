import { Schema } from "effect";

/** The workspace has no short link of this id. */
export class ShortLinkNotFound extends Schema.TaggedError<ShortLinkNotFound>()(
  "ShortLinkNotFound",
  { linkId: Schema.String }
) {}
