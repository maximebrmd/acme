import { Schema } from "effect";

import { ItemDigestSchema } from "./item-digest.ts";

/**
 * An item of a feed, as read and made storable: its identity's digest,
 * then whatever it says of itself, each part optional (a title and a link
 * on one line, a summary as plain text, `link` and `pictureUrl` HTTP or
 * HTTPS addresses only, made absolute).
 */
export class FeedEntry extends Schema.Class<FeedEntry>(
  "peal-server/publishing/domain/FeedEntry"
)({
  digest: ItemDigestSchema,
  link: Schema.Option(Schema.String),
  pictureUrl: Schema.Option(Schema.String),
  publishedAt: Schema.Option(Schema.DateTimeUtc),
  summary: Schema.Option(Schema.String),
  title: Schema.Option(Schema.String),
}) {}
