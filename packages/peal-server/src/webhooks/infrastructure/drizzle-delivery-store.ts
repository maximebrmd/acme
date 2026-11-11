import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  gte,
  inArray,
  lt,
  notExists,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import type {
  DeliveryFilters,
  FailedSelection,
} from "#webhooks/application/ports/delivery-store.ts";
import { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";
import { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import { WebhookEventSchema } from "#webhooks/domain/webhook-event.ts";

import { deliveries, events } from "./schema.ts";

type DeliveryRow = typeof deliveries.$inferSelect;

// A delivery with what its event says of where it happened.
interface LoggedRow {
  readonly delivery: DeliveryRow;
  readonly eventWorkspaceId: string;
  readonly externalId: string | null;
}

const logged = {
  delivery: deliveries,
  eventWorkspaceId: events.workspaceId,
  externalId: events.externalId,
};

const withEvent = eq(events.id, deliveries.eventId);

// Another delivery of the same event to the same endpoint, made later.
const newer = alias(deliveries, "newer");

const isNewer = and(
  eq(newer.endpointId, deliveries.endpointId),
  eq(newer.eventId, deliveries.eventId),
  gt(newer.id, deliveries.id)
);

const within = (
  since: FailedSelection["since"],
  until: FailedSelection["until"]
): readonly (SQL | undefined)[] => [
  since.pipe(
    Option.map((at) => gte(deliveries.createdAt, DateTime.toDateUtc(at))),
    Option.getOrUndefined
  ),
  until.pipe(
    Option.map((at) => lt(deliveries.createdAt, DateTime.toDateUtc(at))),
    Option.getOrUndefined
  ),
];

const matching = (filters: DeliveryFilters): readonly (SQL | undefined)[] => [
  filters.endpointId.pipe(
    Option.map((id) => eq(deliveries.endpointId, id)),
    Option.getOrUndefined
  ),
  filters.status.pipe(
    Option.map((status) => eq(deliveries.status, status)),
    Option.getOrUndefined
  ),
  filters.eventType.pipe(
    Option.map((type) => eq(deliveries.eventType, type)),
    Option.getOrUndefined
  ),
  ...within(filters.since, filters.until),
];

type EventRow = typeof events.$inferSelect;

// Events are stored as the JSON receivers get, which their schema reads
// back: fields are only ever added to it.
const EventJson = Schema.toCodecJson(WebhookEventSchema);

const encodeEvent = Schema.encodeEffect(EventJson);

const decodeEvent = Schema.decodeUnknownEffect(EventJson);

const DataSchema = Schema.Struct({ data: Schema.Json });

const decodeData = Schema.decodeUnknownEffect(DataSchema);

// Rows are decoded with the domain's schema, so a row the domain could not
// have written fails loudly instead of being trusted.
const decodeDelivery = Schema.decodeUnknownEffect(WebhookDelivery);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const utc = (stored: Date | null) =>
  Option.fromNullOr(stored).pipe(
    Option.map((at) => DateTime.fromDateUnsafe(at))
  );

const toEvent = (row: EventRow) =>
  decodeEvent({ data: row.data, type: row.type }).pipe(
    Effect.orDie,
    Effect.map(
      (event) =>
        new RecordedEvent({
          event,
          externalId: Option.fromNullOr(row.externalId),
          id: WebhookEventIdSchema.make(row.id),
          occurredAt: DateTime.fromDateUnsafe(row.occurredAt),
          sample: row.sample,
          workspaceId: event.data.workspaceId,
        })
    )
  );

// The status in DeliveryStatus's encoded form, checked as the row decodes.
const statusOf = (row: DeliveryRow) => {
  if (row.status === "pending") {
    return { _tag: row.status, nextAttemptAt: utc(row.nextAttemptAt) };
  }

  const at = Option.getOrUndefined(utc(row.completedAt));

  return row.status === "failed"
    ? { _tag: row.status, at, reason: row.failureReason }
    : { _tag: row.status, at };
};

// The last attempt in DeliveryAttempt's encoded form, none before the first.
const lastAttemptOf = (row: DeliveryRow) =>
  utc(row.lastAttemptAt).pipe(
    Option.map((at) => ({
      at,
      durationMs: row.durationMs,
      outcome:
        row.responseStatus === null
          ? { _tag: "unanswered", reason: row.attemptError }
          : {
              _tag: "answered",
              excerpt: Option.fromNullOr(row.responseExcerpt),
              status: row.responseStatus,
            },
    }))
  );

const toDelivery = ({
  delivery: row,
  eventWorkspaceId,
  externalId,
}: LoggedRow) =>
  decodeDelivery({
    attempts: row.attempts,
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    endpointId: row.endpointId,
    eventId: row.eventId,
    eventType: row.eventType,
    eventWorkspaceId,
    externalId: Option.fromNullOr(externalId),
    id: row.id,
    lastAttempt: lastAttemptOf(row),
    redeliveryOf: Option.fromNullOr(row.redeliveryOf),
    status: statusOf(row),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

// Where a delivery's attempts stand: every column an attempt changes.
const progressOf = (delivery: WebhookDelivery) => {
  const { status } = delivery;
  const last = Option.getOrUndefined(delivery.lastAttempt);
  const outcome = last?.outcome;

  return {
    attemptError: outcome?._tag === "unanswered" ? outcome.reason : null,
    attempts: delivery.attempts,
    completedAt: status._tag === "pending" ? null : date(status.at),
    durationMs: last?.durationMs ?? null,
    failureReason: status._tag === "failed" ? status.reason : null,
    lastAttemptAt: last === undefined ? null : date(last.at),
    nextAttemptAt:
      status._tag === "pending"
        ? status.nextAttemptAt.pipe(Option.map(date), Option.getOrNull)
        : null,
    responseExcerpt:
      outcome?._tag === "answered" ? Option.getOrNull(outcome.excerpt) : null,
    responseStatus: outcome?._tag === "answered" ? outcome.status : null,
    status: status._tag,
  };
};

const someDelivery = (rows: readonly LoggedRow[]) =>
  Option.fromUndefinedOr(rows[0]).pipe(
    Option.match({
      onNone: () => Effect.succeed(Option.none<WebhookDelivery>()),
      onSome: (row) => toDelivery(row).pipe(Effect.map(Option.some)),
    })
  );

/** Webhook events and deliveries in the webhooks schema. */
export const DrizzleDeliveryStore = Layer.effect(
  DeliveryStore,
  Effect.gen(function* DrizzleDeliveryStore() {
    const db = yield* Drizzle;

    return DeliveryStore.of({
      event: (eventId) =>
        db
          .select()
          .from(events)
          .where(eq(events.id, eventId))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeed(Option.none<RecordedEvent>())
                : toEvent(row).pipe(Effect.map(Option.some))
            )
          ),
      findIn: (workspaceId, endpointId, deliveryId) =>
        db
          .select(logged)
          .from(deliveries)
          .innerJoin(events, withEvent)
          .where(
            and(
              eq(deliveries.id, deliveryId),
              eq(deliveries.endpointId, endpointId),
              eq(deliveries.workspaceId, workspaceId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(someDelivery)),
      get: (deliveryId) =>
        db
          .select(logged)
          .from(deliveries)
          .innerJoin(events, withEvent)
          .where(eq(deliveries.id, deliveryId))
          .pipe(Effect.mapError(failed), Effect.flatMap(someDelivery)),
      insert: (delivery) =>
        db
          .insert(deliveries)
          .values({
            ...progressOf(delivery),
            createdAt: date(delivery.createdAt),
            endpointId: delivery.endpointId,
            eventId: delivery.eventId,
            eventType: delivery.eventType,
            id: delivery.id,
            redeliveryOf: Option.getOrNull(delivery.redeliveryOf),
            workspaceId: delivery.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      lockFailed: Effect.fn("DeliveryStore.lockFailed")(
        function* lockFailed(endpointId, selection, limit) {
          const where = and(
            eq(deliveries.endpointId, endpointId),
            eq(deliveries.status, "failed"),
            selection.eventType.pipe(
              Option.map((type) => eq(deliveries.eventType, type)),
              Option.getOrUndefined
            ),
            ...within(selection.since, selection.until),
            // The last delivery of its event to the endpoint: one sent again
            // since, however it went, stands for it.
            notExists(
              db
                .select({ one: sql`1` })
                .from(newer)
                .where(isNewer)
            )
          );

          const rows = yield* db
            .select(logged)
            .from(deliveries)
            .innerJoin(events, withEvent)
            .where(where)
            .orderBy(asc(deliveries.id))
            .limit(limit)
            .for("update", { of: deliveries })
            .pipe(Effect.mapError(failed));

          const [counted] = yield* db
            .select({ total: count() })
            .from(deliveries)
            .where(where)
            .pipe(Effect.mapError(failed));

          return {
            deliveries: yield* Effect.forEach(rows, toDelivery, {
              concurrency: 1,
            }),
            total: counted?.total ?? rows.length,
          };
        }
      ),
      lockIn: (workspaceId, deliveryIds) =>
        deliveryIds.length === 0
          ? Effect.succeed([])
          : db
              .select(logged)
              .from(deliveries)
              .innerJoin(events, withEvent)
              .where(
                and(
                  eq(deliveries.workspaceId, workspaceId),
                  inArray(deliveries.id, [...deliveryIds])
                )
              )
              .orderBy(asc(deliveries.id))
              .for("update", { of: deliveries })
              .pipe(
                Effect.mapError(failed),
                Effect.flatMap(Effect.forEach(toDelivery))
              ),
      purge: Effect.fn("DeliveryStore.purge")(function* purge(before, limit) {
        const expired = db
          .select({ id: deliveries.id })
          .from(deliveries)
          .where(lt(deliveries.createdAt, date(before)))
          .orderBy(deliveries.createdAt)
          .limit(limit);

        const removed = yield* db
          .delete(deliveries)
          .where(inArray(deliveries.id, expired))
          .returning({ id: deliveries.id })
          .pipe(Effect.mapError(failed));

        // An event stays while a delivery refers to it, as one sent again
        // since does.
        yield* db
          .delete(events)
          .where(
            and(
              lt(events.occurredAt, date(before)),
              notExists(
                db
                  .select({ one: sql`1` })
                  .from(deliveries)
                  .where(eq(deliveries.eventId, events.id))
              )
            )
          )
          .pipe(Effect.mapError(failed));

        return removed.length;
      }),
      recordEvent: Effect.fn("DeliveryStore.recordEvent")(
        function* recordEvent(recorded, key) {
          const { data } = yield* encodeEvent(recorded.event).pipe(
            Effect.flatMap(decodeData),
            Effect.orDie
          );

          const rows = yield* db
            .insert(events)
            .values({
              data,
              externalId: Option.getOrNull(recorded.externalId),
              id: recorded.id,
              key,
              occurredAt: date(recorded.occurredAt),
              sample: recorded.sample,
              type: recorded.event.type,
              workspaceId: recorded.workspaceId,
            })
            .onConflictDoNothing({ target: events.key })
            .returning({ id: events.id })
            .pipe(Effect.mapError(failed));

          return rows.length > 0;
        }
      ),
      save: (delivery) =>
        db
          .update(deliveries)
          .set(progressOf(delivery))
          .where(eq(deliveries.id, delivery.id))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      search: Effect.fn("DeliveryStore.search")(function* search(
        workspaceId,
        filters,
        { after, limit }
      ) {
        const rows = yield* db
          .select(logged)
          .from(deliveries)
          .innerJoin(events, withEvent)
          .where(
            and(
              eq(deliveries.workspaceId, workspaceId),
              ...matching(filters),
              after.pipe(
                Option.map((id) => lt(deliveries.id, id)),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(desc(deliveries.id))
          .limit(limit + 1)
          .pipe(Effect.mapError(failed));

        const items = yield* Effect.forEach(rows.slice(0, limit), toDelivery);
        const last = items.at(-1);

        return {
          items,
          next:
            rows.length > limit && last !== undefined
              ? Option.some(last.id)
              : Option.none(),
        };
      }),
      sentAgain: Effect.fn("DeliveryStore.sentAgain")(
        function* sentAgain(among) {
          if (among.length === 0) {
            return new Set<WebhookDeliveryId>();
          }

          const rows = yield* db
            .select({ id: deliveries.id })
            .from(deliveries)
            .where(
              and(
                inArray(
                  deliveries.id,
                  among.map(({ id }) => id)
                ),
                exists(
                  db
                    .select({ one: sql`1` })
                    .from(newer)
                    .where(
                      and(
                        isNewer,
                        inArray(newer.status, ["pending", "succeeded"])
                      )
                    )
                )
              )
            )
            .pipe(Effect.mapError(failed));

          const ids = new Set(rows.map(({ id }) => id));

          return new Set(
            among.filter(({ id }) => ids.has(id)).map(({ id }) => id)
          );
        }
      ),
    });
  })
);
