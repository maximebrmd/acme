import { Option, Schema } from "effect";

/** A count a platform keeps: a whole number, never negative. */
export const CountSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

/**
 * A post's counts on its platform at one moment, in Acme's words: likes are
 * Mastodon's favourites and Bluesky's likes, reposts Mastodon's boosts and
 * Bluesky's reposts. Quotes are there only where the platform counts them
 * (Bluesky, and Mastodon from 4.5), impressions only where it tells them:
 * none otherwise, which is not zero.
 */
export class PostMetrics extends Schema.Class<PostMetrics>(
  "acme-server/analytics/domain/PostMetrics"
)({
  impressions: Schema.OptionFromNullOr(CountSchema),
  likes: CountSchema,
  quotes: Schema.OptionFromNullOr(CountSchema),
  replies: CountSchema,
  reposts: CountSchema,
}) {}

/**
 * What people did with a post: its likes, reposts, replies and quotes.
 * Impressions are only seen, so they are not part of it.
 */
export const engagementOf = (metrics: PostMetrics): number =>
  metrics.likes +
  metrics.reposts +
  metrics.replies +
  Option.getOrElse(metrics.quotes, () => 0);
