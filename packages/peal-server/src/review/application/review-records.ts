import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ReviewRecord,
  UserReviewRecord,
} from "#shared/application/personal-data.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's reviews as a whole, and a user's part in any, for the
 * workspace context when data is exported or erased. Erasures run in the
 * caller's transaction, if any.
 */
export class ReviewRecords extends Context.Service<
  ReviewRecords,
  {
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<ReviewRecord, DatabaseError>;
    /** What the user wrote and decided, and asked to be approved. */
    readonly exportUser: (
      userId: UserId
    ) => Effect.Effect<UserReviewRecord, DatabaseError>;
    /** Deletes the workspace's policy, links, comments and approvals. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Takes the user's id off what stays in the workspaces that remain:
     * their comments and decisions stay, without them.
     */
    readonly forgetUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/review/application/ReviewRecords") {}
