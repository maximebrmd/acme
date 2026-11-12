import { and, asc, between, eq, inArray, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import type { WorkspaceUsageRecord } from "#billing/application/ports/usage-ledger.ts";
import { UsageRecordSchema } from "#billing/domain/usage-meter.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { usageDays } from "./schema.ts";

type Row = typeof usageDays.$inferSelect;

const failed = (cause: unknown) => new DatabaseError({ cause });

// A meter or a platform the domain does not know fails loudly instead of
// being trusted.
const decodeRecord = Schema.decodeUnknownEffect(UsageRecordSchema);

const toRecord = (row: Row) =>
  decodeRecord({
    day: DateTime.fromDateUnsafe(row.day),
    dimension: row.dimension,
    meter: row.meter,
    quantity: row.quantity,
  }).pipe(Effect.orDie);

const decodeWorkspaceId = Schema.decodeUnknownEffect(WorkspaceIdSchema);

const toEntry = (row: Row) =>
  Effect.all({
    record: toRecord(row),
    workspaceId: decodeWorkspaceId(row.workspaceId).pipe(Effect.orDie),
  });

const toRow = ({ record, workspaceId }: WorkspaceUsageRecord) => ({
  day: DateTime.toDateUtc(record.day),
  dimension: record.dimension,
  meter: record.meter,
  quantity: record.quantity,
  workspaceId,
});

const key = [
  usageDays.workspaceId,
  usageDays.day,
  usageDays.meter,
  usageDays.dimension,
];

/**
 * The usage ledger in the billing schema. Adding is one statement, an
 * insert that adds to the day's row, so counts made at the same time all
 * count; setting is one insert of the whole batch that replaces.
 */
export const DrizzleUsageLedgerLive = Layer.effect(
  UsageLedger,
  Effect.gen(function* DrizzleUsageLedgerLive() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const ordered = [
      asc(usageDays.day),
      asc(usageDays.meter),
      asc(usageDays.dimension),
    ];

    return UsageLedger.of({
      add: (entry) =>
        db
          .insert(usageDays)
          .values(toRow(entry))
          .onConflictDoUpdate({
            set: { quantity: sql`${usageDays.quantity} + excluded.quantity` },
            target: key,
          })
          .pipe(
            Effect.mapError(failed),
            Effect.asVoid,
            Effect.withSpan("UsageLedger.add")
          ),
      allOf: (workspaceId) =>
        db
          .select()
          .from(usageDays)
          .where(eq(usageDays.workspaceId, workspaceId))
          .orderBy(...ordered)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toRecord)),
            Effect.withSpan("UsageLedger.allOf")
          ),
      eraseWorkspace: (workspaceId) =>
        db
          .delete(usageDays)
          .where(eq(usageDays.workspaceId, workspaceId))
          .pipe(
            Effect.mapError(failed),
            Effect.asVoid,
            Effect.withSpan("UsageLedger.eraseWorkspace")
          ),
      ofWorkspace: (workspaceId, { from, to }) =>
        db
          .select()
          .from(usageDays)
          .where(
            and(
              eq(usageDays.workspaceId, workspaceId),
              between(
                usageDays.day,
                DateTime.toDateUtc(from),
                DateTime.toDateUtc(to)
              )
            )
          )
          .orderBy(...ordered)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toRecord)),
            Effect.withSpan("UsageLedger.ofWorkspace")
          ),
      // One read for the whole list (`workspace_id = any(…)`), on the
      // primary key, which starts with the workspace and the day; in no
      // order, as the report tallies them by day (a page of 101 workspaces
      // over 92 days is some 55,000 rows to sort otherwise).
      ofWorkspaces: (workspaceIds, { from, to }) =>
        workspaceIds.length === 0
          ? Effect.succeed([])
          : db
              .select()
              .from(usageDays)
              .where(
                and(
                  inArray(usageDays.workspaceId, [...workspaceIds]),
                  between(
                    usageDays.day,
                    DateTime.toDateUtc(from),
                    DateTime.toDateUtc(to)
                  )
                )
              )
              .pipe(
                Effect.mapError(failed),
                Effect.flatMap(Effect.forEach(toEntry)),
                Effect.withSpan("UsageLedger.ofWorkspaces")
              ),
      // Added up in the database, which reads the rows of every workspace
      // and returns one a day and platform.
      postsAcross: (workspaceIds, { from, to }) =>
        workspaceIds.length === 0
          ? Effect.succeed([])
          : db
              .select({
                day: usageDays.day,
                dimension: usageDays.dimension,
                meter: usageDays.meter,
                // A sum of bigints is a numeric, which the driver hands as text.
                quantity: sql`sum(${usageDays.quantity})`.mapWith(Number),
              })
              .from(usageDays)
              .where(
                and(
                  inArray(usageDays.workspaceId, [...workspaceIds]),
                  eq(usageDays.meter, "publishedPosts"),
                  between(
                    usageDays.day,
                    DateTime.toDateUtc(from),
                    DateTime.toDateUtc(to)
                  )
                )
              )
              .groupBy(usageDays.day, usageDays.meter, usageDays.dimension)
              .orderBy(asc(usageDays.day), asc(usageDays.dimension))
              .pipe(
                Effect.mapError(failed),
                Effect.flatMap(
                  Effect.forEach((row) =>
                    decodeRecord({
                      day: DateTime.fromDateUnsafe(row.day),
                      dimension: row.dimension,
                      meter: row.meter,
                      quantity: row.quantity,
                    }).pipe(Effect.orDie)
                  )
                ),
                Effect.withSpan("UsageLedger.postsAcross")
              ),
      // Counted in the database: a day's purge may be many rows.
      purgeBefore: (day) =>
        client<{
          readonly purged: number;
        }>`WITH purged AS (DELETE FROM billing.usage_days WHERE day < ${DateTime.formatIsoDateUtc(day)}::date RETURNING 1) SELECT count(*)::int AS purged FROM purged`.pipe(
          Effect.map((rows) => rows[0]?.purged ?? 0),
          Effect.mapError(failed),
          Effect.withSpan("UsageLedger.purgeBefore")
        ),
      set: (entries) =>
        entries.length === 0
          ? Effect.void
          : db
              .insert(usageDays)
              .values(entries.map(toRow))
              .onConflictDoUpdate({
                set: { quantity: sql`excluded.quantity` },
                target: key,
              })
              .pipe(
                Effect.mapError(failed),
                Effect.asVoid,
                Effect.withSpan("UsageLedger.set")
              ),
    });
  })
);
