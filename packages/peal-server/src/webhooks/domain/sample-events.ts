import { DateTime } from "effect";

import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  Uuid7Schema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { SubscribableEventType } from "./webhook-event-type.ts";
import type { WebhookEvent } from "./webhook-event.ts";

// The made-up events a member sends to try an endpoint with one type: the
// type's real shape, ids that name nothing (`00000000-0000-7000-8000-…`),
// and the workspace's own id. Every subscribable type has one, so a new
// type does not compile until it has its sample; the contract's test
// decodes each as a payload. Receivers are told by `sample: true` never to
// act on one.

const synthetic = (n: number) =>
  `00000000-0000-7000-8000-${n.toString(16).padStart(12, "0")}`;

const postId = PostIdSchema.make(synthetic(1));
const targetId = PostTargetIdSchema.make(synthetic(2));
const channelId = ChannelIdSchema.make(synthetic(3));
const otherTargetId = PostTargetIdSchema.make(synthetic(4));
const otherChannelId = ChannelIdSchema.make(synthetic(5));
const mediaId = MediaAssetIdSchema.make(synthetic(6));
const threadId = Uuid7Schema.make(synthetic(7));
const commentId = Uuid7Schema.make(synthetic(8));
const replyId = Uuid7Schema.make(synthetic(9));

const at = DateTime.makeUnsafe("2026-01-01T09:00:00Z");

const targets = [
  { channelId, platform: "mastodon" as const, targetId },
  {
    channelId: otherChannelId,
    platform: "bluesky" as const,
    targetId: otherTargetId,
  },
];

const onChannel = (workspaceId: WorkspaceId) => ({
  channelId,
  parts: { count: 1, live: 1 },
  platform: "mastodon" as const,
  postId,
  round: 1,
  targetId,
  workspaceId,
});

const comment = (workspaceId: WorkspaceId) => ({
  channelId,
  commentId,
  postId,
  threadId,
  workspaceId,
});

const boost = (workspaceId: WorkspaceId, state: string) => ({
  adAccountId: "act_synthetic_1",
  boostId: synthetic(10),
  budget: { amount: 5000, kind: "total" as const },
  committed: 5000,
  currency: "EUR",
  endsAt: DateTime.add(at, { days: 7 }),
  postId,
  reason: null,
  state,
  workspaceId,
});

type Samples = {
  readonly [Type in SubscribableEventType]: (
    workspaceId: WorkspaceId
  ) => Extract<WebhookEvent, { readonly type: Type }>;
};

const samples: Samples = {
  "boost.budget_reached": (workspaceId) => ({
    data: boost(workspaceId, "active"),
    type: "boost.budget_reached",
  }),
  "boost.ended": (workspaceId) => ({
    data: boost(workspaceId, "ended"),
    type: "boost.ended",
  }),
  "boost.failed": (workspaceId) => ({
    data: {
      ...boost(workspaceId, "failed"),
      committed: 0,
      reason: "budgetTooLow",
    },
    type: "boost.failed",
  }),
  "boost.paused": (workspaceId) => ({
    data: boost(workspaceId, "paused"),
    type: "boost.paused",
  }),
  "boost.resumed": (workspaceId) => ({
    data: boost(workspaceId, "active"),
    type: "boost.resumed",
  }),
  "boost.started": (workspaceId) => ({
    data: boost(workspaceId, "active"),
    type: "boost.started",
  }),
  "boost.stopped": (workspaceId) => ({
    data: boost(workspaceId, "stopped"),
    type: "boost.stopped",
  }),
  "boost.unconfirmed": (workspaceId) => ({
    data: boost(workspaceId, "unconfirmed"),
    type: "boost.unconfirmed",
  }),
  "channel.connected": (workspaceId) => ({
    data: { channelId, platform: "mastodon", reconnected: false, workspaceId },
    type: "channel.connected",
  }),
  "channel.disconnected": (workspaceId) => ({
    data: { channelId, platform: "mastodon", workspaceId },
    type: "channel.disconnected",
  }),
  "channel.reconnect_needed": (workspaceId) => ({
    data: { channelId, platform: "mastodon", workspaceId },
    type: "channel.reconnect_needed",
  }),
  "comment.received": (workspaceId) => ({
    data: { ...comment(workspaceId), receivedAt: at },
    type: "comment.received",
  }),
  "comment.replied": (workspaceId) => ({
    data: {
      ...comment(workspaceId),
      permalink: "https://social.example/@peal_example/2",
      repliedAt: at,
      replyId,
    },
    type: "comment.replied",
  }),
  "media.failed": (workspaceId) => ({
    data: { mediaId, reason: "unreadable", workspaceId },
    type: "media.failed",
  }),
  "media.ready": (workspaceId) => ({
    data: { contentType: "image/png", mediaId, workspaceId },
    type: "media.ready",
  }),
  "post.approval_requested": (workspaceId) => ({
    data: { postId, scheduledAt: at, workspaceId },
    type: "post.approval_requested",
  }),
  "post.approved": (workspaceId) => ({
    data: { by: "member", late: false, postId, workspaceId },
    type: "post.approved",
  }),
  "post.cancelled": (workspaceId) => ({
    data: { cancelledAt: at, postId, targets, workspaceId },
    type: "post.cancelled",
  }),
  "post.changes_requested": (workspaceId) => ({
    data: { by: "member", postId, workspaceId },
    type: "post.changes_requested",
  }),
  "post.failed": (workspaceId) => ({
    data: { ...onChannel(workspaceId), failedAt: at, reason: "rateLimited" },
    type: "post.failed",
  }),
  "post.published": (workspaceId) => ({
    data: {
      ...onChannel(workspaceId),
      permalink: "https://social.example/@peal_example/1",
      publishedAt: at,
    },
    type: "post.published",
  }),
  "post.scheduled": (workspaceId) => ({
    data: {
      postId,
      scheduledAt: at,
      targets,
      timeZone: "Europe/Paris",
      workspaceId,
    },
    type: "post.scheduled",
  }),
  "post.unconfirmed": (workspaceId) => ({
    data: { ...onChannel(workspaceId), attemptedAt: at, reason: "noResponse" },
    type: "post.unconfirmed",
  }),
  "post.unpublish_failed": (workspaceId) => ({
    data: {
      channelId,
      code: "unavailable",
      failedAt: at,
      platform: "mastodon",
      postId,
      targetId,
      workspaceId,
    },
    type: "post.unpublish_failed",
  }),
  "post.unpublished": (workspaceId) => ({
    data: {
      alreadyGone: false,
      channelId,
      platform: "mastodon",
      postId,
      removedAt: at,
      targetId,
      workspaceId,
    },
    type: "post.unpublished",
  }),
  "post.unscheduled": (workspaceId) => ({
    data: { postId, workspaceId },
    type: "post.unscheduled",
  }),
};

/** A made-up event of the type, in the workspace, to try an endpoint with. */
export const sampleOf = (
  type: SubscribableEventType,
  workspaceId: WorkspaceId
): WebhookEvent => samples[type](workspaceId);
