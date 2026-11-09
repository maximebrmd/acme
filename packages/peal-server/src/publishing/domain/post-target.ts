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
import { TargetOptionsSchema } from "./target-options.ts";
import type { TargetOptions } from "./target-options.ts";
import type { TargetSettlement } from "./target-settlement.ts";

/**
 * A post on one of its channels, and where its publication there is:
 *
 * | From        | To                                             |
 * | ----------- | ---------------------------------------------- |
 * | pending     | publishing, cancelled, failed (missed)         |
 * | publishing  | published, failed, unconfirmed, cancelled      |
 * | unconfirmed | published or failed, once the user has checked; |
 * |             | pending again, reposted                          |
 * | published   | nothing                                        |
 * | failed      | pending again, reposted                        |
 * | cancelled   | nothing                                        |
 *
 * `round` counts the times it was sent: a repost after an unconfirmed or
 * failed round starts the next one, so a job left from an earlier round
 * cannot act on it.
 *
 * `options` are what the post says on the channel that only its platform
 * knows (`./target-options.ts`), none on most platforms. Like the post's
 * content, they change only while it is a draft.
 */
export class PostTarget extends Schema.Class<PostTarget>(
  "peal-server/publishing/domain/PostTarget"
)({
  channelId: ChannelIdSchema,
  id: PostTargetIdSchema,
  options: Schema.Option(TargetOptionsSchema),
  postId: PostIdSchema,
  round: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  status: PostTargetStatusSchema,
}) {}

type Transition = Result.Result<PostTarget, InvalidTargetTransition>;

const withStatus = (target: PostTarget, status: PostTargetStatus): PostTarget =>
  new PostTarget({
    channelId: target.channelId,
    id: target.id,
    options: target.options,
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
  channelId: ChannelId,
  options: Option.Option<TargetOptions> = Option.none()
): PostTarget =>
  new PostTarget({
    channelId,
    id,
    options,
    postId,
    round: 1,
    status: { _tag: "pending" },
  });

/**
 * The target with other options. Only a draft's targets change them, and
 * they are all pending.
 */
export const withOptions = (
  target: PostTarget,
  options: Option.Option<TargetOptions>
): PostTarget =>
  new PostTarget({
    channelId: target.channelId,
    id: target.id,
    options,
    postId: target.postId,
    round: target.round,
    status: target.status,
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
    published: ({
      keptPrivate,
      permalink,
      platformPostId,
    }): PostTargetStatus => {
      const live: PostTargetStatus = {
        _tag: "published",
        permalink: Option.fromUndefinedOr(permalink),
        platformPostId: Option.some(platformPostId),
        publishedAt: now,
      };

      return keptPrivate === true ? { ...live, keptPrivate } : live;
    },
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
 * user checked. The platform's id for it is unknown unless the user gives it,
 * and its address unless they give that.
 */
export const confirmPublished = (
  target: PostTarget,
  platformPostId: Option.Option<PlatformPostId>,
  permalink: Option.Option<string> = Option.none()
): Transition => {
  const { status } = target;

  if (status._tag !== "unconfirmed") {
    return rejected(target, "confirmPublished");
  }

  return Result.succeed(
    withStatus(target, {
      _tag: "published",
      permalink,
      platformPostId,
      publishedAt: status.attemptedAt,
    })
  );
};

/** Whether a member may send the target again, in a new round. */
export const isRepostable = (target: PostTarget): boolean =>
  target.status._tag === "failed" || target.status._tag === "unconfirmed";

/**
 * Sends a failed or unconfirmed target again: it waits, pending, in the next
 * round, which a new job sends. An unconfirmed one may be live already: the
 * member chose to send it again anyway, as after checking the platform.
 */
export const repostTarget = (target: PostTarget): Transition =>
  isRepostable(target)
    ? Result.succeed(
        new PostTarget({
          channelId: target.channelId,
          id: target.id,
          options: target.options,
          postId: target.postId,
          round: target.round + 1,
          status: { _tag: "pending" },
        })
      )
    : rejected(target, "repost");

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
