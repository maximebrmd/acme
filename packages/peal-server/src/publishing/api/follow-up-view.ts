import { Match, Option } from "effect";
import type {
  FollowUp as FollowUpView,
  FollowUpRule as FollowUpRuleView,
} from "peal-contract";

import type { ListedFollowUpRule } from "#publishing/application/follow-up-rules.ts";
import type { FollowUp } from "#publishing/domain/follow-up.ts";

import { originView } from "./recycling-view.ts";

// What a follow-up's state says, field by field: null where it says none.
const stateOf = (followUp: FollowUp) =>
  Match.valueTags(followUp.status, {
    armed: ({ notBefore, until }) => ({
      likes: null,
      notBefore: notBefore ?? null,
      permalink: null,
      platformPostId: null,
      reason: null,
      sentAt: null,
      triggeredAt: null,
      until,
    }),
    waiting: ({ until }) => ({
      likes: null,
      notBefore: null,
      permalink: null,
      platformPostId: null,
      reason: null,
      sentAt: null,
      triggeredAt: null,
      until,
    }),
    cancelled: ({ reason }) => ({
      likes: null,
      notBefore: null,
      permalink: null,
      platformPostId: null,
      reason,
      sentAt: null,
      triggeredAt: null,
      until: null,
    }),
    expired: ({ reason }) => ({
      likes: null,
      notBefore: null,
      permalink: null,
      platformPostId: null,
      reason,
      sentAt: null,
      triggeredAt: null,
      until: null,
    }),
    failed: ({ code, likes, reason, triggeredAt }) => ({
      likes,
      notBefore: null,
      permalink: null,
      platformPostId: null,
      reason: Option.getOrElse(code, () => reason),
      sentAt: null,
      triggeredAt,
      until: null,
    }),
    sending: ({ likes, triggeredAt }) => ({
      likes,
      notBefore: null,
      permalink: null,
      platformPostId: null,
      reason: null,
      sentAt: null,
      triggeredAt,
      until: null,
    }),
    sent: ({ likes, permalink, platformPostId, sentAt, triggeredAt }) => ({
      likes,
      notBefore: null,
      permalink: Option.getOrNull(permalink),
      platformPostId,
      reason: null,
      sentAt,
      triggeredAt,
      until: null,
    }),
    unconfirmed: ({ likes, reason, triggeredAt }) => ({
      likes,
      notBefore: null,
      permalink: null,
      platformPostId: null,
      reason,
      sentAt: null,
      triggeredAt,
      until: null,
    }),
  });

/** What clients see of what a rule armed. */
export const followUpView = (followUp: FollowUp): FollowUpView => ({
  ...stateOf(followUp),
  armedAt: followUp.armedAt,
  channelId: followUp.channelId,
  id: followUp.id,
  kind: followUp.kind,
  postId: followUp.postId,
  status: followUp.status._tag,
  targetId: followUp.targetId,
});

/** What clients see of a rule, its channels and what it did. */
export const followUpRuleView = ({
  channels,
  followUps,
  rule,
}: ListedFollowUpRule): FollowUpRuleView => ({
  approval: rule.approval._tag,
  approvedAt:
    rule.approval._tag === "approved" ? rule.approval.approvedAt : null,
  approvedBy:
    rule.approval._tag === "approved"
      ? (rule.approval.approvedBy ?? null)
      : null,
  channelId: rule.scope._tag === "channel" ? rule.scope.channelId : null,
  channels: channels.map(({ channelId, comment, platform, repost }) => ({
    channelId,
    comment,
    platform,
    repost,
  })),
  comment: Option.getOrNull(rule.comment),
  createdAt: rule.createdAt,
  endedReason: rule.status._tag === "ended" ? rule.status.reason : null,
  followUps: followUps.map(followUpView),
  id: rule.id,
  likes: rule.likes,
  postId: rule.scope._tag === "post" ? rule.scope.postId : null,
  repost: rule.repost,
  startedBy: Option.getOrNull(rule.startedBy),
  startedVia: originView(rule.startedVia),
  status: rule.status._tag,
});
