import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UsageRecord } from "#shared/application/personal-data.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's assistant usage as a whole, for the workspace context when a
 * workspace's data is exported or erased. Erasing runs in the caller's
 * transaction, if any.
 */
export class UsageRecords extends Context.Service<
  UsageRecords,
  {
    /** The workspace's request counts, by UTC day, oldest first. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly UsageRecord[], DatabaseError>;
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/assistant/application/UsageRecords") {}
