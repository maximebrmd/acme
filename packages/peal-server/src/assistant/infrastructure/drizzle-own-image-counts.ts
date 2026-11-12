import { lt, sql } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";

import { OwnImageCounts } from "#assistant/application/ports/own-image-counts.ts";
import { isoDay } from "#assistant/infrastructure/drizzle-assistant-usage.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { ownImageDays } from "./schema.ts";

/**
 * OwnImageCounts in Postgres: one insert that adds an image to the day's
 * count while it stays within the limit, so requests sent together never
 * pass it.
 */
export const DrizzleOwnImageCountsLive = Layer.effect(
  OwnImageCounts,
  Effect.gen(function* DrizzleOwnImageCounts() {
    const db = yield* Drizzle;

    return OwnImageCounts.of({
      claim: Effect.fn("OwnImageCounts.claim")(
        function* claim(workspaceId, day, dailyLimit) {
          if (dailyLimit < 1) {
            return Option.none();
          }

          const rows = yield* db
            .insert(ownImageDays)
            .values({ day: isoDay(day), images: 1, workspaceId })
            .onConflictDoUpdate({
              set: { images: sql`${ownImageDays.images} + 1` },
              setWhere: lt(ownImageDays.images, dailyLimit),
              target: [ownImageDays.workspaceId, ownImageDays.day],
            })
            .returning({ images: ownImageDays.images })
            .pipe(Effect.orDie);

          return Option.fromUndefinedOr(rows[0]).pipe(
            Option.map(({ images }) => images)
          );
        }
      ),
    });
  })
);
