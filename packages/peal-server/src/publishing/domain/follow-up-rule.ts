import { DateTime, Duration, Option, Result, Schema } from "effect";

import {
  ChannelIdSchema,
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type {
  ChannelId,
  PostId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";

import { FollowUpEndReasonSchema } from "./follow-up-end-reason.ts";
import type { FollowUpEndReason } from "./follow-up-end-reason.ts";
import { FollowUpRuleEnded } from "./follow-up-rule-ended.ts";
import { FollowUpRuleIdSchema } from "./follow-up-rule-id.ts";
import type { FollowUpRuleId } from "./follow-up-rule-id.ts";
import { PostOriginSchema } from "./post-origin.ts";
import type { PostOrigin } from "./post-origin.ts";
import { isSettled } from "./post-target.ts";
import type { PostTarget } from "./post-target.ts";

// The limits below are the owner's to change: each is written once here,
// and the contract's copy is kept equal by a test.

/** The most rules a workspace keeps active or paused. */
export const maxFollowUpRulesPerWorkspace = 100;

/** The fewest likes a rule waits for. */
export const minLikesThreshold = 1;

/** The most likes a rule waits for. */
export const maxLikesThreshold = 1_000_000;

/**
 * How long after a post went live on a channel a rule still acts on it:
 * a post that has not reached the threshold by then never will be
 * followed up.
 */
export const followUpWindow = Duration.days(7);

/**
 * The most follow-ups a channel carries out a UTC day, every rule
 * together: those past it wait for the next day, within their window.
 */
export const maxFollowUpsPerChannelDay = 10;

/**
 * What a rule acts on: one post, on each of its channels where a follow-up
 * can go, or every post published on one channel after the rule started.
 */
export const FollowUpScopeSchema = Schema.Union([
  Schema.TaggedStruct("post", { postId: PostIdSchema }),
  Schema.TaggedStruct("channel", { channelId: ChannelIdSchema }),
]);

export type FollowUpScope = typeof FollowUpScopeSchema.Type;

/**
 * Whether what a rule sends was approved, where the workspace's approval
 * policy holds its starter's posts: `notNeeded` when whoever wrote it may
 * publish without an approval, `pending` until a member who approves posts
 * approves it, `approved` once one did. A rule acts only when it is
 * approved, or when its starter's posts go out without an approval at the
 * moment it acts.
 */
export const FollowUpApprovalSchema = Schema.Union([
  Schema.TaggedStruct("notNeeded", {}),
  Schema.TaggedStruct("pending", {}),
  Schema.TaggedStruct("approved", {
    approvedAt: Schema.DateTimeUtc,
    // None once the member who approved it is forgotten (account closed).
    approvedBy: Schema.optionalKey(UserIdSchema),
  }),
]);

export type FollowUpApproval = typeof FollowUpApprovalSchema.Type;

/** Where a rule is: acting, paused by a member, or ended. */
export const FollowUpRuleStatusSchema = Schema.Union([
  Schema.TaggedStruct("active", {}),
  Schema.TaggedStruct("paused", { pausedAt: Schema.DateTimeUtc }),
  Schema.TaggedStruct("ended", {
    endedAt: Schema.DateTimeUtc,
    reason: FollowUpEndReasonSchema,
  }),
]);

export type FollowUpRuleStatus = typeof FollowUpRuleStatusSchema.Type;

/**
 * A follow-up rule: once a post it acts on has `likes` likes on a channel,
 * as analytics last counted them, Peal publishes the follow-up `comment`
 * under it (the account's own reply, as a thread's next part), reposts it
 * (`repost`), or both, once, from the channel's own account, within
 * `followUpWindow` of the post going live there.
 *
 * It acts as whoever started it, with what they may do when it acts:
 * `startedBy` is the member (none for a key) and `startedVia` how they
 * reached Peal, as a post keeps it.
 */
export class FollowUpRule extends Schema.Class<FollowUpRule>(
  "peal-server/publishing/domain/FollowUpRule"
)({
  approval: FollowUpApprovalSchema,
  comment: Schema.Option(Schema.String),
  createdAt: Schema.DateTimeUtc,
  id: FollowUpRuleIdSchema,
  likes: Schema.Int.check(
    Schema.isBetween({ maximum: maxLikesThreshold, minimum: minLikesThreshold })
  ),
  repost: Schema.Boolean,
  scope: FollowUpScopeSchema,
  startedBy: Schema.Option(UserIdSchema),
  startedVia: PostOriginSchema,
  status: FollowUpRuleStatusSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

type RuleFields = ConstructorParameters<typeof FollowUpRule>[0];

const changed = (
  rule: FollowUpRule,
  fields: Partial<RuleFields>
): FollowUpRule =>
  new FollowUpRule({
    approval: rule.approval,
    comment: rule.comment,
    createdAt: rule.createdAt,
    id: rule.id,
    likes: rule.likes,
    repost: rule.repost,
    scope: rule.scope,
    startedBy: rule.startedBy,
    startedVia: rule.startedVia,
    status: rule.status,
    workspaceId: rule.workspaceId,
    ...fields,
  });

/** What starts a rule. */
export interface NewFollowUpRule {
  readonly comment: Option.Option<string>;
  readonly id: FollowUpRuleId;
  readonly likes: number;
  /** Whether the starter's posts wait for an approval now. */
  readonly needsApproval: boolean;
  readonly repost: boolean;
  readonly scope: FollowUpScope;
  readonly startedBy: Option.Option<UserId>;
  readonly startedVia: PostOrigin;
  readonly workspaceId: WorkspaceId;
}

/** A new rule, acting from `now`. */
export const startFollowUpRule = (
  request: NewFollowUpRule,
  now: DateTime.Utc
): FollowUpRule =>
  new FollowUpRule({
    approval: request.needsApproval
      ? { _tag: "pending" }
      : { _tag: "notNeeded" },
    comment: request.comment,
    createdAt: now,
    id: request.id,
    likes: request.likes,
    repost: request.repost,
    scope: request.scope,
    startedBy: request.startedBy,
    startedVia: request.startedVia,
    status: { _tag: "active" },
    workspaceId: request.workspaceId,
  });

/** What a member changes of a rule: each left out stays as it is. */
export interface FollowUpChange {
  readonly comment?: Option.Option<string>;
  readonly likes?: number;
  readonly repost?: boolean;
  /** True pauses it, false sets a paused rule going again. */
  readonly paused?: boolean;
}

const ended = (rule: FollowUpRule) =>
  rule.status._tag === "ended"
    ? Result.fail(
        new FollowUpRuleEnded({ reason: rule.status.reason, ruleId: rule.id })
      )
    : Result.succeed(rule);

const sameText = (left: Option.Option<string>, right: Option.Option<string>) =>
  Option.getOrUndefined(left) === Option.getOrUndefined(right);

// Where a rule is once a member paused it (true), set it going (false) or
// said nothing of it: a rule paused again keeps when it was first paused.
const pausedAs = (
  status: FollowUpRuleStatus,
  paused: boolean | undefined,
  now: DateTime.Utc
): FollowUpRuleStatus => {
  if (paused === undefined) {
    return status;
  }

  if (!paused) {
    return { _tag: "active" };
  }

  return status._tag === "paused" ? status : { _tag: "paused", pausedAt: now };
};

/** Who changes a rule, as its approval reads them. */
export interface FollowUpChanger {
  /** A member, in person, who approves posts: none otherwise. */
  readonly approver: Option.Option<UserId>;
  /** Whether the approval policy holds their posts. */
  readonly held: boolean;
}

// What a change of what the rule sends makes of its approval: approved by
// a member who approves posts and is not held, waiting otherwise, as the
// rule acts as its starter, whose posts may be held whoever changes it.
const approvalAfter = (
  changer: FollowUpChanger,
  now: DateTime.Utc
): FollowUpApproval =>
  Option.match(changer.held ? Option.none() : changer.approver, {
    onNone: () => ({ _tag: "pending" }),
    onSome: (approvedBy) => ({ _tag: "approved", approvedAt: now, approvedBy }),
  });

/**
 * The rule as a member changed it. What it sends changing (its comment, or
 * whether it reposts) is approved by whoever changed it when they approve
 * posts in person and the policy does not hold them, and waits for an
 * approval otherwise (`approvalAfter`). A threshold changed, or a pause, keeps the
 * approval as it was. An ended rule changes no more.
 */
export const changeFollowUpRule = (
  rule: FollowUpRule,
  change: FollowUpChange,
  changer: FollowUpChanger,
  now: DateTime.Utc
): Result.Result<FollowUpRule, FollowUpRuleEnded> =>
  Result.map(ended(rule), (open) => {
    const comment = change.comment ?? open.comment;
    const repost = change.repost ?? open.repost;

    const sends =
      !sameText(comment, open.comment) || repost !== open.repost
        ? { approval: approvalAfter(changer, now) }
        : {};

    const status = pausedAs(open.status, change.paused, now);

    return changed(open, {
      ...sends,
      comment,
      likes: change.likes ?? open.likes,
      repost,
      status,
    });
  });

/**
 * The rule approved by `by` at `now`, whatever its approval was: one that
 * needed none may come to need one, when the policy starts holding its
 * starter's posts. An ended rule changes no more.
 */
export const approveFollowUpRule = (
  rule: FollowUpRule,
  by: UserId,
  now: DateTime.Utc
): Result.Result<FollowUpRule, FollowUpRuleEnded> =>
  Result.map(ended(rule), (open) =>
    open.approval._tag === "approved"
      ? open
      : changed(open, {
          approval: { _tag: "approved", approvedAt: now, approvedBy: by },
        })
  );

/** The rule ended at `now` for `reason`; an ended one stays as it ended. */
export const endFollowUpRule = (
  rule: FollowUpRule,
  reason: FollowUpEndReason,
  now: DateTime.Utc
): FollowUpRule =>
  rule.status._tag === "ended"
    ? rule
    : changed(rule, { status: { _tag: "ended", endedAt: now, reason } });

/** The rule once whoever started it is forgotten (their account closed). */
export const withoutStarter = (rule: FollowUpRule): FollowUpRule =>
  changed(rule, { startedBy: Option.none() });

/**
 * Whether what the rule sends may go out now: approved, or needing no
 * approval as its starter's posts go out without one (`starterHeld`,
 * asked of the approval gate as they are now).
 */
export const mayAct = (rule: FollowUpRule, starterHeld: boolean): boolean =>
  rule.approval._tag === "approved" || !starterHeld;

/**
 * Whether nothing of the target can still be followed up by a post's rule
 * at `now`: out, cancelled, or a failure (or an outcome never confirmed)
 * older than `followUpWindow`, past which a member sending it again is not
 * waited for. A younger one may still be sent again, and go out.
 */
export const isDoneFor = (target: PostTarget, now: DateTime.Utc): boolean => {
  const { status } = target;

  if (status._tag === "failed" || status._tag === "unconfirmed") {
    const since =
      status._tag === "failed" ? status.failedAt : status.attemptedAt;

    return !DateTime.isLessThan(
      now,
      DateTime.addDuration(since, followUpWindow)
    );
  }

  return isSettled(target);
};

/** The instant until which a rule acts on a post live since `publishedAt`. */
export const actsUntil = (publishedAt: DateTime.Utc): DateTime.Utc =>
  DateTime.addDuration(publishedAt, followUpWindow);

/** Whether the rule acts on posts published on `channelId`. */
export const actsOnChannel = (
  rule: FollowUpRule,
  channelId: ChannelId
): boolean =>
  rule.scope._tag === "channel" && rule.scope.channelId === channelId;

/** Whether the rule acts on the post `postId`. */
export const actsOnPost = (rule: FollowUpRule, postId: PostId): boolean =>
  rule.scope._tag === "post" && rule.scope.postId === postId;
