import { Schema } from "effect";

/**
 * Why a feed stopped: it could not be read for `maxFailingDays`
 * (`unreachable`), what its address gave was not a feed all that time
 * (`notAFeed`), its host said it is gone for good (`gone`, HTTP 410),
 * whoever started it can no longer make its posts (`starterGone`), or the
 * queue it puts posts on was deleted (`queueGone`). Stored: add a member,
 * never rename or remove one.
 */
export const FeedStopReasonSchema = Schema.Literals([
  "unreachable",
  "notAFeed",
  "gone",
  "starterGone",
  "queueGone",
]);

export type FeedStopReason = typeof FeedStopReasonSchema.Type;
