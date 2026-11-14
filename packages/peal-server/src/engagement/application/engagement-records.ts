import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  SentReplyRecord,
  SentReviewReplyRecord,
} from "#shared/application/personal-data.ts";
import type {
  ChannelId,
  PostTargetId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/**
 * What engagement keeps about a workspace or a user, for the workspace
 * context when data is exported or erased. A workspace's threads, the
 * comments read under them and the replies sent go with it; erasing runs
 * in the caller's transaction, and records the workspace as erased, so a
 * collection run that listed its posts before follows none of them after.
 * A user's export holds the replies they wrote, never the comments they
 * answered, which are other people's; and the same for the reviews of
 * locations, which go with their workspace and, at once, with their
 * channel.
 */
export class EngagementRecords extends Context.Service<
  EngagementRecords,
  {
    /**
     * A channel of `platform` left its workspace (disconnected, or its
     * platform asked for its data to be deleted), in the caller's
     * transaction. On a platform that bounds how long Peal keeps a
     * comment, as it asks within days of a revocation, every thread of
     * the channel ends `disconnected` at `at` and its comments are
     * forgotten, those of threads not read yet included, so a read on its
     * way keeps nothing; on the others, nothing changes until the next
     * read ends them, and the comments stay for their retention. The
     * replies sent stay, the workspace's own. A Google Business Profile
     * channel's reviews go at once, with the replies sent to them: Google
     * lets Peal keep them no longer than it uses them.
     */
    readonly channelGone: (
      channelId: ChannelId,
      platform: Platform,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** The replies the user wrote, oldest first. */
    readonly exportUser: (
      userId: UserId
    ) => Effect.Effect<readonly SentReplyRecord[], DatabaseError>;
    /** The replies to reviews the user wrote, oldest first. */
    readonly exportUserReviewReplies: (
      userId: UserId
    ) => Effect.Effect<readonly SentReviewReplyRecord[], DatabaseError>;
    /** Deletes the workspace's threads, comments, reviews and replies. */
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
