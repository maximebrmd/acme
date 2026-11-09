import { Context, Schema } from "effect";
import type { Effect } from "effect";

import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import { ChannelIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

import { ChannelUnreadable } from "./channel-unreadable.ts";

/** A post to read: Acme's id for it on the channel, and the platform's. */
export const PostToReadSchema = Schema.Struct({
  platformPostId: PlatformPostIdSchema,
  targetId: PostTargetIdSchema,
});

export type PostToRead = typeof PostToReadSchema.Type;

/** Posts of one channel to read, 25 at most. Ids only, never content. */
export const MetricsRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  posts: Schema.Array(PostToReadSchema).check(Schema.isMaxLength(25)),
});

export type MetricsRequest = typeof MetricsRequestSchema.Type;

/**
 * What reading one post found: its counts, or that the platform no longer
 * shows it, deleted or not public.
 */
export const PostReadingSchema = Schema.Union([
  Schema.TaggedStruct("counted", {
    metrics: PostMetrics,
    targetId: PostTargetIdSchema,
  }),
  Schema.TaggedStruct("missing", { targetId: PostTargetIdSchema }),
]);

export type PostReading = typeof PostReadingSchema.Type;

/**
 * What a read found, post by post. A post it says nothing about was not
 * read: the platform asked to slow down or stopped answering, which
 * `halted` tells, so the run leaves the channel alone until the next one.
 */
export const MetricsBatchSchema = Schema.Struct({
  halted: Schema.Boolean,
  readings: Schema.Array(PostReadingSchema),
});

export type MetricsBatch = typeof MetricsBatchSchema.Type;

/** Why nothing was read: the channel, or the platform being down. */
export const MetricsReadFailureSchema = Schema.Union([
  ChannelUnreadable,
  PlatformUnavailable,
]);

export type MetricsReadFailure = typeof MetricsReadFailureSchema.Type;

/**
 * Reads the counts of a channel's posts on its platform. The platforms'
 * readers do it; analytics runs them through the channel's gate, one call
 * at a time with the channel's publishing, and with the token the channels
 * context hands out when the account allowed reading.
 */
export class MetricsReader extends Context.Service<
  MetricsReader,
  {
    readonly read: (
      request: MetricsRequest
    ) => Effect.Effect<MetricsBatch, MetricsReadFailure>;
  }
>()("acme-server/analytics/application/MetricsReader") {}
