import { DateTime, Duration, Match, Schema } from "effect";

import type { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PublishFailureSchema } from "#shared/domain/publish-failure.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PublishResultSchema } from "#shared/domain/publish-result.ts";
import type { RateLimited } from "#shared/domain/rate-limited.ts";

import {
  isDailyLimit,
  isOperatorRefusal,
  ownRefusalCodes,
  platformRefusalCodes,
} from "./own-refusals.ts";
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
 * | PlatformUnavailable | the platform refuses the server's app until its    |
 * | with an operator    | operator pays: retry every 30 min, and give up     |
 * | code                | past 24 h after the scheduled time:                |
 * |                     | appBillingLimit                                    |
 * | RateLimited         | retry after the platform's delay (1 min if none),  |
 * |                     | kept between 1 s and 6 h; give up after 8 attempts |
 * |                     | or past 24 h after the scheduled time: rateLimited |
 * |                     | or, for a daily allowance, quotaExceeded           |
 * | TokenExpired        | give up: tokenExpired, and reconnect the channel   |
 * | MediaRejected       | give up: mediaRejected, or mediaRemoved when Peal  |
 * |                     | could not read the media (`./own-refusals.ts`)     |
 * | BadRequest          | give up: contentRejected, or channelDisconnected   |
 * |                     | and channelDisabled when Peal refused to use the   |
 * |                     | channel, appNotAudited when the platform refused   |
 * |                     | the server's app                                   |
 *
 * PlatformUnavailable and RateLimited each count only the attempts that
 * ended that way: a rate limit uses none of the unavailable retries, and the
 * other way round. An app refused for its billing counts for neither: the
 * operator can pay at any time, so only the deadline ends the wait, and an
 * outage after it still has its own retries.
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
  /**
   * While the platform refuses the server's app until its operator pays
   * for it (`operatorRefusalCodes`).
   */
  readonly operatorRefusal: {
    /** No retry starts later than this after the scheduled time. */
    readonly deadline: Duration.Duration;
    /** The wait before each retry: gentle, as only the operator ends it. */
    readonly delay: Duration.Duration;
  };
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
  operatorRefusal: {
    deadline: Duration.hours(24),
    delay: Duration.minutes(30),
  },
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
 * the attempt that just ended left out. `unavailable` leaves out the
 * attempts the platform refused for the app's billing.
 */
export interface EarlierRefusals {
  readonly rateLimited: number;
  readonly unavailable: number;
}

/**
 * Counts the refusals among a round's earlier attempts. An app refused for
 * its billing is no outage: it uses none of the outage's retries.
 */
export const earlierRefusalsOf = (
  outcomes: readonly AttemptOutcome[]
): EarlierRefusals => ({
  rateLimited: outcomes.filter(({ _tag }) => _tag === "RateLimited").length,
  unavailable: outcomes.filter(
    (outcome) =>
      outcome._tag === "PlatformUnavailable" && !isOperatorRefusal(outcome.code)
  ).length,
});

/** Where the attempt stands. */
export interface AttemptContext {
  readonly earlier: EarlierRefusals;
  /** From the scheduled time to the end of the attempt. */
  readonly sinceScheduled: Duration.Duration;
  /** When the attempt's call started: an unconfirmed post may be live since. */
  readonly startedAt: DateTime.Utc;
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

const unavailableReason = (code: string | undefined): RefusalReason =>
  isOperatorRefusal(code) ? "appBillingLimit" : "unavailable";

// The operator can pay at any moment, and the post is not at fault: it
// keeps trying, however many times, until the deadline.
const afterOperatorRefusal = (
  code: string | undefined,
  context: AttemptContext,
  policy: PublicationPolicy
): PublicationDecision => {
  const { deadline, delay } = policy.operatorRefusal;

  return Duration.isGreaterThan(
    Duration.sum(context.sinceScheduled, delay),
    deadline
  )
    ? giveUp("appBillingLimit", code)
    : retry(delay);
};

const afterUnavailable = (
  { code }: PlatformUnavailable,
  context: AttemptContext,
  policy: PublicationPolicy
): PublicationDecision => {
  if (isOperatorRefusal(code)) {
    return afterOperatorRefusal(code, context, policy);
  }

  const delay = policy.unavailableBackoff[context.earlier.unavailable];

  return delay === undefined ? giveUp("unavailable", code) : retry(delay);
};

const afterRateLimit = (
  { code, retryAfter }: RateLimited,
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
    ? giveUp(isDailyLimit(code) ? "quotaExceeded" : "rateLimited", code)
    : retry(delay);
};

/**
 * The reasons a refused attempt gives: those of a target that failed after
 * attempts, as no attempt is made when one is missed or found missing.
 */
export type RefusalReason = Exclude<FailureReason, "missed" | "notPublished">;

// A later part with nothing to reply to, whoever found so: the rest of
// the post cannot be sent, which is not the fault of its text.
const partRefusals: ReadonlySet<string> = new Set([
  ownRefusalCodes.partsNotSupported,
  ownRefusalCodes.replyTargetUnknown,
  platformRefusalCodes.replyTargetGone,
]);

const badRequestReason = (code: string): RefusalReason => {
  if (code === ownRefusalCodes.channelDisconnected) {
    return "channelDisconnected";
  }

  if (code === platformRefusalCodes.appNotAudited) {
    return "appNotAudited";
  }

  if (code === ownRefusalCodes.planLimit) {
    return "planLimit";
  }

  if (code === ownRefusalCodes.paymentMethodRequired) {
    return "paymentMethodRequired";
  }

  if (code === ownRefusalCodes.xCeilingReached) {
    return "xCeilingReached";
  }

  if (code === platformRefusalCodes.repliesNotAllowed) {
    return "repliesNotAllowed";
  }

  if (partRefusals.has(code)) {
    return "partsNotSent";
  }

  return code === ownRefusalCodes.channelDisabled
    ? "channelDisabled"
    : "contentRejected";
};

/**
 * Why a target fails when an attempt is refused this way, once nothing is
 * left to try: the platform's refusal, or Peal's own when it could not use
 * the channel or the media (see `./own-refusals.ts`).
 */
export const failureReasonOf = (failure: PublishFailure): RefusalReason =>
  Match.valueTags(failure, {
    BadRequest: ({ code }): RefusalReason => badRequestReason(code),
    MediaRejected: ({ code }): RefusalReason =>
      code === ownRefusalCodes.mediaRemoved ? "mediaRemoved" : "mediaRejected",
    PlatformUnavailable: ({ code }): RefusalReason => unavailableReason(code),
    RateLimited: ({ code }): RefusalReason =>
      isDailyLimit(code) ? "quotaExceeded" : "rateLimited",
    TokenExpired: (): RefusalReason => "tokenExpired",
  });

/** Decides what follows an attempt, from how it ended (see the table above). */
export const decide = (
  outcome: AttemptOutcome,
  context: AttemptContext,
  policy: PublicationPolicy = defaultPublicationPolicy
): PublicationDecision =>
  Match.valueTags(outcome, {
    BadRequest: (refusal) => giveUp(failureReasonOf(refusal), refusal.code),
    MediaRejected: (refusal) => giveUp(failureReasonOf(refusal), refusal.code),
    PlatformUnavailable: (refusal) =>
      afterUnavailable(refusal, context, policy),
    RateLimited: (refusal) => afterRateLimit(refusal, context, policy),
    TokenExpired: () => giveUp("tokenExpired"),
    published: (published) => settle(published),
    unconfirmed: ({ reason }) =>
      settle({ _tag: "unconfirmed", attemptedAt: context.startedAt, reason }),
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
