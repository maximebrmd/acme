import { and, asc, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { ActivityEvents } from "#activity/application/activity-events.ts";
import { ActivityEvent } from "#activity/domain/activity-event.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { events } from "./schema.ts";

type EventRow = typeof events.$inferSelect;

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = DateTime.toDateUtc;

const decodeEvent = Schema.decodeUnknownEffect(ActivityEvent);

// A user's id is a UUID: anything else names no user, and Postgres would
// refuse to compare it with one.
const isUuid = Schema.is(Schema.String.check(Schema.isUUID()));

const actorOf = (row: EventRow) =>
  row.actorKind === "apiKey"
    ? { _tag: "apiKey", apiKeyId: row.apiKeyId }
    : { _tag: "user", userId: Option.fromNullishOr(row.userId) };

// A row that no longer reads as an event is a bug in what wrote it.
const toEvent = (row: EventRow) =>
  decodeEvent({
    actor: actorOf(row),
    application: Option.fromNullishOr(row.applicationId).pipe(
      Option.map((id) => ({
        id,
        name: Option.fromNullishOr(row.applicationName),
      }))
    ),
    errorCode: Option.fromNullishOr(row.errorCode),
    id: row.id,
    impersonated: row.impersonated,
    objectIds: row.objectIds,
    occurredAt: DateTime.fromDateUnsafe(row.occurredAt),
    operation: row.operation,
    requestId: Option.fromNullishOr(row.requestId),
    status: Option.fromNullishOr(row.status),
    via: row.via,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const rowOf = (event: ActivityEvent): typeof events.$inferInsert => {
  const { actor } = event;
  const application = Option.getOrUndefined(event.application);

  return {
    actorKind: actor._tag,
    apiKeyId: actor._tag === "apiKey" ? actor.apiKeyId : null,
    applicationId: application?.id ?? null,
    applicationName:
      application === undefined ? null : Option.getOrNull(application.name),
    errorCode: Option.getOrNull(event.errorCode),
    id: event.id,
    impersonated: event.impersonated,
    objectIds: event.objectIds,
    occurredAt: date(event.occurredAt),
    operation: event.operation,
    requestId: Option.getOrNull(event.requestId),
    status: Option.getOrNull(event.status),
    userId: actor._tag === "user" ? Option.getOrNull(actor.userId) : null,
    via: event.via,
    workspaceId: event.workspaceId,
  };
};

// The events a member or a key made: an id that is not a UUID names no
// member.
const madeByActor = (actorId: string) =>
  isUuid(actorId)
    ? or(eq(events.userId, actorId), eq(events.apiKeyId, actorId))
    : eq(events.apiKeyId, actorId);

/** The activity logs in the activity schema. */
export const DrizzleActivityEvents = Layer.effect(
  ActivityEvents,
  Effect.gen(function* DrizzleActivityEvents() {
    const db = yield* Drizzle;

    return ActivityEvents.of({
      eraseWorkspace: (workspaceId) =>
        db
          .delete(events)
          .where(eq(events.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      forgetUser: Effect.fn("ActivityEvents.forgetUser")(
        function* forgetUser(userId) {
          // What they did stays, as the workspace's, without them and
          // without the application they came through, which was theirs.
          yield* db
            .update(events)
            .set({ applicationId: null, applicationName: null, userId: null })
            .where(eq(events.userId, userId))
            .pipe(Effect.mapError(failed));

          // Their id wherever another event names it.
          const named = sql`select name, value from jsonb_each_text(${events.objectIds}) as named(name, value)`;

          yield* db
            .update(events)
            .set({
              objectIds: sql`coalesce((select jsonb_object_agg(name, value) from (${named}) as kept where value <> ${userId}), '{}'::jsonb)`,
            })
            .where(
              sql`exists (select 1 from (${named}) as found where value = ${userId})`
            )
            .pipe(Effect.mapError(failed));
        }
      ),
      insert: (event) =>
        db
          .insert(events)
          .values(rowOf(event))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      madeBy: Effect.fn("ActivityEvents.madeBy")(function* madeBy(userId) {
        const rows = yield* db
          .select()
          .from(events)
          .where(eq(events.userId, userId))
          .orderBy(asc(events.id))
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map((row) => toEvent(row)));
      }),
      page: Effect.fn("ActivityEvents.page")(function* page(
        workspaceId,
        { actorId, after, limit, operation }
      ) {
        const rows = yield* db
          .select()
          .from(events)
          .where(
            and(
              eq(events.workspaceId, workspaceId),
              after.pipe(
                Option.map((id) => lt(events.id, id)),
                Option.getOrUndefined
              ),
              operation.pipe(
                Option.map((name) => eq(events.operation, name)),
                Option.getOrUndefined
              ),
              actorId.pipe(Option.map(madeByActor), Option.getOrUndefined)
            )
          )
          .orderBy(desc(events.id))
          .limit(limit + 1)
          .pipe(Effect.mapError(failed));

        const items = yield* Effect.forEach(rows.slice(0, limit), toEvent);
        const last = items.at(-1);

        return {
          items,
          next:
            rows.length > limit && last !== undefined
              ? Option.some(last.id)
              : Option.none(),
        };
      }),
      purge: Effect.fn("ActivityEvents.purge")(function* purge(before, limit) {
        const expired = db
          .select({ id: events.id })
          .from(events)
          .where(lt(events.occurredAt, date(before)))
          .orderBy(events.occurredAt)
          .limit(limit);

        const removed = yield* db
          .delete(events)
          .where(inArray(events.id, expired))
          .returning({ id: events.id })
          .pipe(Effect.mapError(failed));

        return removed.length;
      }),
    });
  })
);
