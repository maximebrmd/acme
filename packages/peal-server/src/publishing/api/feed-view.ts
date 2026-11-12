import { Match, Option } from "effect";
import type {
  Feed as FeedView,
  FeedItem as FeedItemView,
  FeedPreview as FeedPreviewView,
} from "peal-contract";

import type { FeedItemRecord } from "#publishing/application/feed-store.ts";
import type { FeedPreview } from "#publishing/application/feeds.ts";
import type { Feed } from "#publishing/domain/feed.ts";

import { originView } from "./recycling-view.ts";

/** What clients see of a feed. */
export const feedView = (feed: Feed): FeedView => {
  const { status } = feed;

  return {
    attachPicture: feed.attachPicture,
    channelIds: [...feed.channelIds],
    channelSetId: Option.getOrNull(feed.channelSetId),
    createdAt: feed.createdAt,
    failingSince: Option.getOrNull(feed.failingSince),
    id: feed.id,
    lastCheckedAt: Option.getOrNull(feed.lastCheckedAt),
    lastFailure: Option.getOrNull(feed.lastFailure),
    mode: feed.mode,
    nextCheckAt: feed.nextCheckAt,
    queueId: Option.getOrNull(feed.queueId),
    since: feed.since,
    startedBy: Option.getOrNull(feed.startedBy),
    startedVia: originView(feed.startedVia),
    status: status._tag,
    statusAt: Match.valueTags(status, {
      active: () => null,
      paused: ({ pausedAt }) => pausedAt,
      stopped: ({ stoppedAt }) => stoppedAt,
    }),
    stopReason: status._tag === "stopped" ? status.reason : null,
    template: feed.template,
    title: Option.getOrNull(feed.title),
    updatedAt: feed.updatedAt,
    url: feed.url,
  };
};

/** An item of a feed, never what it says. */
export const feedItemView = (item: FeedItemRecord): FeedItemView => ({
  digest: item.digest,
  itemAt: Option.getOrNull(item.itemAt),
  outcome: item.outcome,
  pictureSkipped: Option.getOrNull(item.pictureSkipped),
  postId: Option.getOrNull(item.postId),
  reason: Option.getOrNull(item.reason),
  seenAt: item.seenAt,
});

/** What a preview read. */
export const feedPreviewView = (preview: FeedPreview): FeedPreviewView => ({
  items: preview.items.map(({ entry, text }) => ({
    link: Option.getOrNull(entry.link),
    picture: Option.getOrNull(entry.pictureUrl),
    publishedAt: Option.getOrNull(entry.publishedAt),
    summary: Option.getOrNull(entry.summary),
    text: Option.getOrNull(text),
    title: Option.getOrNull(entry.title),
  })),
  title: Option.getOrNull(preview.title),
});
