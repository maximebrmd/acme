import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { SentReplyRecord } from "#shared/application/personal-data.ts";
import type { PostTargetId, UserId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What engagement keeps about a workspace or a user, for the workspace
 * context when data is exported or erased. A workspace's threads, the
 * comments read under them and the replies sent go with it; erasing runs
 * in the caller's transaction, and records the workspace as erased, so a
 * collection run that listed its posts before follows none of them after.
 * A user's export holds the replies they wrote, never the comments they
 * answered, which are other people's.
 */
export class EngagementRecords extends Context.Service<
  EngagementRecords,
  {
    /** The replies the user wrote, oldest first. */
    readonly exportUser: (
      userId: UserId
    ) => Effect.Effect<readonly SentReplyRecord[], DatabaseError>;
    /** Deletes the workspace's threads, comments and replies. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Forgets the user as the author of the replies they wrote in the
     * workspaces that remain: the replies stay, as the workspace's.
     */
    readonly forgetUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
    /**
     * A post Peal deleted from its platform, in the caller's transaction:
     * its thread is no longer read from that moment, and the comments read
     * until then stay for their retention. Nothing happens to a thread not
     * followed, or no longer read.
     */
    readonly postRemoved: (
      targetId: PostTargetId,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/engagement/application/EngagementRecords") {}
