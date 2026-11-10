import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { PostStatusName } from "#publishing/domain/post-status.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { PostingMonth } from "#publishing/domain/posting-month.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  MediaAssetId,
  PostId,
  WorkspaceId,
} from "#shared/domain/ids.ts";

import type { PostPageRequest, StoredPostPage } from "./post-listing.ts";
import type { ExecutionId } from "./publication-scheduler.ts";

/** A stored post, and the job started for its current revision, if any. */
export interface StoredPost {
  readonly execution: Option.Option<ExecutionId>;
  readonly post: Post;
}

/** A post and its targets, oldest target first. */
export interface PostWithTargets {
  readonly post: Post;
  readonly targets: readonly PostTarget[];
}

/** A page of a workspace's drafts, newest first. */
export interface DraftPageRequest {
  /** The last draft of the page before, if this is not the first. */
  readonly after: Option.Option<PostId>;
  readonly limit: number;
}

export interface DraftPage {
  readonly items: readonly PostWithTargets[];
  /** Where the next page starts, if there is one. */
  readonly next: Option.Option<PostId>;
}

/**
 * Posts and their targets.
 *
 * The `lock` reads hold the row until the transaction ends, so changes to a
 * post or a target take turns: a reschedule and the job waking for the old
 * time cannot both win. Lock a post before its targets. The `update` writes
 * compare and set: they apply only while the row still holds `current`, and
 * say whether it did.
 */
export class PostRepository extends Context.Service<
  PostRepository,
  {
    readonly insert: (
      post: Post,
      targets: readonly PostTarget[]
    ) => Effect.Effect<void, DatabaseError>;
    readonly find: (
      postId: PostId
    ) => Effect.Effect<Option.Option<StoredPost>, DatabaseError>;
    readonly lock: (
      postId: PostId
    ) => Effect.Effect<Option.Option<StoredPost>, DatabaseError>;
    /** Deletes the post and its targets. */
    readonly remove: (postId: PostId) => Effect.Effect<void, DatabaseError>;
    readonly update: (
      next: Post,
      current: Post
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Records the job started for the post's current revision. */
    readonly setExecution: (
      post: Post,
      executionId: ExecutionId
    ) => Effect.Effect<boolean, DatabaseError>;
    readonly targets: (
      postId: PostId
    ) => Effect.Effect<readonly PostTarget[], DatabaseError>;
    readonly lockTargets: (
      postId: PostId
    ) => Effect.Effect<readonly PostTarget[], DatabaseError>;
    readonly findTarget: (
      targetId: PostTargetId
    ) => Effect.Effect<Option.Option<PostTarget>, DatabaseError>;
    readonly lockTarget: (
      targetId: PostTargetId
    ) => Effect.Effect<Option.Option<PostTarget>, DatabaseError>;
    readonly updateTarget: (
      next: PostTarget,
      current: PostTarget
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Makes these the post's targets: those it had and that are not listed
     * are deleted, the listed ones it lacked are added, and the others take
     * the listed options and otherwise stay as they are.
     */
    readonly setTargets: (
      postId: PostId,
      targets: readonly PostTarget[]
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * The workspace's posts scheduled from `from` (included) to `to`
     * (excluded), whatever happened to them since, by scheduled instant.
     */
    readonly listScheduled: (
      workspaceId: WorkspaceId,
      from: DateTime.Utc,
      to: DateTime.Utc
    ) => Effect.Effect<readonly PostWithTargets[], DatabaseError>;
    /** The workspace's drafts, newest first, a page at a time. */
    readonly listDrafts: (
      workspaceId: WorkspaceId,
      page: DraftPageRequest
    ) => Effect.Effect<DraftPage, DatabaseError>;
    /**
     * A page of the workspace's posts that match the filter, in the order
     * asked, from the position given: `limit` at most.
     */
    readonly search: (
      page: PostPageRequest
    ) => Effect.Effect<StoredPostPage, DatabaseError>;
    /** The channels the workspace's posts have a target on, each once. */
    readonly channelsUsed: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ChannelId[], DatabaseError>;
    /** The workspace's posts in one of `statuses` that show the media. */
    readonly showing: (
      workspaceId: WorkspaceId,
      mediaId: MediaAssetId,
      statuses: readonly PostStatusName[]
    ) => Effect.Effect<readonly Post[], DatabaseError>;
    /**
     * Holds back, until the transaction it runs in ends, any other
     * transaction that claims the workspace's month: counting the posts
     * going out in it, then adding one, takes turns.
     */
    readonly claimMonth: (
      workspaceId: WorkspaceId,
      month: PostingMonth
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * How many of the workspace's posts go out in the month: scheduled,
     * publishing or finished there, `except` left out. Drafts, which have
     * no time, and cancelled posts take no room, and a post counts once,
     * however many rounds its targets are sent in.
     */
    readonly countGoingOut: (
      workspaceId: WorkspaceId,
      month: PostingMonth,
      except: Option.Option<PostId>
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * How many of the workspace's posts go out in the month before the
     * post, scheduled at `at`: earlier, or at the same instant with a
     * smaller id. Counted as `countGoingOut` counts.
     */
    readonly countGoingOutBefore: (
      workspaceId: WorkspaceId,
      month: PostingMonth,
      post: { readonly at: DateTime.Utc; readonly postId: PostId }
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/publishing/application/PostRepository") {}
