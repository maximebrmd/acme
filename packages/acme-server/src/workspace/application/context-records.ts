import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AnalyticsRecord,
  AuthoredPostRecord,
  BillingRecord,
  ChannelRecord,
  MediaRecord,
  NoticeRecord,
  PostRecord,
  PreferencesRecord,
  UsageRecord,
} from "#shared/application/personal-data.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import type { BillingUnavailable } from "./billing-unavailable.ts";
import type { WorkspaceBusy } from "./workspace-busy.ts";
import type { WorkspaceFilesRemain } from "./workspace-files-remain.ts";
import type { WorkspaceSubscribed } from "./workspace-subscribed.ts";

/** What the other contexts keep in a workspace. */
export interface WorkspaceContent {
  readonly analytics: readonly AnalyticsRecord[];
  readonly assistantUsage: readonly UsageRecord[];
  readonly billing: BillingRecord;
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
 * posts and their authors, media, analytics, assistant usage, billing,
 * notices and preferences. Erasures run in the caller's transaction, except the media
 * files, which the store holds outside the database: remove them once the
 * rest is committed.
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
    /** The posts the user wrote in these workspaces, oldest first. */
    readonly exportAuthoredPosts: (
      userId: UserId,
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<readonly AuthoredPostRecord[], DatabaseError>;
    /**
     * Deletes everything of the workspace, stopping its scheduled posts and
     * expiring its open checkouts at Stripe. Refused, before anything is
     * deleted, while Stripe may still bill it or cannot be reached, and
     * while one of its posts is being published.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<
      void,
      BillingUnavailable | DatabaseError | WorkspaceBusy | WorkspaceSubscribed
    >;
    /**
     * Deletes the user's notices and preferences, and the connections they
     * have in progress, and forgets them as the author of posts in the
     * workspaces that remain.
     */
    readonly eraseUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
    readonly removeWorkspaceFiles: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, WorkspaceFilesRemain>;
  }
>()("acme-server/workspace/application/ContextRecords") {}
