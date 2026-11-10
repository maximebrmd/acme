import { Context, DateTime, Effect, Layer, Option } from "effect";

import { ActivityEventIdSchema } from "#activity/domain/activity-event-id.ts";
import { ActivityEvent } from "#activity/domain/activity-event.ts";
import type {
  ActivityActor,
  ActivityVia,
} from "#activity/domain/activity-event.ts";
import { retentionCutoff } from "#activity/domain/activity-retention.ts";
import { objectIdsOf } from "#activity/domain/object-ids.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ActivityEvents } from "./activity-events.ts";
import type { ActivityPage, ActivityPageRequest } from "./activity-events.ts";
import { ApplicationNames } from "./application-names.ts";

// Events deleted per statement, so one run never holds long locks.
const batchSize = 500;

/** A request that asked to change something in a workspace, once answered. */
export interface ActivityEntry {
  readonly actor: ActivityActor;
  /** The OAuth client the member acted through, if one. */
  readonly clientId: Option.Option<string>;
  /** The error's code, when the request was refused or failed. */
  readonly errorCode: Option.Option<string>;
  /** Staff acting as the member asked. */
  readonly impersonated: boolean;
  /**
   * What the request's path named, by name: only the entries shaped like
   * ids are kept.
   */
  readonly named: Readonly<Record<string, string | undefined>>;
  /** `group.endpoint`, or `mcp.<tool>`. */
  readonly operation: string;
  readonly requestId: Option.Option<string>;
  /** The HTTP status answered, when there is one. */
  readonly status: Option.Option<number>;
  readonly via: ActivityVia;
  readonly workspaceId: WorkspaceId;
}

/**
 * A workspace's activity log: who changed what, through which application.
 * The HTTP layer records every request that asks for a change, answered or
 * refused; the workspace's owners read it (`activity:read`); an event
 * leaves it once past its retention.
 */
export class ActivityLog extends Context.Service<
  ActivityLog,
  {
    /**
     * Keeps a request in its workspace's log, with the name of the key or
     * the application it came through. No permission is checked: whoever
     * answers requests records them.
     */
    readonly record: (
      entry: ActivityEntry
    ) => Effect.Effect<ActivityEvent, DatabaseError>;
    /** The actor's workspace's log, newest first, a page at a time. */
    readonly list: (
      actor: Actor,
      request: ActivityPageRequest
    ) => Effect.Effect<ActivityPage, DatabaseError | MissingPermission>;
    /** Deletes every event past its retention now, and says how many. */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/activity/application/ActivityLog") {
  static readonly layer = Layer.effect(
    ActivityLog,
    Effect.gen(function* ActivityLogLive() {
      const events = yield* ActivityEvents;
      const names = yield* ApplicationNames;
      const ids = yield* Ids;

      // The key, or the client, the request came through, as it is called
      // now.
      const applicationOf = (entry: ActivityEntry) => {
        const { actor } = entry;

        if (actor._tag === "apiKey") {
          return names
            .apiKey(entry.workspaceId, actor.apiKeyId)
            .pipe(
              Effect.map((name) => Option.some({ id: actor.apiKeyId, name }))
            );
        }

        return Option.match(entry.clientId, {
          onNone: () => Effect.succeedNone,
          onSome: (clientId) =>
            names
              .client(clientId)
              .pipe(Effect.map((name) => Option.some({ id: clientId, name }))),
        });
      };

      const record = Effect.fn("ActivityLog.record")(function* record(
        entry: ActivityEntry
      ) {
        const application = yield* applicationOf(entry);
        const id = ActivityEventIdSchema.make(yield* ids.next);

        const event = new ActivityEvent({
          actor: entry.actor,
          application,
          errorCode: entry.errorCode,
          id,
          impersonated: entry.impersonated,
          objectIds: objectIdsOf(entry.named),
          occurredAt: yield* DateTime.now,
          operation: entry.operation,
          requestId: entry.requestId,
          status: entry.status,
          via: entry.via,
          workspaceId: entry.workspaceId,
        });

        yield* events.insert(event);

        return event;
      });

      const list = Effect.fn("ActivityLog.list")(function* list(
        actor: Actor,
        request: ActivityPageRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "activity:read"));

        return yield* events.page(actor.workspaceId, request);
      });

      const untilShort = (
        before: DateTime.Utc,
        total: number
      ): Effect.Effect<number, DatabaseError> =>
        events
          .purge(before, batchSize)
          .pipe(
            Effect.flatMap((count) =>
              count < batchSize
                ? Effect.succeed(total + count)
                : untilShort(before, total + count)
            )
          );

      const purge = DateTime.now.pipe(
        Effect.flatMap((now) => untilShort(retentionCutoff(now), 0)),
        Effect.withSpan("ActivityLog.purge")
      );

      return ActivityLog.of({ list, purge, record });
    })
  );
}
