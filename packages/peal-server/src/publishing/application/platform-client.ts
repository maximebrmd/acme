import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import type { Poll } from "#publishing/domain/poll.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type {
  PlatformPostId,
  PublishResult,
} from "#shared/domain/publish-result.ts";

/**
 * The posts a part after the first answers to, by the ids the platform
 * gave them: the post's first part (`root`) and the part before this one
 * (`parent`, the root itself for the second part). A platform with threads
 * replies to the parent, and names the root where it asks for it; one that
 * takes comments comments on the root.
 */
export interface ReplyReference {
  readonly parent: PlatformPostId;
  readonly root: PlatformPostId;
}

/**
 * A post, or one part of it, as it goes out on one channel, in one
 * attempt.
 */
export interface OutgoingPost {
  /** The account's id on the platform, as the channel stores it. */
  readonly accountId: string;
  readonly channelId: ChannelId;
  /** Unique to the attempt, and the same for every run of it. */
  readonly idempotencyKey: string;
  /** The part's images and videos, in order, with their descriptions. */
  readonly media: readonly MediaAttachment[];
  /**
   * The options the post has on this channel, checked against its platform
   * when it was scheduled. An adapter reads its own platform's, as in
   * `post.options.pipe(Option.filter(Schema.is(YouTubeOptions)))`.
   */
  readonly options: Option.Option<TargetOptions>;
  /** The part's place in the post: 0 for the post itself. */
  readonly part: number;
  /**
   * The poll the post asks, on its first part only, checked against the
   * platform when it was scheduled. An adapter of a platform that takes
   * one (`poll` in `#publishing/domain/platform-rules.ts`) must send it.
   */
  readonly poll: Option.Option<Poll>;
  /**
   * What a part after the first answers to; none for the post itself.
   * An adapter of a platform that takes parts (`followUps` in
   * `#publishing/domain/platform-rules.ts`) must read it.
   */
  readonly replyTo: Option.Option<ReplyReference>;
  /** When the attempt's call started: the same for every run of it. */
  readonly startedAt: DateTime.Utc;
  /** The part's text on this channel: its own, or its override there. */
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
    /** The platform's client, if Peal publishes there. */
    readonly for: (platform: Platform) => Option.Option<PlatformClient>;
  }
>()("peal-server/publishing/application/PlatformClients") {}
