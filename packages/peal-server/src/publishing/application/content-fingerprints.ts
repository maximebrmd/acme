import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { Duplicate } from "#publishing/domain/duplicate-window.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** What a post sends to one channel (`contentOn`). */
export interface ChannelContent {
  readonly channelId: ChannelId;
  readonly content: string;
}

/** What one target of a post sends to its channel. */
export interface TargetContent extends ChannelContent {
  readonly targetId: PostTargetId;
}

/** What a post sends, and the times other posts are looked for in. */
export interface FingerprintSearch {
  /** Both ends excluded. */
  readonly after: DateTime.Utc;
  readonly before: DateTime.Utc;
  readonly contents: readonly ChannelContent[];
  /** The post itself, once it is stored: no duplicate of its own. */
  readonly except: Option.Option<PostId>;
  readonly workspaceId: WorkspaceId;
}

/**
 * What each target sends to its channel, kept as a digest
 * (`publishing.post_targets.content_digest`), never the content, so that
 * the same content sent to the same channel again can be found.
 */
export class ContentFingerprints extends Context.Service<
  ContentFingerprints,
  {
    /**
     * The workspace's other posts that send the same content to the same
     * channel, with a time between `after` and `before`: one per channel,
     * the nearest first in time. Only posts that go out or went out
     * count: scheduled, publishing or finished, on a target that is
     * pending, publishing, published or unconfirmed. A draft, a cancelled
     * post and a target that failed sent nothing.
     *
     * In a transaction, it holds back until the transaction ends any
     * other search for the same content on the same channel, so of two
     * requests sent together one finds the other's post.
     */
    readonly duplicatesOf: (
      search: FingerprintSearch
    ) => Effect.Effect<readonly Duplicate[], DatabaseError>;
    /** Keeps what each target sends, over what it kept before. */
    readonly record: (
      targets: readonly TargetContent[]
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/ContentFingerprints") {}
