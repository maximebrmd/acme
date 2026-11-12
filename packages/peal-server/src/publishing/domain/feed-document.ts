import { Schema } from "effect";

import { FeedEntry } from "./feed-entry.ts";

/**
 * A feed as read, whatever its format (RSS 2.0, Atom 1.0, JSON Feed 1.1):
 * its title and its items, in the order the feed gives them.
 */
export class FeedDocument extends Schema.Class<FeedDocument>(
  "peal-server/publishing/domain/FeedDocument"
)({
  items: Schema.Array(FeedEntry),
  title: Schema.Option(Schema.String),
}) {}
