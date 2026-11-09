import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

/** A post as it goes out on one channel, in one attempt. */
export interface OutgoingPost {
  /** The account's id on the platform, as the channel stores it. */
  readonly accountId: string;
  readonly channelId: ChannelId;
  /** Unique to the attempt, and the same for every run of it. */
  readonly idempotencyKey: string;
  /** The images and videos, in order, with their descriptions. */
  readonly media: readonly MediaAttachment[];
  /** When the attempt's call started: the same for every run of it. */
  readonly startedAt: DateTime.Utc;
  /** The text on this channel: the post's own, or its override there. */
  readonly text: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * Publishes on one platform. `publish` and `resume` keep the promises of
 * PlatformPublisher's methods of the same names.
 */
export interface PlatformClient {
  readonly platform: Platform;
  readonly publish: (
    post: OutgoingPost
  ) => Effect.Effect<PublishResult, PublishFailure>;
  readonly resume: (
    post: OutgoingPost
  ) => Effect.Effect<PublishResult, PublishFailure>;
}

/** The platforms this server publishes to. */
export class PlatformClients extends Context.Service<
  PlatformClients,
  {
    /** The platform's client, if Acme publishes there. */
    readonly for: (platform: Platform) => Option.Option<PlatformClient>;
  }
>()("acme-server/publishing/application/PlatformClients") {}
