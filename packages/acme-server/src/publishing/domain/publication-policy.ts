import { DateTime, Duration, Match, Schema } from "effect";

import { PublishFailureSchema } from "#shared/domain/publish-failure.ts";
import { PublishResultSchema } from "#shared/domain/publish-result.ts";

import type { FailureReason } from "./post-target-status.ts";
import { TargetSettlementSchema } from "./target-settlement.ts";
import type { TargetSettlement } from "./target-settlement.ts";

/**
 * What to do after a publishing attempt, decided from how it ended. The rules
 * are pure, so an attempt replayed from a workflow's history decides the same.
 *
 * | Outcome             | Decision                                           |
 * | ------------------- | -------------------------------------------------- |
 * | published           | settle: published                                  |
 * | unconfirmed         | settle: unconfirmed, never retried                 |
 * | PlatformUnavailable | retry after 1 min, 5 min, 15 min, 1 h, 1 h, then  |
 * |                     | give up: unavailable                               |
 * | RateLimited         | retry after the platform's delay (1 min if none),  |
 * |                     | kept between 1 s and 6 h; give up after 8 attempts |
 * |                     | or past 24 h after the scheduled time: rateLimited |
 * | TokenExpired        | give up: tokenExpired, and reconnect the channel   |
 * | MediaRejected       | give up: mediaRejected                             |
 * | BadRequest          | give up: contentRejected                           |
 *
 * PlatformUnavailable and RateLimited each count only the attempts that
 * ended that way: a rate limit uses none of the unavailable retries, and the
 * other way round.
 *
 * Every retry is a new attempt with a new idempotency key: the platform
 * refused the previous one, so nothing went live.
 */
export interface PublicationPolicy {
  /**
   * How late a post may still go out, as after the server was down at its
   * scheduled time. Later than that, it is marked missed.
   */
  readonly latenessLimit: Duration.Duration;
  readonly rateLimit: {
    /** No retry starts later than this after the scheduled time. */
    readonly deadline: Duration.Duration;
    /** The wait when the platform does not say how long. */
    readonly fallbackDelay: Duration.Duration;
    readonly maxAttempts: number;
    readonly maximumDelay: Duration.Duration;
    readonly minimumDelay: Duration.Duration;
  };
  /** The wait before each retry while the platform is unavailable. */
  readonly unavailableBackoff: readonly Duration.Duration[];
}

export const defaultPublicationPolicy: PublicationPolicy = {
  latenessLimit: Duration.hours(1),
  rateLimit: {
    deadline: Duration.hours(24),
    fallbackDelay: Duration.minutes(1),
    maxAttempts: 8,
    maximumDelay: Duration.hours(6),
    minimumDelay: Duration.seconds(1),
  },
  unavailableBackoff: [
    Duration.minutes(1),
    Duration.minutes(5),
    Duration.minutes(15),
    Duration.hours(1),
    Duration.hours(1),
  ],
};

const RetrySchema = Schema.TaggedStruct("retry", {
  delay: Schema.DurationFromMillis,
});

const SettleSchema = Schema.TaggedStruct("settle", {
  settlement: TargetSettlementSchema,
});

/**
 * Try again after `delay`, or settle the target. Workflows store it in their
 * history, so members and fields may be added but never renamed or removed.
 */
export const PublicationDecisionSchema = Schema.Union([
  RetrySchema,
  SettleSchema,
]);

export type PublicationDecision = typeof PublicationDecisionSchema.Type;

/** How a publishing attempt ended: a result, or the platform's refusal. */
export const AttemptOutcomeSchema = Schema.Union([
  PublishResultSchema,
  PublishFailureSchema,
]);

export type AttemptOutcome = typeof AttemptOutcomeSchema.Type;

/**
 * How many earlier attempts of a round ended in each refusal that is retried,
 * the attempt that just ended left out.
 */
export interface EarlierRefusals {
  readonly rateLimited: number;
  readonly unavailable: number;
}

/** Where the attempt stands. */
export interface AttemptContext {
  readonly earlier: EarlierRefusals;
  /** From the scheduled time to the end of the attempt. */
  readonly sinceScheduled: Duration.Duration;
}

const settle = (settlement: TargetSettlement): PublicationDecision => ({
  _tag: "settle",
  settlement,
});

const giveUp = (reason: FailureReason, code?: string): PublicationDecision =>
  settle(
    code === undefined
      ? { _tag: "failed", reason }
      : { _tag: "failed", code, reason }
  );

const retry = (delay: Duration.Duration): PublicationDecision => ({
  _tag: "retry",
  delay,
});

const afterUnavailable = (
  context: AttemptContext,
  policy: PublicationPolicy
): PublicationDecision => {
  const delay = policy.unavailableBackoff[context.earlier.unavailable];

  return delay === undefined ? giveUp("unavailable") : retry(delay);
};

const afterRateLimit = (
  retryAfter: Duration.Duration | undefined,
  context: AttemptContext,
  policy: PublicationPolicy
): PublicationDecision => {
  const limits = policy.rateLimit;

  const delay = Duration.clamp(retryAfter ?? limits.fallbackDelay, {
    maximum: limits.maximumDelay,
    minimum: limits.minimumDelay,
  });

  const retryAt = Duration.sum(context.sinceScheduled, delay);

  return context.earlier.rateLimited + 1 >= limits.maxAttempts ||
    Duration.isGreaterThan(retryAt, limits.deadline)
    ? giveUp("rateLimited")
    : retry(delay);
};

/** Decides what follows an attempt, from how it ended (see the table above). */
export const decide = (
  outcome: AttemptOutcome,
  context: AttemptContext,
  policy: PublicationPolicy = defaultPublicationPolicy
): PublicationDecision =>
  Match.valueTags(outcome, {
    BadRequest: ({ code }) => giveUp("contentRejected", code),
    MediaRejected: ({ code }) => giveUp("mediaRejected", code),
    PlatformUnavailable: () => afterUnavailable(context, policy),
    RateLimited: ({ retryAfter }) =>
      afterRateLimit(retryAfter, context, policy),
    TokenExpired: () => giveUp("tokenExpired"),
    published: (published) => settle(published),
    unconfirmed: (unconfirmed) => settle(unconfirmed),
  });

/**
 * Whether a post due at `scheduledAt` is too late to send at `now`, as when
 * the server was down at its time.
 */
export const isTooLate = (
  scheduledAt: DateTime.Utc,
  now: DateTime.Utc,
  policy: PublicationPolicy = defaultPublicationPolicy
): boolean =>
  Duration.isGreaterThan(
    DateTime.distance(scheduledAt, now),
    policy.latenessLimit
  );
