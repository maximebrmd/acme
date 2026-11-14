import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's own rate limit, as staff set it. */
export interface RequestLimitOverride {
  readonly requestsPerMinute: number;
  readonly setAt: DateTime.Utc;
  readonly workspaceId: WorkspaceId;
}

/**
 * The rate limits staff set for workspaces, in place of their standing's
 * (`activity.request_limits`): what the row says, never who set it, which
 * the staff audit log keeps.
 */
export class RequestLimitOverrides extends Context.Service<
  RequestLimitOverrides,
  {
    /** The overrides of these workspaces, those without one left out. */
    readonly of: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, RequestLimitOverride>,
      DatabaseError
    >;
    /** Sets the workspace's override. */
    readonly set: (
      workspaceId: WorkspaceId,
      requestsPerMinute: number,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** Removes it: the workspace's standing decides again. */
    readonly remove: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/activity/application/RequestLimitOverrides") {}
