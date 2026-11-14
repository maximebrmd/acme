import { Context, Effect, Layer, Schema } from "effect";

import { FollowUpIdSchema } from "#publishing/domain/follow-up-id.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

/**
 * Carry out this follow-up on this channel: ids only, as a gate's call
 * holds them. Its text stays in publishing's tables.
 */
export const FollowUpRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  followUpId: FollowUpIdSchema,
});

export type FollowUpRequest = typeof FollowUpRequestSchema.Type;

/**
 * Publishes a follow-up on the platform its channel is on, keeping the
 * promises of PlatformPublisher's methods of the same names: `send` never
 * retries a call that may have reached the platform unless the platform
 * makes it harmless, and `resume`, for a call an earlier run began,
 * sends only where sending again cannot publish twice, and answers
 * unconfirmed when it cannot tell.
 */
export class FollowUpPublisher extends Context.Service<
  FollowUpPublisher,
  {
    readonly send: (
      request: FollowUpRequest
    ) => Effect.Effect<PublishResult, PublishFailure>;
    readonly resume: (
      request: FollowUpRequest
    ) => Effect.Effect<PublishResult, PublishFailure>;
  }
>()("peal-server/publishing/application/FollowUpPublisher") {
  /** For gates that carry out no follow-up: nothing is sent. */
  static readonly none = Layer.succeed(
    FollowUpPublisher,
    FollowUpPublisher.of({
      resume: () =>
        Effect.succeed<PublishResult>({
          _tag: "unconfirmed",
          reason: "interrupted",
        }),
      send: () => Effect.fail(new PlatformUnavailable()),
    })
  );
}
