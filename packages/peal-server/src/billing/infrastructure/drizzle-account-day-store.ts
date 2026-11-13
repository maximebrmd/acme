import { and, asc, between, eq, isNull, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { AccountDayStore } from "#billing/application/ports/account-day-store.ts";
import type {
  MeterReport,
  PeakRaise,
} from "#billing/application/ports/account-day-store.ts";
import type { AccountDay } from "#billing/domain/account-days.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { accountDays, meterReports } from "./schema.ts";

type DayRow = typeof accountDays.$inferSelect;

type ReportRow = typeof meterReports.$inferSelect;

const failed = (cause: unknown) => new DatabaseError({ cause });

// A holder that is no workspace id fails loudly instead of being trusted.
const decodeWorkspaceId = Schema.decodeUnknownEffect(WorkspaceIdSchema);

const toDay = (row: DayRow) =>
  decodeWorkspaceId(row.holderWorkspaceId).pipe(
    Effect.orDie,
    Effect.map((holder): AccountDay => ({
      day: DateTime.fromDateUnsafe(row.day),
      holder,
      peak: row.peak,
      reported: row.reported,
    }))
  );

const toReport = (row: ReportRow) =>
  decodeWorkspaceId(row.holderWorkspaceId).pipe(
    Effect.orDie,
    Effect.map((holder): MeterReport => ({
      createdAt: DateTime.fromDateUnsafe(row.createdAt),
      eventName: row.eventName,
      holder,
      identifier: row.identifier,
      occurredAt: DateTime.fromDateUnsafe(row.occurredAt),
      stripeCustomerId: row.stripeCustomerId,
      value: row.value,
    }))
  );

// One count a holder: a statement may not raise one row twice.
const highestOf = (counts: readonly PeakRaise[]): readonly PeakRaise[] => {
  const highest = new Map<string, PeakRaise>();

  for (const raise of counts) {
    const found = highest.get(raise.holder);

    if (found === undefined || found.count < raise.count) {
      highest.set(raise.holder, raise);
    }
  }

  return [...highest.values()].toSorted((left, right) =>
    left.holder.localeCompare(right.holder)
  );
};

const unsentNow = and(
  isNull(meterReports.sentAt),
  isNull(meterReports.refusal)
);

/**
 * The account-days and the outbox in the billing schema. A raise is one
 * insert that keeps the higher peak, its rows locked to the transaction's
 * end, so raises of a holder take turns and none is lost.
 */
export const DrizzleAccountDayStoreLive = Layer.effect(
  AccountDayStore,
  Effect.gen(function* DrizzleAccountDayStoreLive() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const raise = (day: DateTime.Utc, counts: readonly PeakRaise[]) => {
      const rows = highestOf(counts).map(({ count, holder }) => ({
        day: DateTime.toDateUtc(day),
        holderWorkspaceId: holder,
        peak: count,
      }));

      return rows.length === 0
        ? Effect.succeed([])
        : db
            .insert(accountDays)
            .values(rows)
            .onConflictDoUpdate({
              set: { peak: sql`greatest(${accountDays.peak}, excluded.peak)` },
              target: [accountDays.holderWorkspaceId, accountDays.day],
            })
            .returning()
            .pipe(
              Effect.mapError(failed),
              Effect.flatMap(Effect.forEach(toDay)),
              Effect.withSpan("AccountDayStore.raise")
            );
    };

    const enqueue = (
      reports: readonly MeterReport[],
      reported: readonly Pick<AccountDay, "day" | "holder" | "reported">[]
    ) =>
      Effect.gen(function* enqueued() {
        if (reports.length > 0) {
          yield* db
            .insert(meterReports)
            .values(
              reports.map((report) => ({
                createdAt: DateTime.toDateUtc(report.createdAt),
                eventName: report.eventName,
                holderWorkspaceId: report.holder,
                identifier: report.identifier,
                occurredAt: DateTime.toDateUtc(report.occurredAt),
                stripeCustomerId: report.stripeCustomerId,
                value: report.value,
              }))
            )
            .onConflictDoNothing();
        }

        // One statement for the whole batch, its values three text
        // parameters split in the database: never more reported than
        // the day holds, nor less than it had.
        if (reported.length > 0) {
          yield* client`UPDATE billing.account_days AS d SET reported = greatest(d.reported, least(d.peak, v.reported)) FROM unnest(string_to_array(${reported.map(({ holder }) => holder).join(",")}, ',')::uuid[], string_to_array(${reported.map(({ day }) => DateTime.formatIsoDateUtc(day)).join(",")}, ',')::date[], string_to_array(${reported.map((day) => String(day.reported)).join(",")}, ',')::integer[]) AS v(holder, day, reported) WHERE d.holder_workspace_id = v.holder AND d.day = v.day`;
        }
      }).pipe(
        Effect.mapError(failed),
        Effect.withSpan("AccountDayStore.enqueue")
      );

    const ofHolders = (
      holders: readonly string[],
      { from, to }: { readonly from: DateTime.Utc; readonly to: DateTime.Utc }
    ) =>
      holders.length === 0
        ? Effect.succeed([])
        : db
            .select()
            .from(accountDays)
            .where(
              and(
                anyUuid(accountDays.holderWorkspaceId, holders),
                between(
                  accountDays.day,
                  DateTime.toDateUtc(from),
                  DateTime.toDateUtc(to)
                )
              )
            )
            .orderBy(asc(accountDays.holderWorkspaceId), asc(accountDays.day))
            .pipe(
              Effect.mapError(failed),
              Effect.flatMap(Effect.forEach(toDay)),
              Effect.withSpan("AccountDayStore.ofHolders")
            );

    const unsent = (
      after: Option.Option<{
        readonly createdAt: DateTime.Utc;
        readonly identifier: string;
      }>,
      limit: number
    ) =>
      db
        .select()
        .from(meterReports)
        .where(
          Option.match(after, {
            onNone: () => unsentNow,
            onSome: (cursor) =>
              and(
                unsentNow,
                sql`(${meterReports.createdAt}, ${meterReports.identifier}) > (${DateTime.toDateUtc(cursor.createdAt)}, ${cursor.identifier})`
              ),
          })
        )
        .orderBy(asc(meterReports.createdAt), asc(meterReports.identifier))
        .limit(limit)
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(Effect.forEach(toReport)),
          Effect.withSpan("AccountDayStore.unsent")
        );

    // The identifiers as one text parameter split in the database: they
    // hold no comma.
    const markSent = (identifiers: readonly string[], at: DateTime.Utc) =>
      identifiers.length === 0
        ? Effect.void
        : client`UPDATE billing.meter_reports SET sent_at = ${DateTime.toDateUtc(at)} WHERE identifier = ANY(string_to_array(${identifiers.join(",")}, ',')) AND sent_at IS NULL`.pipe(
            Effect.mapError(failed),
            Effect.asVoid,
            Effect.withSpan("AccountDayStore.markSent")
          );

    const markRefused = (identifier: string, refusal: string) =>
      db
        .update(meterReports)
        .set({ refusal })
        .where(and(eq(meterReports.identifier, identifier), unsentNow))
        .pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("AccountDayStore.markRefused")
        );

    const backlog = client<{
      readonly left: number;
      readonly oldest: Date | null;
    }>`SELECT count(*)::int AS left, min(created_at) AS oldest FROM billing.meter_reports WHERE sent_at IS NULL AND refusal IS NULL`.pipe(
      Effect.map(([row]) => ({
        left: row?.left ?? 0,
        oldest: Option.fromNullOr(row?.oldest ?? null).pipe(
          Option.map((oldest) => DateTime.fromDateUnsafe(new Date(oldest)))
        ),
      })),
      Effect.mapError(failed),
      Effect.withSpan("AccountDayStore.backlog")
    );

    // Counted in the database: a day's purge may be many rows.
    const purgeBefore = (cutoff: DateTime.Utc) =>
      Effect.gen(function* purged() {
        const day = DateTime.formatIsoDateUtc(cutoff);
        const instant = DateTime.toDateUtc(cutoff);

        const [days] = yield* client<{
          readonly purged: number;
        }>`WITH purged AS (DELETE FROM billing.account_days WHERE day < ${day}::date RETURNING 1) SELECT count(*)::int AS purged FROM purged`;

        const [sent] = yield* client<{
          readonly purged: number;
        }>`WITH purged AS (DELETE FROM billing.meter_reports WHERE sent_at < ${instant} OR (sent_at IS NULL AND created_at < ${instant}) RETURNING 1) SELECT count(*)::int AS purged FROM purged`;

        return (days?.purged ?? 0) + (sent?.purged ?? 0);
      }).pipe(
        Effect.mapError(failed),
        Effect.withSpan("AccountDayStore.purgeBefore")
      );

    const eraseWorkspace = (workspaceId: string) =>
      Effect.all([
        db
          .delete(accountDays)
          .where(eq(accountDays.holderWorkspaceId, workspaceId)),
        db
          .delete(meterReports)
          .where(eq(meterReports.holderWorkspaceId, workspaceId)),
      ]).pipe(
        Effect.mapError(failed),
        Effect.asVoid,
        Effect.withSpan("AccountDayStore.eraseWorkspace")
      );

    const allOf = (workspaceId: string) =>
      Effect.all({
        days: db
          .select()
          .from(accountDays)
          .where(eq(accountDays.holderWorkspaceId, workspaceId))
          .orderBy(asc(accountDays.day))
          .pipe(Effect.mapError(failed), Effect.flatMap(Effect.forEach(toDay))),
        reports: db
          .select()
          .from(meterReports)
          .where(eq(meterReports.holderWorkspaceId, workspaceId))
          .orderBy(asc(meterReports.createdAt), asc(meterReports.identifier))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach((row) =>
                toReport(row).pipe(
                  Effect.map((report) => ({
                    ...report,
                    sentAt: Option.fromNullOr(row.sentAt).pipe(
                      Option.map((sent) => DateTime.fromDateUnsafe(sent))
                    ),
                  }))
                )
              )
            )
          ),
      }).pipe(Effect.withSpan("AccountDayStore.allOf"));

    return AccountDayStore.of({
      allOf,
      backlog,
      enqueue,
      eraseWorkspace,
      markRefused,
      markSent,
      ofHolders,
      purgeBefore,
      raise,
      unsent,
    });
  })
);
