import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ActivityRecord } from "#shared/application/personal-data.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { ActivityEvents } from "./activity-events.ts";
import { RequestLimitOverrides } from "./request-limit-overrides.ts";

/**
 * What the activity logs keep about a workspace or a user, for the
 * workspace context when data is copied out or erased. Erasing runs in the
 * caller's transaction, if any.
 */
export class ActivityRecords extends Context.Service<
  ActivityRecords,
  {
    /** Deletes the workspace's log, and the rate limit staff set for it. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Forgets the user in the logs of the workspaces that remain: the
     * events they made stay, as the workspace's, without their id and
     * without the application they came through, and their id leaves the
     * ids other events name.
     */
    readonly forgetUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
    /**
     * The changes the user asked for, oldest first: when, which operation,
     * in which workspace, how they authenticated and the status answered.
     * Nothing of what anyone else did.
     */
    readonly exportUser: (
      userId: UserId
    ) => Effect.Effect<readonly ActivityRecord[], DatabaseError>;
  }
>()("peal-server/activity/application/ActivityRecords") {
  static readonly layer = Layer.effect(
    ActivityRecords,
    Effect.gen(function* ActivityRecordsLive() {
      const events = yield* ActivityEvents;
      const overrides = yield* RequestLimitOverrides;

      return ActivityRecords.of({
        eraseWorkspace: (workspaceId) =>
          events
            .eraseWorkspace(workspaceId)
            .pipe(Effect.andThen(overrides.remove(workspaceId))),
        exportUser: (userId) =>
          events.madeBy(userId).pipe(
            Effect.map((made) =>
              made.map((event) => ({
                at: event.occurredAt,
                byStaff: event.impersonated,
                operation: event.operation,
                status: Option.getOrNull(event.status),
                via: event.via,
                workspaceId: event.workspaceId,
              }))
            )
          ),
        forgetUser: (userId) => events.forgetUser(userId),
      });
    })
  );
}
