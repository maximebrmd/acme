import { Effect, Option, Schema } from "effect";

/**
 * The most a count can be: 2,147,483,647, what Peal keeps each count in.
 * No post comes near it, so a server that says more (a Mastodon server is
 * anyone's choice) is not believed.
 */
export const maxCount = 2_147_483_647;

/** A count a platform keeps: a whole number, never negative. */
export const CountSchema = Schema.Int.check(
  Schema.isBetween({ maximum: maxCount, minimum: 0 })
);

// A count only some platforms give: none where the platform gives none, and
// in what was stored or sent before Peal read it.
const givenBySome = Schema.OptionFromNullOr(CountSchema).pipe(
  Schema.withConstructorDefault(Effect.succeed(Option.none())),
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

/**
 * A post's counts on its platform at one moment, in Peal's words: likes are
 * Mastodon's favourites and Bluesky's likes, reposts Mastodon's boosts and
 * Bluesky's reposts. Quotes are there only where the platform counts them
 * (Bluesky, and Mastodon from 4.5), impressions only where it tells them:
 * none otherwise, which is not zero. Clicks (on the post or its link),
 * reach (the accounts that saw it) and saves (bookmarks) are there on the
 * few platforms that tell them.
 */
export class PostMetrics extends Schema.Class<PostMetrics>(
  "peal-server/analytics/domain/PostMetrics"
)({
  clicks: givenBySome,
  impressions: Schema.OptionFromNullOr(CountSchema),
  likes: CountSchema,
  quotes: Schema.OptionFromNullOr(CountSchema),
  reach: givenBySome,
  replies: CountSchema,
  reposts: CountSchema,
  saves: givenBySome,
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
