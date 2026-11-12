import { Schema } from "effect";

/** No short link has this code. */
export class ShortLinkNotFound extends Schema.TaggedError<ShortLinkNotFound>()(
  "ShortLinkNotFound",
  { code: Schema.String }
) {}
