import type { DateTime } from "effect";
import { Match, Option, Result, Schema } from "effect";

import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import type { PlatformPostId } from "#shared/domain/publish-result.ts";

import { InvalidTargetTransition } from "./invalid-target-transition.ts";
import type { TargetAction } from "./invalid-target-transition.ts";
import { LivePartSchema } from "./live-part.ts";
import type { LivePart } from "./live-part.ts";
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
 *
 * `liveParts` are the parts of the post that went live there, in order,
 * from the first (`./live-part.ts`): every part of a published target, and
 * those that went out before a part failed, was unconfirmed or was
 * cancelled. They are kept from round to round, so a repost sends the part
 * after the last of them, never one that is live. Targets published before
 * parts were kept list none (`livePartsOf`).
 */
export class PostTarget extends Schema.Class<PostTarget>(
  "peal-server/publishing/domain/PostTarget"
)({
  channelId: ChannelIdSchema,
  id: PostTargetIdSchema,
  liveParts: Schema.Array(LivePartSchema),
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
    liveParts: target.liveParts,
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
    liveParts: [],
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
    liveParts: target.liveParts,
    options,
    postId: target.postId,
    round: target.round,
    status: target.status,
  });

/** Whether the target's publication is over, one way or another. */
export const isSettled = (target: PostTarget): boolean =>
  target.status._tag !== "pending" && target.status._tag !== "publishing";

/**
 * The parts of the post live on the channel, in order. A target published
 * before parts were kept has its one part, as its status tells it.
 */
export const livePartsOf = (target: PostTarget): readonly LivePart[] => {
  const { liveParts, status } = target;

  return liveParts.length === 0 && status._tag === "published"
    ? [
        {
          index: 0,
          permalink: status.permalink,
          platformPostId: status.platformPostId,
          publishedAt: status.publishedAt,
          round: target.round,
        },
      ]
    : liveParts;
};

/**
 * The place of the part to send next: the one after the last that went
 * live, as parts go out in order.
 */
export const nextPartOf = (target: PostTarget): number =>
  target.liveParts.length;

/**
 * Records that the part at `index` went live while the target is sending.
 * Recording it again changes nothing, so a step run twice keeps one entry.
 */
export const recordLivePart = (
  target: PostTarget,
  part: LivePart
): Transition => {
  if (target.status._tag !== "publishing") {
    return rejected(target, "recordPart");
  }

  if (part.index < target.liveParts.length) {
    return Result.succeed(target);
  }

  return part.index === target.liveParts.length
    ? Result.succeed(
        new PostTarget({
          channelId: target.channelId,
          id: target.id,
          liveParts: [...target.liveParts, part],
          options: target.options,
          postId: target.postId,
          round: target.round,
          status: target.status,
        })
      )
    : rejected(target, "recordPart");
};

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

/**
 * Records how the attempts on the platform ended. A target whose parts all
 * went live is published as its first part: that part's id and address are
 * the post's. One that failed, was unconfirmed or was cancelled after some
 * parts keeps them in `liveParts`.
 */
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
      thumbnailNotSet,
    }): PostTargetStatus => {
      const [first] = target.liveParts;

      const live: PostTargetStatus = {
        _tag: "published",
        permalink: first?.permalink ?? Option.fromUndefinedOr(permalink),
        platformPostId: first?.platformPostId ?? Option.some(platformPostId),
        publishedAt: now,
      };

      let noted = live;

      if (keptPrivate === true) {
        noted = { ...noted, keptPrivate };
      }

      if (thumbnailNotSet === true) {
        noted = { ...noted, thumbnailNotSet };
      }

      return noted;
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
 * The user found an unconfirmed part on the platform. It went live during
 * the attempt, so it counts as live when the attempt was made, not when the
 * user checked. The platform's id for it is unknown unless the user gives
 * it, and its address unless they give that.
 *
 * When it was the last of the post's `parts`, the target is published, as
 * its first part. Otherwise the parts after it were never sent, and Peal
 * cannot send them: a part found by hand has no id the next could reply
 * to. The target fails as `partsNotSent` at `now`, which no repost takes
 * up (`isRepostable`): the member posts the rest on the platform.
 */
export const confirmPublished = (
  target: PostTarget,
  found: {
    readonly now: DateTime.Utc;
    /** How many parts the post has on the channel. */
    readonly parts: number;
    readonly permalink: Option.Option<string>;
    readonly platformPostId: Option.Option<PlatformPostId>;
  }
): Transition => {
  const { status } = target;

  if (status._tag !== "unconfirmed") {
    return rejected(target, "confirmPublished");
  }

  const liveParts: readonly LivePart[] = [
    ...target.liveParts,
    {
      index: target.liveParts.length,
      permalink: found.permalink,
      platformPostId: found.platformPostId,
      publishedAt: status.attemptedAt,
      round: target.round,
    },
  ];

  const [first] = liveParts;

  const next: PostTargetStatus =
    liveParts.length >= found.parts
      ? {
          _tag: "published",
          permalink: first?.permalink ?? found.permalink,
          platformPostId: first?.platformPostId ?? found.platformPostId,
          publishedAt: status.attemptedAt,
        }
      : {
          _tag: "failed",
          code: Option.none(),
          failedAt: found.now,
          reason: "partsNotSent",
        };

  return Result.succeed(
    new PostTarget({
      channelId: target.channelId,
      id: target.id,
      liveParts,
      options: target.options,
      postId: target.postId,
      round: target.round,
      status: next,
    })
  );
};

/**
 * Whether a member may send the target again, in a new round: one that
 * failed or is unconfirmed, unless the round could only stop where this
 * one did. A round sends from the part after the last that is live, as a
 * reply to it: when Peal has no id for that part (found by hand), or the
 * target failed as `partsNotSent` (the part to reply to is gone), there is
 * nothing to send under; nor when the platform refuses this app replies
 * (`repliesNotAllowed`), which every round would meet again.
 */
export const isRepostable = (target: PostTarget): boolean => {
  const { status } = target;

  if (status._tag === "unconfirmed") {
    return true;
  }

  return (
    status._tag === "failed" &&
    status.reason !== "partsNotSent" &&
    status.reason !== "repliesNotAllowed" &&
    !Option.exists(Option.fromUndefinedOr(target.liveParts.at(-1)), (last) =>
      Option.isNone(last.platformPostId)
    )
  );
};

/**
 * Sends a failed or unconfirmed target again: it waits, pending, in the next
 * round, which a new job sends. An unconfirmed one may be live already: the
 * member chose to send it again anyway, as after checking the platform. The
 * parts that went live stay live: the round sends the part after them.
 */
export const repostTarget = (target: PostTarget): Transition =>
  isRepostable(target)
    ? Result.succeed(
        new PostTarget({
          channelId: target.channelId,
          id: target.id,
          liveParts: target.liveParts,
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
