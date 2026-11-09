import { Context, Schema } from "effect";
import type { Effect } from "effect";

import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

/** Publish this post on this channel. */
export const PublishRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  // The same for every run of one attempt and different for each attempt.
  // Platforms that accept one get it, so a resent attempt posts once.
  idempotencyKey: Schema.NonEmptyString,
  postId: PostIdSchema,
  targetId: PostTargetIdSchema,
});

export type PublishRequest = typeof PublishRequestSchema.Type;

/**
 * Sends a post to the platform its channel is on. An adapter answers what it
 * knows: published, refused (a `PublishFailure`, which means nothing went
 * live), or unconfirmed when the request may have gone out without an answer.
 * It never retries a call that may have reached the platform.
 */
export class PlatformPublisher extends Context.Service<
  PlatformPublisher,
  {
    readonly publish: (
      request: PublishRequest
    ) => Effect.Effect<PublishResult, PublishFailure>;
  }
>()("acme-server/publishing/application/PlatformPublisher") {}
