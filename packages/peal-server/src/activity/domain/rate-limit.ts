import { DateTime, Schema } from "effect";

/**
 * How many requests a credential may send in a window: `limit` requests
 * every `windowSeconds`. Windows are fixed and start on the clock
 * (10:00:00, 10:01:00…), the same for every credential, so a count is one
 * row and its reset is a time anyone can compute.
 */
export class RateLimitPolicy extends Schema.Class<RateLimitPolicy>(
  "peal-server/activity/domain/RateLimitPolicy"
)({
  limit: Schema.Int.check(Schema.isGreaterThan(0)),
  /** The policy's name in the `RateLimit` headers. */
  name: Schema.NonEmptyString,
  windowSeconds: Schema.Int.check(Schema.isGreaterThan(0)),
}) {}

/** The window an API key or an OAuth token's requests are counted in. */
export const requestWindowSeconds = 60;

/** How many requests a minute a credential may send, unless set otherwise. */
export const defaultRequestsPerMinute = 600;

/** The policy for the API's and the MCP endpoint's bearer credentials. */
export const requestPolicy = (requestsPerMinute: number): RateLimitPolicy =>
  new RateLimitPolicy({
    limit: requestsPerMinute,
    name: "default",
    windowSeconds: requestWindowSeconds,
  });

/** Where a credential stands in the current window, this request counted. */
export interface LimitStanding {
  /** Whether this request is within the limit. */
  readonly allowed: boolean;
  readonly limit: number;
  /** Requests left in the window after this one. */
  readonly remaining: number;
  /** Seconds until the window ends and the count starts again: 1 at least. */
  readonly resetAfterSeconds: number;
  readonly windowSeconds: number;
}

/** When the window holding `now` started. */
export const windowStart = (
  policy: RateLimitPolicy,
  now: DateTime.Utc
): DateTime.Utc => {
  const length = policy.windowSeconds * 1000;
  const millis = DateTime.toEpochMillis(now);

  return DateTime.makeUnsafe(Math.floor(millis / length) * length);
};

/**
 * Where a credential stands once `count` requests, this one included, were
 * counted in the window holding `now`.
 */
export const standingOf = (
  policy: RateLimitPolicy,
  count: number,
  now: DateTime.Utc
): LimitStanding => {
  const ends =
    DateTime.toEpochMillis(windowStart(policy, now)) +
    policy.windowSeconds * 1000;

  return {
    allowed: count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - count),
    resetAfterSeconds: Math.max(
      1,
      Math.ceil((ends - DateTime.toEpochMillis(now)) / 1000)
    ),
    windowSeconds: policy.windowSeconds,
  };
};

/**
 * How long counts are kept after their window: they are only read while
 * the window runs, and the purge leaves a margin for a clock that differs.
 */
export const countRetentionSeconds = 3600;
