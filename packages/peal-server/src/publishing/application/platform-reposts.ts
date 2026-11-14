import { Context, Layer, Option } from "effect";
import type { DateTime, Effect } from "effect";

import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type {
  PlatformPostId,
  PublishResult,
} from "#shared/domain/publish-result.ts";

/** A repost of one of the account's own posts, in one attempt. */
export interface OutgoingRepost {
  /** The account's id on the platform, as the channel stores it. */
  readonly accountId: string;
  readonly channelId: ChannelId;
  /** Unique to the attempt, and the same for every run of it. */
  readonly idempotencyKey: string;
  /** The platform's id of the post reposted: the target's first part. */
  readonly platformPostId: PlatformPostId;
  /** When the attempt's call started: the same for every run of it. */
  readonly startedAt: DateTime.Utc;
  readonly workspaceId: WorkspaceId;
}

/**
 * Reposts on one platform, keeping the promises of PlatformClient's
 * `publish` and `resume`: `resume` reposts only where doing so again
 * cannot repost twice, and answers unconfirmed when it cannot tell.
 */
export interface RepostClient {
  readonly platform: Platform;
  readonly repost: (
    repost: OutgoingRepost
  ) => Effect.Effect<PublishResult, PublishFailure>;
  readonly resume: (
    repost: OutgoingRepost
  ) => Effect.Effect<PublishResult, PublishFailure>;
}

/** The platforms this server reposts on. */
export class PlatformReposts extends Context.Service<
  PlatformReposts,
  {
    /** The platform's client, if Peal reposts there. */
    readonly for: (platform: Platform) => Option.Option<RepostClient>;
  }
>()("peal-server/publishing/application/PlatformReposts") {
  /** Reposts nowhere. */
  static readonly none = Layer.succeed(
    PlatformReposts,
    PlatformReposts.of({ for: () => Option.none() })
  );
}
