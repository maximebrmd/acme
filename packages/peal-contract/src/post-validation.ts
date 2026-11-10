import { Schema } from "effect";

import {
  PaidPlanSchema,
  PlanLimitSchema,
  PlanSchema,
} from "./billing-plans.ts";
import { PlatformSchema } from "./platform.ts";
import { ContentViolationSchema } from "./post-content-invalid.ts";
import { TextUnitSchema } from "./post-text.ts";

/** A text's length in one of the units a platform counts in, and its limit. */
export const TextCountSchema = Schema.Struct({
  length: Schema.Int,
  maximum: Schema.Int,
  unit: TextUnitSchema,
}).annotate({ identifier: "TextCount" });

export type TextCount = typeof TextCountSchema.Type;

/** How many of something a post holds, and the most its platform takes. */
export const LimitedCountSchema = Schema.Struct({
  count: Schema.Int,
  // Null when Peal knows no limit for the platform.
  maximum: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "LimitedCount" });

export type LimitedCount = typeof LimitedCountSchema.Type;

/**
 * What a post would be on one of its channels: the text the channel
 * receives (its override there, or the post's own), counted as the
 * channel's platform counts it, against each of its limits; how many
 * hashtags, mentions, different links and media it holds; and everything
 * the platform, or the account, would refuse.
 */
export const ChannelPreviewSchema = Schema.Struct({
  channelId: Schema.String,
  hashtags: LimitedCountSchema,
  links: LimitedCountSchema,
  media: LimitedCountSchema,
  mentions: LimitedCountSchema,
  platform: PlatformSchema,
  text: Schema.String,
  // One per limit of the platform: Bluesky counts graphemes and bytes.
  textCounts: Schema.Array(TextCountSchema),
  violations: Schema.Array(ContentViolationSchema),
}).annotate({ identifier: "ChannelPreview" });

export type ChannelPreview = typeof ChannelPreviewSchema.Type;

/**
 * Whether a post's time can be kept: `ok`; `inPast`, more than a minute
 * ago; or `invalidTimeZone`, when its zone is no IANA zone.
 */
export const ScheduleCheckSchema = Schema.Literals([
  "ok",
  "inPast",
  "invalidTimeZone",
]).annotate({ identifier: "ScheduleCheck" });

export type ScheduleCheck = typeof ScheduleCheckSchema.Type;

/**
 * The limit of the workspace's plan a post would pass, as PlanLimitReached
 * tells it.
 */
export const PlanShortfallSchema = Schema.Struct({
  allowed: Schema.Int,
  billingUrl: Schema.String,
  limit: PlanLimitSchema,
  plan: PlanSchema,
  planWithRoom: Schema.NullOr(PaidPlanSchema),
  used: Schema.Int,
}).annotate({ identifier: "PlanShortfall" });

export type PlanShortfall = typeof PlanShortfallSchema.Type;

/**
 * What sending a post would come to, with nothing made: `valid` when
 * nothing below refuses it.
 */
export const PostValidationSchema = Schema.Struct({
  // One per channel of the workspace the post names, in the order given.
  channels: Schema.Array(ChannelPreviewSchema),
  // The limit of the plan it would pass; null when it has room, on a
  // server that does not bill, or when the request gave no time.
  planLimit: Schema.NullOr(PlanShortfallSchema),
  // Null when the request gave no time.
  schedule: Schema.NullOr(ScheduleCheckSchema),
  // The channels it names that are not the workspace's.
  unknownChannels: Schema.Array(Schema.String),
  // The media it shows that are not the workspace's, or not ready.
  unknownMedia: Schema.Array(Schema.String),
  valid: Schema.Boolean,
  // What is wrong with the post whatever the channel: no channel at all,
  // or a text or options for a channel it does not go to.
  violations: Schema.Array(ContentViolationSchema),
}).annotate({ identifier: "PostValidation" });

export type PostValidation = typeof PostValidationSchema.Type;
