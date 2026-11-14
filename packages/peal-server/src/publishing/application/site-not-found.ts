import { Schema } from "effect";

/** The workspace has no website's channel of this id. */
export class SiteNotFound extends Schema.TaggedError<SiteNotFound>()(
  "SiteNotFound",
  { channelId: Schema.String }
) {}
