import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ActivityEventId } from "#activity/domain/activity-event-id.ts";
import type { ActivityEvent } from "#activity/domain/activity-event.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** A page of a workspace's activity log, newest first. */
export interface ActivityPageRequest {
  /**
   * Only what this member or API key asked for: a user's id or a key's.
   */
  readonly actorId: Option.Option<string>;
  /** The last event of the page before, if this is not the first. */
  readonly after: Option.Option<ActivityEventId>;
  readonly limit: number;
  /** Only this operation (`posts.schedule`). */
  readonly operation: Option.Option<string>;
}

export interface ActivityPage {
  readonly items: readonly ActivityEvent[];
  /** Where the next page starts, if there is one. */
  readonly next: Option.Option<ActivityEventId>;
}

/**
 * The activity logs of every workspace: ids, names of operations, codes
 * and instants, never what a request carried.
 */
export class ActivityEvents extends Context.Service<
  ActivityEvents,
  {
    readonly insert: (
      event: ActivityEvent
    ) => Effect.Effect<void, DatabaseError>;
    readonly page: (
      workspaceId: WorkspaceId,
      request: ActivityPageRequest
    ) => Effect.Effect<ActivityPage, DatabaseError>;
    /**
     * Deletes up to `limit` events that occurred before `before`, and says
     * how many went.
     */
    readonly purge: (
      before: DateTime.Utc,
      limit: number
    ) => Effect.Effect<number, DatabaseError>;
    /** Deletes the workspace's events. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Takes the user out of every log: the events they made lose their id
     * and the application they came through, and their id leaves the ids
     * other events name.
     */
    readonly forgetUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
    /** The events the user made, in any workspace, oldest first. */
    readonly madeBy: (
      userId: UserId
    ) => Effect.Effect<readonly ActivityEvent[], DatabaseError>;
  }
>()("peal-server/activity/application/ActivityEvents") {}
