import { asc, eq } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { UsageRecords } from "#assistant/application/ports/usage-records.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { dailyUsage } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/** UsageRecords on the assistant schema. */
export const DrizzleUsageRecordsLive = Layer.effect(
  UsageRecords,
  Effect.gen(function* DrizzleUsageRecords() {
    const db = yield* Drizzle;

    return UsageRecords.of({
      eraseWorkspace: (workspaceId) =>
        db
          .delete(dailyUsage)
          .where(eq(dailyUsage.workspaceId, workspaceId))
          .pipe(
            Effect.asVoid,
            Effect.mapError(failed),
            Effect.withSpan("UsageRecords.eraseWorkspace")
          ),
      exportWorkspace: (workspaceId) =>
        db
          .select({ day: dailyUsage.day, requests: dailyUsage.requests })
          .from(dailyUsage)
          .where(eq(dailyUsage.workspaceId, workspaceId))
          .orderBy(asc(dailyUsage.day))
          .pipe(
            Effect.mapError(failed),
            Effect.withSpan("UsageRecords.exportWorkspace")
          ),
    });
  })
);
