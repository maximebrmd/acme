import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { ApprovalRequest } from "#review/domain/approval-request.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** Approval requests and what was decided on them. */
export class ApprovalStore extends Context.Service<
  ApprovalStore,
  {
    readonly insert: (
      request: ApprovalRequest
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * The request that waits for the post, locked until the transaction
     * ends, so two decisions take turns.
     */
    readonly lockPending: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<Option.Option<ApprovalRequest>, DatabaseError>;
    readonly update: (
      request: ApprovalRequest
    ) => Effect.Effect<void, DatabaseError>;
    /** Whether an approval of the post as `subjectHash` says it stands. */
    readonly approved: (
      workspaceId: WorkspaceId,
      postId: PostId,
      subjectHash: string
    ) => Effect.Effect<boolean, DatabaseError>;
    /** The post's requests, newest first. */
    readonly ofPost: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly ApprovalRequest[], DatabaseError>;
    /** The workspace's requests that wait, oldest first, `limit` at most. */
    readonly pending: (
      workspaceId: WorkspaceId,
      limit: number
    ) => Effect.Effect<readonly ApprovalRequest[], DatabaseError>;
  }
>()("peal-server/review/application/ApprovalStore") {}
