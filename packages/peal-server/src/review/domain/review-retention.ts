import { DateTime, Duration } from "effect";

/**
 * How long what visitors give is kept. A visitor has no account to close,
 * so the data ends by itself:
 *
 * - the email address they left to hear of replies: until 30 days after
 *   the link they came through ended (expired or revoked), when no reply
 *   will be sent to it any more;
 * - the name they gave, on their comments and on what they decided: 24
 *   months after the comment or the decision, long enough for a workspace
 *   to show who approved a post; the comment and the decision stay, and say
 *   "a reviewer".
 *
 * A link's own row (its token's hash, what it allowed, when it ended) goes
 * 24 months after it ended. What was said and decided about a post goes when
 * the post is deleted, and everything of a workspace when it is. The privacy policy and the docs say these
 * periods: change them together.
 */
export const visitorEmailRetention = Duration.days(30);

export const visitorNameRetention = Duration.days(730);

/** What is past its retention at `now`. */
export interface ReviewCutoffs {
  /** Emails of visitors whose link ended before this go. */
  readonly emailsOfLinksEndedBefore: DateTime.Utc;
  /** Names on comments and decisions made before this go. */
  readonly namesBefore: DateTime.Utc;
}

export const cutoffsAt = (now: DateTime.Utc): ReviewCutoffs => ({
  emailsOfLinksEndedBefore: DateTime.subtractDuration(
    now,
    visitorEmailRetention
  ),
  namesBefore: DateTime.subtractDuration(now, visitorNameRetention),
});
