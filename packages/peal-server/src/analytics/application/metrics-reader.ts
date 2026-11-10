import { Context, Schema } from "effect";
import type { Effect } from "effect";

import type { AccountReading } from "#analytics/domain/account-metrics.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import {
  ChannelIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

import { ChannelUnreadable } from "./channel-unreadable.ts";

/** A post to read: Peal's id for it on the channel, and the platform's. */
export const PostToReadSchema = Schema.Struct({
  platformPostId: PlatformPostIdSchema,
  targetId: PostTargetIdSchema,
});

export type PostToRead = typeof PostToReadSchema.Type;

/**
 * Posts of one channel to read, 25 at most. Ids only, never content. The
 * workspace is the one whose allowance a platform that bills reads is
 * counted against; a request that names none reads nothing there.
 */
export const MetricsRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  posts: Schema.Array(PostToReadSchema).check(Schema.isMaxLength(25)),
  workspaceId: Schema.optionalKey(WorkspaceIdSchema),
});

export type MetricsRequest = typeof MetricsRequestSchema.Type;

/**
 * What reading one post found: its counts, that the platform no longer
 * shows it, deleted or not public, or that reading it failed: the server
 * erred, did not answer, or answered what Peal cannot read, or that it
 * was not read for want of a paid read. A post whose read failed, or was
 * not paid for, waits for its next turn like a missing one, so a post
 * that cannot be read now never holds back the channel's others.
 */
export const PostReadingSchema = Schema.Union([
  Schema.TaggedStruct("counted", {
    metrics: PostMetrics,
    targetId: PostTargetIdSchema,
  }),
  Schema.TaggedStruct("missing", { targetId: PostTargetIdSchema }),
  Schema.TaggedStruct("failed", { targetId: PostTargetIdSchema }),
  // Its platform bills each read, and the workspace's allowance for the
  // day is spent: nothing was asked for it.
  Schema.TaggedStruct("unpaid", { targetId: PostTargetIdSchema }),
]);

export type PostReading = typeof PostReadingSchema.Type;

/**
 * What a read found, post by post. A post it says nothing about was not
 * read: the platform asked to slow down, or a read failed, which `halted`
 * tells, so the run leaves the channel alone until the next one.
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
 * A channel whose account to read, for the workspace it is in, whose
 * allowance a platform that bills reads is counted against.
 */
export const AccountRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  workspaceId: WorkspaceIdSchema,
});

export type AccountRequest = typeof AccountRequestSchema.Type;

/**
 * Reads the counts of a channel's posts on its platform, and its account's
 * own numbers. The platforms'
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
    /**
     * The account's followers and other counters now, and the days its
     * platform counted lately. `unsupported` where Peal reads none.
     */
    readonly account: (
      request: AccountRequest
    ) => Effect.Effect<AccountReading, MetricsReadFailure>;
  }
>()("peal-server/analytics/application/MetricsReader") {}

export { AccountReadingSchema } from "#analytics/domain/account-metrics.ts";
