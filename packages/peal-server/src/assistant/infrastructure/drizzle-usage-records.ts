import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { UsageRecords } from "#assistant/application/ports/usage-records.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { ImageProviderRecord } from "#shared/application/personal-data.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { dailyUsage, imageProviders, ownImageDays } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/** UsageRecords on the assistant schema. */
export const DrizzleUsageRecordsLive = Layer.effect(
  UsageRecords,
  Effect.gen(function* DrizzleUsageRecords() {
    const db = yield* Drizzle;

    return UsageRecords.of({
      eraseWorkspace: Effect.fn("UsageRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId) {
          yield* db
            .delete(dailyUsage)
            .where(eq(dailyUsage.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));
          yield* db
            .delete(ownImageDays)
            .where(eq(ownImageDays.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));
          yield* db
            .delete(imageProviders)
            .where(eq(imageProviders.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));
        }
      ),
      exportImageProvider: (workspaceId) =>
        db
          // Never the key, sealed or not.
          .select({
            baseUrl: imageProviders.baseUrl,
            model: imageProviders.model,
            updatedAt: imageProviders.updatedAt,
          })
          .from(imageProviders)
          .where(eq(imageProviders.workspaceId, workspaceId))
          .pipe(
            Effect.map(([row]) => {
              if (row === undefined) {
                return null;
              }

              const record: ImageProviderRecord = {
                baseUrl: row.baseUrl,
                model: row.model,
                updatedAt: DateTime.fromDateUnsafe(row.updatedAt),
              };

              return record;
            }),
            Effect.mapError(failed),
            Effect.withSpan("UsageRecords.exportImageProvider")
          ),
      exportOwnImages: (workspaceId) =>
        db
          .select({ day: ownImageDays.day, images: ownImageDays.images })
          .from(ownImageDays)
          .where(eq(ownImageDays.workspaceId, workspaceId))
          .orderBy(asc(ownImageDays.day))
          .pipe(
            Effect.mapError(failed),
            Effect.withSpan("UsageRecords.exportOwnImages")
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
