import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

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
     * are deleted, the listed ones it lacked are added, and the others stay
     * as they are.
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
  }
>()("acme-server/publishing/application/PostRepository") {}
