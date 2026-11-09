import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelRecord,
  MediaRecord,
  NoticeRecord,
  PostRecord,
  PreferencesRecord,
  UsageRecord,
} from "#shared/application/personal-data.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import type { WorkspaceBusy } from "./workspace-busy.ts";
import type { WorkspaceFilesRemain } from "./workspace-files-remain.ts";

/** What the other contexts keep in a workspace. */
export interface WorkspaceContent {
  readonly assistantUsage: readonly UsageRecord[];
  readonly channels: readonly ChannelRecord[];
  readonly media: readonly MediaRecord[];
  readonly posts: readonly PostRecord[];
}

/** What the other contexts keep about a user, wherever they are a member. */
export interface UserContent {
  readonly notices: readonly NoticeRecord[];
  readonly preferences: PreferencesRecord;
}

/**
 * The data the other contexts keep about workspaces and users: channels,
 * posts, media, assistant usage, notices and preferences. Erasures run in
 * the caller's transaction, except the media files, which the store holds
 * outside the database: remove them once the rest is committed.
 */
export class ContextRecords extends Context.Service<
  ContextRecords,
  {
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<WorkspaceContent, DatabaseError>;
    readonly exportUser: (
      userId: UserId
    ) => Effect.Effect<UserContent, DatabaseError>;
    /**
     * Deletes everything of the workspace, stopping its scheduled posts.
     * Refused while one of its posts is being published.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError | WorkspaceBusy>;
    /** Deletes the user's notices and preferences. */
    readonly eraseUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
    readonly removeWorkspaceFiles: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, WorkspaceFilesRemain>;
  }
>()("acme-server/workspace/application/ContextRecords") {}
