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
  // When the attempt's call started, as the journal recorded it: the same
  // for every run of the attempt, so adapters can derive what they send
  // from it (Bluesky's record key and creation time).
  startedAt: Schema.DateTimeUtc,
  targetId: PostTargetIdSchema,
});

export type PublishRequest = typeof PublishRequestSchema.Type;

/**
 * Sends a post to the platform its channel is on. An adapter answers what it
 * knows: published, refused (a `PublishFailure`, which means nothing went
 * live), or unconfirmed when the request may have gone out without an answer.
 * It never retries a call that may have reached the platform, unless the
 * platform makes the retry harmless (an idempotency key it honours, or a
 * record key it refuses twice).
 */
export class PlatformPublisher extends Context.Service<
  PlatformPublisher,
  {
    readonly publish: (
      request: PublishRequest
    ) => Effect.Effect<PublishResult, PublishFailure>;
    /**
     * An earlier run of this attempt began the call and stopped before it
     * recorded how it ended, as when the server restarted: the post may be
     * live. An adapter that can find out does, and sends the post only where
     * sending it again cannot post it twice. One that cannot tell answers
     * unconfirmed, and never refuses the post unless it knows nothing went
     * live: a refusal would let the next attempt post it again.
     */
    readonly resume: (
      request: PublishRequest
    ) => Effect.Effect<PublishResult, PublishFailure>;
  }
>()("acme-server/publishing/application/PlatformPublisher") {}
