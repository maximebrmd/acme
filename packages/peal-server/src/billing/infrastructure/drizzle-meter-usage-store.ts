import { and, asc, eq, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { MeterUsageStore } from "#billing/application/ports/meter-usage-store.ts";
import type {
  MeterRow,
  SpendCeiling,
} from "#billing/application/ports/meter-usage-store.ts";
import { SpendGroupSchema } from "#billing/domain/meter-claims.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { MeterSchema } from "#shared/domain/meter.ts";
import type { Meter } from "#shared/domain/meter.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { meterUsage, spendCeilings } from "./schema.ts";

type UsageRow = typeof meterUsage.$inferSelect;

type CeilingRow = typeof spendCeilings.$inferSelect;

const failed = (cause: unknown) => new DatabaseError({ cause });

// A meter or a group the domain does not know fails loudly instead of
// being trusted.
const decodeMeter = Schema.decodeUnknownEffect(MeterSchema);

const decodeGroup = Schema.decodeUnknownEffect(SpendGroupSchema);

const toRow = (row: UsageRow) =>
  decodeMeter(row.meter).pipe(
    Effect.orDie,
    Effect.map((meter): MeterRow => ({
      events: row.events,
      meter,
      reported: row.reported,
      used: row.used,
    }))
  );

const toCeiling = (row: CeilingRow) =>
  decodeGroup(row.group).pipe(
    Effect.orDie,
    Effect.map((group): SpendCeiling => ({
      cents: row.cents,
      group,
      setAt: DateTime.fromDateUnsafe(row.setAt),
    }))
  );

const ofMonthWhere = (holder: WorkspaceId, month: DateTime.Utc) =>
  and(
    eq(meterUsage.holderWorkspaceId, holder),
    eq(meterUsage.month, DateTime.toDateUtc(month))
  );

/**
 * The meters and ceilings in the billing schema. A hold writes the
 * missing rows (an insert that changes none) and locks the holder's rows
 * of the month in the meters' order, so claims of one holder take turns
 * and never deadlock.
 */
export const DrizzleMeterUsageStoreLive = Layer.effect(
  MeterUsageStore,
  Effect.gen(function* DrizzleMeterUsageStoreLive() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const hold = (
      holder: WorkspaceId,
      month: DateTime.Utc,
      meters: readonly Meter[]
    ) => {
      const ordered = [...new Set(meters)].toSorted();
      const date = DateTime.toDateUtc(month);

      return Effect.gen(function* held() {
        yield* db
          .insert(meterUsage)
          .values(
            ordered.map((meter) => ({
              holderWorkspaceId: holder,
              meter,
              month: date,
              used: 0,
            }))
          )
          .onConflictDoNothing();

        const rows = yield* db
          .select()
          .from(meterUsage)
          .where(
            and(
              ofMonthWhere(holder, month),
              sql`${meterUsage.meter} = ANY(string_to_array(${ordered.join(",")}, ','))`
            )
          )
          .orderBy(asc(meterUsage.meter))
          .for("update");

        return rows;
      }).pipe(
        Effect.mapError(failed),
        Effect.flatMap(Effect.forEach(toRow)),
        Effect.withSpan("MeterUsageStore.hold")
      );
    };

    const save = (
      holder: WorkspaceId,
      month: DateTime.Utc,
      rows: readonly MeterRow[]
    ) =>
      Effect.forEach(
        rows,
        (row) =>
          db
            .update(meterUsage)
            .set({ events: row.events, reported: row.reported, used: row.used })
            .where(
              and(ofMonthWhere(holder, month), eq(meterUsage.meter, row.meter))
            ),
        { discard: true }
      ).pipe(Effect.mapError(failed), Effect.withSpan("MeterUsageStore.save"));

    const ofMonth = (holder: WorkspaceId, month: DateTime.Utc) =>
      db
        .select()
        .from(meterUsage)
        .where(ofMonthWhere(holder, month))
        .orderBy(asc(meterUsage.meter))
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(Effect.forEach(toRow)),
          Effect.withSpan("MeterUsageStore.ofMonth")
        );

    const ceilings = (holder: WorkspaceId) =>
      db
        .select()
        .from(spendCeilings)
        .where(eq(spendCeilings.holderWorkspaceId, holder))
        .orderBy(asc(spendCeilings.group))
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(Effect.forEach(toCeiling)),
          Effect.withSpan("MeterUsageStore.ceilings")
        );

    const setCeiling = (holder: WorkspaceId, ceiling: SpendCeiling) => {
      const values = {
        cents: ceiling.cents,
        currency: "usd",
        setAt: DateTime.toDateUtc(ceiling.setAt),
      };

      return db
        .insert(spendCeilings)
        .values({ ...values, group: ceiling.group, holderWorkspaceId: holder })
        .onConflictDoUpdate({
          set: values,
          target: [spendCeilings.holderWorkspaceId, spendCeilings.group],
        })
        .pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("MeterUsageStore.setCeiling")
        );
    };

    // Counted in the database: a month's purge may be many rows.
    const purgeBefore = (cutoff: DateTime.Utc) =>
      client<{
        readonly purged: number;
      }>`WITH purged AS (DELETE FROM billing.meter_usage WHERE month < ${DateTime.formatIsoDateUtc(DateTime.startOf(cutoff, "month"))}::date RETURNING 1) SELECT count(*)::int AS purged FROM purged`.pipe(
        Effect.map(([row]) => row?.purged ?? 0),
        Effect.mapError(failed),
        Effect.withSpan("MeterUsageStore.purgeBefore")
      );

    const eraseWorkspace = (workspaceId: WorkspaceId) =>
      Effect.all([
        db
          .delete(meterUsage)
          .where(eq(meterUsage.holderWorkspaceId, workspaceId)),
        db
          .delete(spendCeilings)
          .where(eq(spendCeilings.holderWorkspaceId, workspaceId)),
      ]).pipe(
        Effect.mapError(failed),
        Effect.asVoid,
        Effect.withSpan("MeterUsageStore.eraseWorkspace")
      );

    const allOf = (workspaceId: WorkspaceId) =>
      Effect.all({
        ceilings: ceilings(workspaceId),
        months: db
          .select()
          .from(meterUsage)
          .where(eq(meterUsage.holderWorkspaceId, workspaceId))
          .orderBy(asc(meterUsage.month), asc(meterUsage.meter))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach((row) =>
                toRow(row).pipe(
                  Effect.map((counted) => ({
                    ...counted,
                    month: DateTime.fromDateUnsafe(row.month),
                  }))
                )
              )
            )
          ),
      }).pipe(Effect.withSpan("MeterUsageStore.allOf"));

    return MeterUsageStore.of({
      allOf,
      ceilings,
      eraseWorkspace,
      hold,
      ofMonth,
      purgeBefore,
      save,
      setCeiling,
    });
  })
);
