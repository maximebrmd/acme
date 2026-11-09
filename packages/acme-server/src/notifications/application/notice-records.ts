import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  NoticeRecord,
  PreferencesRecord,
} from "#shared/application/personal-data.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * Notices and preferences as a whole, for the workspace context when a
 * user's or a workspace's data is exported or erased. Erasing runs in the
 * caller's transaction, if any; an email still waiting for a notice erased
 * then is not sent.
 */
export class NoticeRecords extends Context.Service<
  NoticeRecords,
  {
    /** The user's notices, oldest first, and their email preferences. */
    readonly exportUser: (userId: UserId) => Effect.Effect<
      {
        readonly notices: readonly NoticeRecord[];
        readonly preferences: PreferencesRecord;
      },
      DatabaseError
    >;
    /** Deletes the user's notices, in every workspace, and preferences. */
    readonly eraseUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
    /** Deletes the notices of the workspace, whoever they were for. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/notifications/application/NoticeRecords") {}
