import { and, desc, eq, inArray, lt, notExists, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import { WebhookEventSchema } from "#webhooks/domain/webhook-event.ts";

import { deliveries, events } from "./schema.ts";

type DeliveryRow = typeof deliveries.$inferSelect;

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
          id: WebhookEventIdSchema.make(row.id),
          occurredAt: DateTime.fromDateUnsafe(row.occurredAt),
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

const toDelivery = (row: DeliveryRow) =>
  decodeDelivery({
    attempts: row.attempts,
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    endpointId: row.endpointId,
    eventId: row.eventId,
    eventType: row.eventType,
    id: row.id,
    lastAttempt: lastAttemptOf(row),
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

const someDelivery = (rows: readonly DeliveryRow[]) =>
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
          .select()
          .from(deliveries)
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
          .select()
          .from(deliveries)
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
            workspaceId: delivery.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      page: Effect.fn("DeliveryStore.page")(function* page(
        endpointId,
        { after, limit }
      ) {
        const rows = yield* db
          .select()
          .from(deliveries)
          .where(
            and(
              eq(deliveries.endpointId, endpointId),
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
              id: recorded.id,
              key,
              occurredAt: date(recorded.occurredAt),
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
    });
  })
);
