import { lt, sql } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";

import { OwnTextCounts } from "#assistant/application/ports/own-text-counts.ts";
import { isoDay } from "#assistant/infrastructure/drizzle-assistant-usage.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { ownTextDays } from "./schema.ts";

/**
 * OwnTextCounts in Postgres: one insert that adds a request to the day's
 * count while it stays within the limit, so requests sent together never
 * pass it.
 */
export const DrizzleOwnTextCountsLive = Layer.effect(
  OwnTextCounts,
  Effect.gen(function* DrizzleOwnTextCounts() {
    const db = yield* Drizzle;

    return OwnTextCounts.of({
      claim: Effect.fn("OwnTextCounts.claim")(
        function* claim(workspaceId, day, dailyLimit) {
          if (dailyLimit < 1) {
            return Option.none();
          }

          const rows = yield* db
            .insert(ownTextDays)
            .values({ day: isoDay(day), requests: 1, workspaceId })
            .onConflictDoUpdate({
              set: { requests: sql`${ownTextDays.requests} + 1` },
              setWhere: lt(ownTextDays.requests, dailyLimit),
              target: [ownTextDays.workspaceId, ownTextDays.day],
            })
            .returning({ requests: ownTextDays.requests })
            .pipe(Effect.orDie);

          return Option.fromUndefinedOr(rows[0]).pipe(
            Option.map(({ requests }) => requests)
          );
        }
      ),
    });
  })
);
