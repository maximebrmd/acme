import { Match, Result, Schema } from "effect";
import type { DateTime } from "effect";

import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";

import type { InvalidPostTransition } from "./invalid-post-transition.ts";
import type { InvalidTargetTransition } from "./invalid-target-transition.ts";
import type { PostNotDue } from "./post-not-due.ts";
import { PostOutcomeSchema } from "./post-status.ts";
import { PostTargetIdSchema } from "./post-target-id.ts";
import type { PostTargetStatus } from "./post-target-status.ts";
import { startTarget } from "./post-target.ts";
import type { PostTarget } from "./post-target.ts";
import { startPublishing } from "./post.ts";
import type { Post } from "./post.ts";
import { defaultPublicationPolicy, isTooLate } from "./publication-policy.ts";
import type { PublicationPolicy } from "./publication-policy.ts";

// When the job for a post wakes at its time, it claims the post, then each
// target, before sending anything. A claim reads the post as it is now, so a
// job left from an earlier schedule, or for a cancelled post, stops there.
//
// The schemas below are results that workflows store in their history:
// members and fields may be added but never renamed or removed.

/** How a target's job ended. */
export const TargetOutcomeSchema = Schema.Literals([
  "published",
  "unconfirmed",
  "failed",
  "cancelled",
  // The target was sent again in a later round, which this job is not.
  "superseded",
]);

export type TargetOutcome = typeof TargetOutcomeSchema.Type;

/** How a post's job ended: the post's outcome, or superseded. */
export const PostRunOutcomeSchema = Schema.Literals([
  ...PostOutcomeSchema.literals,
  // The post was rescheduled, moved to draft or cancelled before its time.
  "superseded",
]);

export type PostRunOutcome = typeof PostRunOutcomeSchema.Type;

/** What the post's job found when it woke. */
export const PostClaimSchema = Schema.Union([
  // The post is publishing: send each of these targets, in its round.
  Schema.TaggedStruct("claimed", {
    targets: Schema.Array(
      Schema.Struct({ round: Schema.Int, targetId: PostTargetIdSchema })
    ),
  }),
  // The post has another revision now, or went back to draft.
  Schema.TaggedStruct("superseded", {}),
  Schema.TaggedStruct("cancelled", {}),
  // The job woke too late after downtime: every target was marked missed.
  Schema.TaggedStruct("missed", {}),
]);

export type PostClaim = typeof PostClaimSchema.Type;

/** What a target's job found when it started. */
export const TargetClaimSchema = Schema.Union([
  // The target is sending in this round, for the post scheduled at
  // `scheduledAt` on `channelId`.
  Schema.TaggedStruct("claimed", {
    channelId: ChannelIdSchema,
    postId: PostIdSchema,
    scheduledAt: Schema.DateTimeUtc,
  }),
  Schema.TaggedStruct("superseded", {}),
  Schema.TaggedStruct("cancelled", {}),
  // An earlier run of this round already settled it.
  Schema.TaggedStruct("settled", { outcome: TargetOutcomeSchema }),
]);

export type TargetClaim = typeof TargetClaimSchema.Type;

/** What claiming a post decides, before it is saved. */
export type PostClaimDecision =
  | { readonly _tag: "cancelled" }
  // Publishing already started for this revision: an earlier run claimed it.
  | { readonly _tag: "resume" }
  | { readonly _tag: "superseded" }
  // Publishing starts now, with `post` publishing.
  | { readonly _tag: "start"; readonly post: Post }
  // Too late: `post` is publishing, and its targets are to be marked missed.
  | { readonly _tag: "miss"; readonly post: Post };

/**
 * Decides what the job started for `revision` does when it wakes at `now`.
 * A job only wakes at or after the post's time, so `PostNotDue` is a bug.
 */
export const claimPost = (
  post: Post,
  revision: number,
  now: DateTime.Utc,
  policy: PublicationPolicy = defaultPublicationPolicy
): Result.Result<PostClaimDecision, InvalidPostTransition | PostNotDue> => {
  const { status } = post;

  if (status._tag === "cancelled") {
    return Result.succeed({ _tag: "cancelled" });
  }

  if (post.scheduleRevision !== revision) {
    return Result.succeed({ _tag: "superseded" });
  }

  return Match.valueTags(status, {
    draft: () => Result.succeed<PostClaimDecision>({ _tag: "superseded" }),
    finished: () => Result.succeed<PostClaimDecision>({ _tag: "resume" }),
    publishing: () => Result.succeed<PostClaimDecision>({ _tag: "resume" }),
    scheduled: ({ schedule }) =>
      startPublishing(post, now).pipe(
        Result.map((publishing): PostClaimDecision =>
          isTooLate(schedule.at, now, policy)
            ? { _tag: "miss", post: publishing }
            : { _tag: "start", post: publishing }
        )
      ),
  });
};

/** The outcome a settled target's status stands for. */
export const targetOutcomeOf = (
  status: Exclude<PostTargetStatus, { readonly _tag: "pending" | "publishing" }>
): TargetOutcome => status._tag;

/** What claiming a target decides, before it is saved. */
export type TargetClaimDecision =
  | { readonly _tag: "cancelled" }
  // This round already claimed it: an earlier run stopped while sending.
  | { readonly _tag: "resume" }
  | { readonly _tag: "settled"; readonly outcome: TargetOutcome }
  | { readonly _tag: "start"; readonly target: PostTarget }
  | { readonly _tag: "superseded" };

/** Decides what the job for `round` of a target does when it starts. */
export const claimTarget = (
  target: PostTarget,
  round: number,
  now: DateTime.Utc
): Result.Result<TargetClaimDecision, InvalidTargetTransition> => {
  const { status } = target;

  if (target.round !== round) {
    return Result.succeed({ _tag: "superseded" });
  }

  return Match.valueTags(status, {
    cancelled: () => Result.succeed<TargetClaimDecision>({ _tag: "cancelled" }),
    failed: () =>
      Result.succeed<TargetClaimDecision>({
        _tag: "settled",
        outcome: "failed",
      }),
    pending: () =>
      startTarget(target, now).pipe(
        Result.map((started): TargetClaimDecision => ({
          _tag: "start",
          target: started,
        }))
      ),
    published: () =>
      Result.succeed<TargetClaimDecision>({
        _tag: "settled",
        outcome: "published",
      }),
    publishing: () => Result.succeed<TargetClaimDecision>({ _tag: "resume" }),
    unconfirmed: () =>
      Result.succeed<TargetClaimDecision>({
        _tag: "settled",
        outcome: "unconfirmed",
      }),
  });
};
