import { Schema } from "effect";

import { Schedule } from "./schedule.ts";

/** How a post ended across the channels it went to. */
export const PostOutcomeSchema = Schema.Literals([
  // Every channel published it.
  "published",
  // Some channels published it; the others failed or were cancelled.
  "partiallyPublished",
  // At least one channel may have it live: the user checks before anything
  // else happens to it.
  "unconfirmed",
  // No channel published it.
  "failed",
  // It was cancelled before any channel published it.
  "cancelled",
]);

export type PostOutcome = typeof PostOutcomeSchema.Type;

const DraftSchema = Schema.TaggedStruct("draft", {});

// Waiting for someone to approve it, for the time it was asked for: no job
// publishes it until then.
const AwaitingApprovalSchema = Schema.TaggedStruct("awaitingApproval", {
  schedule: Schedule,
});

const ScheduledSchema = Schema.TaggedStruct("scheduled", {
  schedule: Schedule,
});

const PublishingSchema = Schema.TaggedStruct("publishing", {
  schedule: Schedule,
  startedAt: Schema.DateTimeUtc,
});

const FinishedSchema = Schema.TaggedStruct("finished", {
  finishedAt: Schema.DateTimeUtc,
  outcome: PostOutcomeSchema,
  schedule: Schedule,
  startedAt: Schema.DateTimeUtc,
});

const CancelledSchema = Schema.TaggedStruct("cancelled", {
  cancelledAt: Schema.DateTimeUtc,
  // The time it had, unless it was a draft.
  schedule: Schema.Option(Schedule),
});

/**
 * Where a post is in its life. What happened on each channel is the status of
 * that channel's target (`./post-target-status.ts`).
 */
export const PostStatusSchema = Schema.Union([
  DraftSchema,
  AwaitingApprovalSchema,
  ScheduledSchema,
  PublishingSchema,
  FinishedSchema,
  CancelledSchema,
]);

export type PostStatus = typeof PostStatusSchema.Type;

export const PostStatusNameSchema = Schema.Literals([
  "draft",
  "awaitingApproval",
  "scheduled",
  "publishing",
  "finished",
  "cancelled",
]);

export type PostStatusName = PostStatus["_tag"];
