import { lte, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { PlatformQuota } from "#publishing/application/platform-quota.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { quotaUsage } from "./schema.ts";

const twoDigits = (value: number) => value.toString().padStart(2, "0");

// The day as Postgres reads a date: 2026-11-09.
const isoDay = ({ day, month, year }: LocalDate): string =>
  `${year}-${twoDigits(month)}-${twoDigits(day)}`;

const failed = (cause: unknown) => new DatabaseError({ cause });

/**
 * The quota ledger in the publishing schema, through Drizzle. A spend is
 * one insert that adds the units to the day's count while the sum stays
 * within the allowance, so Postgres serializes spends sent at once on the
 * day's row.
 */
export const DrizzlePlatformQuota = Layer.effect(
  PlatformQuota,
  Effect.gen(function* DrizzlePlatformQuota() {
    const db = yield* Drizzle;

    return PlatformQuota.of({
      exhaust: ({ allowance, bucket, day }) =>
        db
          .insert(quotaUsage)
          .values({ bucket, day: isoDay(day), units: allowance })
          .onConflictDoUpdate({
            set: { units: sql`GREATEST(${quotaUsage.units}, ${allowance})` },
            target: [quotaUsage.bucket, quotaUsage.day],
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      spend: Effect.fn("PlatformQuota.spend")(function* spend({
        allowance,
        bucket,
        day,
        units,
      }) {
        if (units > allowance) {
          return false;
        }

        const rows = yield* db
          .insert(quotaUsage)
          .values({ bucket, day: isoDay(day), units })
          .onConflictDoUpdate({
            set: { units: sql`${quotaUsage.units} + ${units}` },
            setWhere: lte(quotaUsage.units, allowance - units),
            target: [quotaUsage.bucket, quotaUsage.day],
          })
          .returning({ units: quotaUsage.units })
          .pipe(Effect.mapError(failed));

        return rows.length > 0;
      }),
    });
  })
);
