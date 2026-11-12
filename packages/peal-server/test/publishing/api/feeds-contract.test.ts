import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";
import {
  defaultFeedTemplate,
  feedCheckIntervalMinutes,
  FeedFailureSchema,
  FeedItemOutcomeSchema,
  FeedItemReasonSchema,
  feedItemsShown,
  FeedModeSchema,
  feedPlaceholders,
  feedPreviewItems,
  feedReadsPerHour,
  FeedStoppedReasonSchema,
  FeedStopReasonSchema,
  maxFeedBytes,
  maxFeedFailingDays,
  maxFeedItemsPerDay,
  maxFeedItemsPerRun,
  maxFeedsPerWorkspace,
  maxFeedSummaryLength,
  maxFeedTemplateLength,
} from "peal-contract";

import { FeedStopReasonSchema as NoticeReasons } from "#notifications/domain/notice-event.ts";
import { itemsShown, previewedItems } from "#publishing/application/feeds.ts";
import {
  FeedItemOutcomeSchema as OwnOutcomes,
  FeedItemReasonSchema as OwnItemReasons,
} from "#publishing/domain/feed-item-outcome.ts";
import { FeedReadFailureSchema as OwnFailures } from "#publishing/domain/feed-read-failure.ts";
import { FeedStopReasonSchema as OwnStopReasons } from "#publishing/domain/feed-stop-reason.ts";
import {
  defaultTemplate,
  maxTemplateLength,
  placeholders,
} from "#publishing/domain/feed-template.ts";
import * as Own from "#publishing/domain/feed.ts";

// The contract's copy of feeds' limits and reasons, which clients read,
// is the server's: written once each side, kept equal here.

describe("the contract's feeds", () => {
  it("have the server's limits", () => {
    expect({
      checkMinutes: feedCheckIntervalMinutes,
      failingDays: maxFeedFailingDays,
      itemsShown: feedItemsShown,
      maxBytes: maxFeedBytes,
      maxFeeds: maxFeedsPerWorkspace,
      perDay: maxFeedItemsPerDay,
      perRun: maxFeedItemsPerRun,
      previewed: feedPreviewItems,
      reads: feedReadsPerHour,
      summary: maxFeedSummaryLength,
      template: maxFeedTemplateLength,
    }).toStrictEqual({
      checkMinutes: Duration.toMinutes(Own.feedCheckInterval),
      failingDays: Own.maxFailingDays,
      itemsShown,
      maxBytes: Own.maxFeedBytes,
      maxFeeds: Own.maxFeedsPerWorkspace,
      perDay: Own.maxItemsPerDay,
      perRun: Own.maxItemsPerRun,
      previewed: previewedItems,
      reads: Own.feedReadsPerHour,
      summary: Own.maxSummaryLength,
      template: maxTemplateLength,
    });
  });

  it("write the server's template, with its placeholders", () => {
    expect([defaultFeedTemplate, feedPlaceholders]).toStrictEqual([
      defaultTemplate,
      placeholders,
    ]);
  });

  it("stop, fail and keep items for the server's reasons, and tell the same", () => {
    expect([
      FeedModeSchema.literals,
      FeedStoppedReasonSchema.literals,
      FeedStopReasonSchema.literals,
      FeedFailureSchema.literals,
      FeedItemOutcomeSchema.literals,
      FeedItemReasonSchema.literals,
    ]).toStrictEqual([
      Own.FeedModeSchema.literals,
      OwnStopReasons.literals,
      NoticeReasons.literals,
      OwnFailures.literals,
      OwnOutcomes.literals,
      OwnItemReasons.literals,
    ]);
  });
});
