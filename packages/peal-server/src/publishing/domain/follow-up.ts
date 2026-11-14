import { DateTime, Duration, Option, Result, Schema } from "effect";

import {
  ChannelIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import {
  PlatformPostIdSchema,
  UnconfirmedReasonSchema,
} from "#shared/domain/publish-result.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

import { FollowUpIdSchema } from "./follow-up-id.ts";
import type { FollowUpId } from "./follow-up-id.ts";
import { FollowUpRuleIdSchema } from "./follow-up-rule-id.ts";
import type { FollowUpRuleId } from "./follow-up-rule-id.ts";
import { InvalidFollowUpTransition } from "./invalid-follow-up-transition.ts";
import { PostTargetIdSchema } from "./post-target-id.ts";
import type { PostTargetId } from "./post-target-id.ts";
import { FailureReasonSchema } from "./post-target-status.ts";
import { failureReasonOf } from "./publication-policy.ts";

/**
 * What a follow-up does: publish the rule's comment under the post, as the
 * account's own reply (`comment`), or repost the post (`repost`).
 * Stored: add a member, never rename or remove one.
 */
export const FollowUpKindSchema = Schema.Literals(["comment", "repost"]);

export type FollowUpKind = typeof FollowUpKindSchema.Type;

/**
 * Why a follow-up's window passed without it going out: the post never
 * reached the threshold (`belowThreshold`), it did while the rule was
 * paused (`paused`) or waited for an approval (`notApproved`), or the
 * channel's day was full each time it did (`dailyLimit`), the platform
 * put it off until the window ended (`windowEnded`), or its channel was
 * never connected again to carry it (`notGranted`).
 * Stored: add a member, never rename or remove one.
 */
export const FollowUpExpiryReasonSchema = Schema.Literals([
  "belowThreshold",
  "paused",
  "notApproved",
  "dailyLimit",
  "windowEnded",
  "notGranted",
]);

export type FollowUpExpiryReason = typeof FollowUpExpiryReasonSchema.Type;

/**
 * Why a follow-up was given up before it went out: its rule ended
 * (`ruleEnded`), its post is no longer on the platform or no longer
 * published there (`postGone`), or its channel can no longer carry it
 * (`unavailable`: disconnected, the permission withdrawn, the operator
 * turned it off), or a change took its kind off the rule (`notAsked`).
 * Stored: add a member, never rename or remove one.
 */
export const FollowUpCancelReasonSchema = Schema.Literals([
  "ruleEnded",
  "postGone",
  "unavailable",
  "notAsked",
]);

export type FollowUpCancelReason = typeof FollowUpCancelReasonSchema.Type;

const Likes = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

/**
 * Where a follow-up is: `armed`, waiting for the threshold until `until`;
 * `sending` once it was reached (`likes` as counted then), with
 * `attemptedAt` from when its call may have reached the platform, and its
 * window's end kept, to arm it again should the platform put it off;
 * `sent`, `failed` (the platform's or Peal's code, never words) or
 * `unconfirmed` (it may be live: never sent again); `expired` when its
 * window passed; `cancelled` when it was given up.
 */
export const FollowUpStatusSchema = Schema.Union([
  Schema.TaggedStruct("armed", {
    // Put off by the platform: not set out again before then.
    notBefore: Schema.optionalKey(Schema.DateTimeUtc),
    until: Schema.DateTimeUtc,
  }),
  // Its channel must be connected again to carry it (a Bluesky repost
  // before the account granted reposts): armed once it can, until `until`.
  Schema.TaggedStruct("waiting", { until: Schema.DateTimeUtc }),
  Schema.TaggedStruct("sending", {
    attemptedAt: Schema.Option(Schema.DateTimeUtc),
    likes: Likes,
    triggeredAt: Schema.DateTimeUtc,
    until: Schema.DateTimeUtc,
  }),
  Schema.TaggedStruct("sent", {
    likes: Likes,
    permalink: Schema.Option(Schema.String),
    platformPostId: PlatformPostIdSchema,
    sentAt: Schema.DateTimeUtc,
    triggeredAt: Schema.DateTimeUtc,
  }),
  Schema.TaggedStruct("failed", {
    code: Schema.Option(Schema.String),
    failedAt: Schema.DateTimeUtc,
    reason: FailureReasonSchema,
    likes: Likes,
    triggeredAt: Schema.DateTimeUtc,
  }),
  Schema.TaggedStruct("unconfirmed", {
    attemptedAt: Schema.DateTimeUtc,
    likes: Likes,
    reason: UnconfirmedReasonSchema,
    triggeredAt: Schema.DateTimeUtc,
  }),
  Schema.TaggedStruct("expired", {
    expiredAt: Schema.DateTimeUtc,
    reason: FollowUpExpiryReasonSchema,
  }),
  Schema.TaggedStruct("cancelled", {
    cancelledAt: Schema.DateTimeUtc,
    reason: FollowUpCancelReasonSchema,
  }),
]);

export type FollowUpStatus = typeof FollowUpStatusSchema.Type;

/**
 * What a rule armed on one published target: one comment or one repost,
 * at most one of each kind a target, whatever rules act on it, so a post
 * is never followed up twice the same way.
 */
export class FollowUp extends Schema.Class<FollowUp>(
  "peal-server/publishing/domain/FollowUp"
)({
  armedAt: Schema.DateTimeUtc,
  // How many times its threshold set it out: each its own job and its own
  // call, so one armed again after the platform put it off goes out.
  attempt: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  channelId: ChannelIdSchema,
  id: FollowUpIdSchema,
  kind: FollowUpKindSchema,
  postId: PostIdSchema,
  ruleId: FollowUpRuleIdSchema,
  status: FollowUpStatusSchema,
  targetId: PostTargetIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

type Transition = Result.Result<FollowUp, InvalidFollowUpTransition>;

const withStatus = (
  followUp: FollowUp,
  status: FollowUpStatus,
  attempt: number = followUp.attempt
): FollowUp =>
  new FollowUp({
    armedAt: followUp.armedAt,
    attempt,
    channelId: followUp.channelId,
    id: followUp.id,
    kind: followUp.kind,
    postId: followUp.postId,
    ruleId: followUp.ruleId,
    status,
    targetId: followUp.targetId,
    workspaceId: followUp.workspaceId,
  });

const refused = (followUp: FollowUp, action: string): Transition =>
  Result.fail(
    new InvalidFollowUpTransition({
      action,
      followUpId: followUp.id,
      from: followUp.status._tag,
    })
  );

/** What arms a follow-up on a target. */
export interface Arming {
  readonly channelId: (typeof ChannelIdSchema)["Type"];
  readonly id: FollowUpId;
  readonly kind: FollowUpKind;
  readonly postId: (typeof PostIdSchema)["Type"];
  readonly ruleId: FollowUpRuleId;
  readonly targetId: PostTargetId;
  /** The end of its window. */
  readonly until: DateTime.Utc;
  readonly workspaceId: (typeof WorkspaceIdSchema)["Type"];
}

/** A follow-up armed at `now`, waiting for its threshold until `until`. */
export const armFollowUp = (arming: Arming, now: DateTime.Utc): FollowUp =>
  new FollowUp({
    armedAt: now,
    attempt: 0,
    channelId: arming.channelId,
    id: arming.id,
    kind: arming.kind,
    postId: arming.postId,
    ruleId: arming.ruleId,
    status: { _tag: "armed", until: arming.until },
    targetId: arming.targetId,
    workspaceId: arming.workspaceId,
  });

/**
 * A follow-up its channel cannot carry until it is connected again,
 * kept at `now` so it is armed once the channel can.
 */
export const waitFollowUp = (arming: Arming, now: DateTime.Utc): FollowUp =>
  withStatus(armFollowUp(arming, now), {
    _tag: "waiting",
    until: arming.until,
  });

/** The channel can carry it now: armed for the rest of its window. */
export const grantFollowUp = (
  followUp: FollowUp,
  now: DateTime.Utc
): Transition =>
  followUp.status._tag === "waiting" &&
  DateTime.isLessThan(now, followUp.status.until)
    ? Result.succeed(
        withStatus(followUp, { _tag: "armed", until: followUp.status.until })
      )
    : refused(followUp, "grant");

/** Whether an armed follow-up's window passed at `now`. */
export const isPast = (followUp: FollowUp, now: DateTime.Utc): boolean =>
  (followUp.status._tag === "armed" || followUp.status._tag === "waiting") &&
  !DateTime.isLessThan(now, followUp.status.until);

/** Whether the platform put it off, and it waits until `notBefore`. */
export const isPutOff = (followUp: FollowUp, now: DateTime.Utc): boolean =>
  followUp.status._tag === "armed" &&
  followUp.status.notBefore !== undefined &&
  DateTime.isLessThan(now, followUp.status.notBefore);

/** The first wait after the platform puts a follow-up off. */
export const followUpPutOffFirst = Duration.minutes(10);

/** The longest wait, however many times it was put off. */
export const followUpPutOffMost = Duration.hours(6);

// How long a follow-up put off on its `attempt` waits: what the platform
// asked, and at least ten minutes doubled each attempt, six hours at most.
const putOffFor = (
  attempt: number,
  asked: Option.Option<Duration.Duration>
) => {
  const doubled = Duration.times(
    followUpPutOffFirst,
    2 ** Math.min(Math.max(attempt - 1, 0), 10)
  );

  const backOff = Duration.min(doubled, followUpPutOffMost);

  return Option.match(asked, {
    onNone: () => backOff,
    onSome: (wait) => Duration.max(wait, backOff),
  });
};

/** The threshold was reached at `now`, with `likes`: it is sent next. */
export const triggerFollowUp = (
  followUp: FollowUp,
  likes: number,
  now: DateTime.Utc
): Transition =>
  followUp.status._tag === "armed" &&
  !isPast(followUp, now) &&
  !isPutOff(followUp, now)
    ? Result.succeed(
        withStatus(
          followUp,
          {
            _tag: "sending",
            attemptedAt: Option.none(),
            likes,
            triggeredAt: now,
            until: followUp.status.until,
          },
          followUp.attempt + 1
        )
      )
    : refused(followUp, "trigger");

/** Whether a call for it may have reached the platform. */
export const wasAttempted = (followUp: FollowUp): boolean =>
  followUp.status._tag === "sending" &&
  Option.isSome(followUp.status.attemptedAt);

/**
 * The call sets out at `now`: committed before it, so a run that finds it
 * looks the follow-up up instead of sending it again.
 */
export const beginFollowUpCall = (
  followUp: FollowUp,
  now: DateTime.Utc
): Transition =>
  followUp.status._tag === "sending" &&
  Option.isNone(followUp.status.attemptedAt)
    ? Result.succeed(
        withStatus(followUp, {
          ...followUp.status,
          attemptedAt: Option.some(now),
        })
      )
    : refused(followUp, "begin");

/** How a call ended: what the platform answered, or its refusal. */
export type FollowUpCallOutcome =
  | { readonly _tag: "answered"; readonly result: PublishResult }
  | { readonly _tag: "refused"; readonly failure: PublishFailure };

// A refusal's code, as it is kept: the platform's own, never its words.
const codeOf = (failure: PublishFailure): Option.Option<string> =>
  failure._tag === "TokenExpired"
    ? Option.none()
    : Option.fromUndefinedOr(failure.code);

/**
 * Whether a refusal says to try again later, nothing having gone out: the
 * platform unreachable for now, or slowing the account down. A daily
 * allowance spent is not: it would fail again until the window ends.
 */
const isPassing = (failure: PublishFailure): boolean =>
  failure._tag === "PlatformUnavailable" ||
  (failure._tag === "RateLimited" &&
    failureReasonOf(failure) === "rateLimited");

/**
 * The follow-up as its call ended, at `now`: a refusal that passes (the
 * platform unreachable, a rate limit) arms it again until its window ends,
 * as nothing went out; any other fails it.
 */
export const settleFollowUp = (
  followUp: FollowUp,
  outcome: FollowUpCallOutcome,
  now: DateTime.Utc
): Transition => {
  const { status } = followUp;

  if (status._tag !== "sending") {
    return refused(followUp, "settle");
  }

  const { likes, triggeredAt, until } = status;
  const attemptedAt = Option.getOrElse(status.attemptedAt, () => now);

  if (outcome._tag === "refused") {
    return Result.succeed(
      withStatus(
        followUp,
        isPassing(outcome.failure)
          ? {
              _tag: "armed",
              notBefore: DateTime.addDuration(
                now,
                putOffFor(
                  followUp.attempt,
                  outcome.failure._tag === "RateLimited"
                    ? Option.fromUndefinedOr(outcome.failure.retryAfter)
                    : Option.none()
                )
              ),
              until,
            }
          : {
              _tag: "failed",
              code: codeOf(outcome.failure),
              failedAt: now,
              likes,
              reason: failureReasonOf(outcome.failure),
              triggeredAt,
            }
      )
    );
  }

  const { result } = outcome;

  return Result.succeed(
    withStatus(
      followUp,
      result._tag === "published"
        ? {
            _tag: "sent",
            likes,
            permalink: Option.fromUndefinedOr(result.permalink),
            platformPostId: result.platformPostId,
            sentAt: now,
            triggeredAt,
          }
        : {
            _tag: "unconfirmed",
            attemptedAt,
            likes,
            reason: result.reason,
            triggeredAt,
          }
    )
  );
};

/** The armed follow-up's window passed at `now`, for `reason`. */
export const expireFollowUp = (
  followUp: FollowUp,
  reason: FollowUpExpiryReason,
  now: DateTime.Utc
): Transition =>
  followUp.status._tag === "armed" || followUp.status._tag === "waiting"
    ? Result.succeed(
        withStatus(followUp, { _tag: "expired", expiredAt: now, reason })
      )
    : refused(followUp, "expire");

/**
 * The follow-up given up at `now`, for `reason`: one armed, or one about
 * to be sent whose call has not set out.
 */
export const cancelFollowUp = (
  followUp: FollowUp,
  reason: FollowUpCancelReason,
  now: DateTime.Utc
): Transition =>
  followUp.status._tag === "armed" ||
  followUp.status._tag === "waiting" ||
  (followUp.status._tag === "sending" && !wasAttempted(followUp))
    ? Result.succeed(
        withStatus(followUp, { _tag: "cancelled", cancelledAt: now, reason })
      )
    : refused(followUp, "cancel");

/** Whether it is over, one way or another. */
export const isOver = (followUp: FollowUp): boolean =>
  followUp.status._tag !== "armed" &&
  followUp.status._tag !== "sending" &&
  followUp.status._tag !== "waiting";
