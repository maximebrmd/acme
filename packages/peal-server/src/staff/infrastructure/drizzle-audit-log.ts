import { asc, count, desc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import type { StaffActionRecord } from "#shared/application/personal-data.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { AuditLog } from "#staff/application/ports/audit-log.ts";
import { StaffRecords } from "#staff/application/staff-records.ts";
import { AuditEvent } from "#staff/domain/audit-event.ts";

import { auditEvents } from "./schema.ts";

type Row = typeof auditEvents.$inferSelect;

const failed = (cause: unknown) => new DatabaseError({ cause });

// Rows are decoded with the domain's schema, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeEvent = Schema.decodeUnknownEffect(AuditEvent);

const utc = (date: Date | null) =>
  Option.fromNullOr(date).pipe(
    Option.map((value) => DateTime.makeUnsafe(value))
  );

const eventOf = (row: Row) =>
  decodeEvent({
    action: row.action,
    at: DateTime.makeUnsafe(row.at),
    banExpiresAt: utc(row.banExpiresAt),
    id: row.id,
    objectIds: row.objectIds,
    operation: Option.fromNullOr(row.operation),
    reason: Option.fromNullOr(row.reason),
    staffId: Option.fromNullOr(row.staffId),
    targetId: Option.fromNullOr(row.targetId),
    workspaceId: Option.fromNullOr(row.workspaceId),
  }).pipe(Effect.orDie);

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

/** The audit log on the staff schema. */
export const DrizzleAuditLog = Layer.effect(
  AuditLog,
  Effect.gen(function* DrizzleAuditLog() {
    const db = yield* Drizzle;

    return AuditLog.of({
      read: Effect.fn("AuditLog.read")(function* read({
        limit,
        offset,
        targetId,
      }: {
        readonly limit: number;
        readonly offset: number;
        readonly targetId: Option.Option<UserId>;
      }) {
        const where = targetId.pipe(
          Option.map((id) => eq(auditEvents.targetId, id)),
          Option.getOrUndefined
        );

        const [counted] = yield* db
          .select({ total: count() })
          .from(auditEvents)
          .where(where)
          .pipe(Effect.mapError(failed));

        const rows = yield* db
          .select()
          .from(auditEvents)
          .where(where)
          .orderBy(desc(auditEvents.at), desc(auditEvents.id))
          .limit(limit)
          .offset(offset)
          .pipe(Effect.mapError(failed));

        return {
          items: yield* Effect.all(rows.map(eventOf)),
          total: counted?.total ?? 0,
        };
      }),
      record: (event) =>
        db
          .insert(auditEvents)
          .values({
            action: event.action,
            at: date(event.at),
            banExpiresAt: event.banExpiresAt.pipe(
              Option.map(date),
              Option.getOrNull
            ),
            id: event.id,
            objectIds: event.objectIds,
            operation: Option.getOrNull(event.operation),
            reason: Option.getOrNull(event.reason),
            staffId: Option.getOrNull(event.staffId),
            targetId: Option.getOrNull(event.targetId),
            workspaceId: Option.getOrNull(event.workspaceId),
          })
          .pipe(
            Effect.mapError(failed),
            Effect.asVoid,
            Effect.withSpan("AuditLog.record")
          ),
    });
  })
);

/** StaffRecords on the staff schema. */
export const DrizzleStaffRecords = Layer.effect(
  StaffRecords,
  Effect.gen(function* DrizzleStaffRecords() {
    const db = yield* Drizzle;

    return StaffRecords.of({
      exportUser: Effect.fn("StaffRecords.exportUser")(
        function* exportUser(userId) {
          const rows = yield* db
            .select()
            .from(auditEvents)
            .where(eq(auditEvents.targetId, userId))
            .orderBy(asc(auditEvents.at), asc(auditEvents.id))
            .pipe(Effect.mapError(failed));

          const events = yield* Effect.all(rows.map(eventOf));

          // Who did it is left out: it is staff's.
          return events.map((event): StaffActionRecord => ({
            action: event.action,
            at: event.at,
            banExpiresAt: Option.getOrNull(event.banExpiresAt),
            objectIds: event.objectIds,
            operation: Option.getOrNull(event.operation),
            reason: Option.getOrNull(event.reason),
            workspaceId: Option.getOrNull(event.workspaceId),
          }));
        }
      ),
      // What the user did as staff keeps their id: see the port.
      forgetUser: Effect.fn("StaffRecords.forgetUser")(
        function* forgetUser(userId) {
          yield* db
            .update(auditEvents)
            .set({ reason: null, targetId: null })
            .where(eq(auditEvents.targetId, userId))
            .pipe(Effect.mapError(failed));
        }
      ),
    });
  })
);
