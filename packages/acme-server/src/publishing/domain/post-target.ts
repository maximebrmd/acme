import type { DateTime } from "effect";
import { Match, Option, Result, Schema } from "effect";

import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import type { PlatformPostId } from "#shared/domain/publish-result.ts";

import { InvalidTargetTransition } from "./invalid-target-transition.ts";
import type { TargetAction } from "./invalid-target-transition.ts";
import { PostTargetIdSchema } from "./post-target-id.ts";
import type { PostTargetId } from "./post-target-id.ts";
import { PostTargetStatusSchema } from "./post-target-status.ts";
import type { PostTargetStatus } from "./post-target-status.ts";
import type { TargetSettlement } from "./target-settlement.ts";

/**
 * A post on one of its channels, and where its publication there is:
 *
 * | From        | To                                             |
 * | ----------- | ---------------------------------------------- |
 * | pending     | publishing, cancelled, failed (missed)         |
 * | publishing  | published, failed, unconfirmed, cancelled      |
 * | unconfirmed | published or failed, once the user has checked |
 * | published   | nothing                                        |
 * | failed      | nothing                                        |
 * | cancelled   | nothing                                        |
 *
 * `round` counts the times it was sent: a repost after an unconfirmed or
 * failed round will start the next one, so a job left from an earlier round
 * cannot act on it.
 */
export class PostTarget extends Schema.Class<PostTarget>(
  "acme-server/publishing/domain/PostTarget"
)({
  channelId: ChannelIdSchema,
  id: PostTargetIdSchema,
  postId: PostIdSchema,
  round: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  status: PostTargetStatusSchema,
}) {}

type Transition = Result.Result<PostTarget, InvalidTargetTransition>;

const withStatus = (target: PostTarget, status: PostTargetStatus): PostTarget =>
  new PostTarget({
    channelId: target.channelId,
    id: target.id,
    postId: target.postId,
    round: target.round,
    status,
  });

const rejected = (
  target: PostTarget,
  action: TargetAction
): Result.Result<never, InvalidTargetTransition> =>
  Result.fail(
    new InvalidTargetTransition({
      action,
      from: target.status._tag,
      targetId: target.id,
    })
  );

/** A new target, waiting for its post's scheduled time. */
export const createTarget = (
  id: PostTargetId,
  postId: PostId,
  channelId: ChannelId
): PostTarget =>
  new PostTarget({
    channelId,
    id,
    postId,
    round: 1,
    status: { _tag: "pending" },
  });

/** Whether the target's publication is over, one way or another. */
export const isSettled = (target: PostTarget): boolean =>
  target.status._tag !== "pending" && target.status._tag !== "publishing";

/** Starts sending a pending target. */
export const startTarget = (
  target: PostTarget,
  now: DateTime.Utc
): Transition =>
  target.status._tag === "pending"
    ? Result.succeed(
        withStatus(target, {
          _tag: "publishing",
          cancelRequested: false,
          startedAt: now,
        })
      )
    : rejected(target, "start");

/** Records how the attempts on the platform ended. */
export const settleTarget = (
  target: PostTarget,
  settlement: TargetSettlement,
  now: DateTime.Utc
): Transition => {
  const { status } = target;

  if (status._tag !== "publishing") {
    return rejected(target, "settle");
  }

  const settled: PostTargetStatus = Match.valueTags(settlement, {
    cancelled: (): PostTargetStatus => ({
      _tag: "cancelled",
      cancelledAt: now,
    }),
    failed: ({ code, reason }): PostTargetStatus => ({
      _tag: "failed",
      code: Option.fromUndefinedOr(code),
      failedAt: now,
      reason,
    }),
    published: ({ permalink, platformPostId }): PostTargetStatus => ({
      _tag: "published",
      permalink: Option.fromUndefinedOr(permalink),
      platformPostId: Option.some(platformPostId),
      publishedAt: now,
    }),
    unconfirmed: ({ attemptedAt, reason }): PostTargetStatus => ({
      _tag: "unconfirmed",
      attemptedAt: attemptedAt ?? status.startedAt,
      reason,
    }),
  });

  return Result.succeed(withStatus(target, settled));
};

/** Whether no new attempt may start on the target. */
export const isCancelRequested = (target: PostTarget): boolean =>
  target.status._tag === "publishing" && target.status.cancelRequested;

/** The post came too late to send: the target fails without an attempt. */
export const missTarget = (target: PostTarget, now: DateTime.Utc): Transition =>
  target.status._tag === "pending"
    ? Result.succeed(
        withStatus(target, {
          _tag: "failed",
          code: Option.none(),
          failedAt: now,
          reason: "missed",
        })
      )
    : rejected(target, "miss");

/**
 * Cancels a target. A pending one is cancelled at once. One already sending
 * keeps the attempt in flight, whose outcome still counts, and starts no
 * other: it is cancelled before its next attempt.
 */
export const cancelTarget = (
  target: PostTarget,
  now: DateTime.Utc
): Transition => {
  const { status } = target;

  if (status._tag === "pending") {
    return Result.succeed(
      withStatus(target, { _tag: "cancelled", cancelledAt: now })
    );
  }

  if (status._tag === "publishing") {
    return Result.succeed(
      withStatus(target, { ...status, cancelRequested: true })
    );
  }

  return rejected(target, "cancel");
};

/**
 * The user found an unconfirmed post on the platform. It went live during the
 * attempt, so it counts as published when the attempt was made, not when the
 * user checked. The platform's id for it is unknown unless the user gives it.
 */
export const confirmPublished = (
  target: PostTarget,
  platformPostId: Option.Option<PlatformPostId>
): Transition => {
  const { status } = target;

  if (status._tag !== "unconfirmed") {
    return rejected(target, "confirmPublished");
  }

  return Result.succeed(
    withStatus(target, {
      _tag: "published",
      permalink: Option.none(),
      platformPostId,
      publishedAt: status.attemptedAt,
    })
  );
};

/**
 * The user found no trace of an unconfirmed post on the platform: it failed,
 * and a repost can send it again.
 */
export const confirmNotPublished = (
  target: PostTarget,
  now: DateTime.Utc
): Transition =>
  target.status._tag === "unconfirmed"
    ? Result.succeed(
        withStatus(target, {
          _tag: "failed",
          code: Option.none(),
          failedAt: now,
          reason: "notPublished",
        })
      )
    : rejected(target, "confirmNotPublished");
