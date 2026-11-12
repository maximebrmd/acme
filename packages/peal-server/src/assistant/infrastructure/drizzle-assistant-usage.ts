import { and, eq, gt, inArray, lte, sql } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";

import { AssistantUsage } from "#assistant/application/ports/assistant-usage.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { dailyUsage } from "./schema.ts";

const twoDigits = (value: number) => value.toString().padStart(2, "0");

/** The day as Postgres reads a date: 2026-11-09. */
export const isoDay = ({ day, month, year }: LocalDate): string =>
  `${year}-${twoDigits(month)}-${twoDigits(day)}`;

const today = (workspaceId: WorkspaceId, day: LocalDate) =>
  and(eq(dailyUsage.workspaceId, workspaceId), eq(dailyUsage.day, isoDay(day)));

/**
 * The assistant's usage in Postgres, through Drizzle. A claim is one
 * statement, an insert that adds the request's cost to the day's count
 * while the sum stays within the limit, so Postgres serializes requests sent at the same time on the
 * day's row. A database failure is a defect here: no caller can do better
 * than report it.
 */
export const DrizzleAssistantUsageLive = Layer.effect(
  AssistantUsage,
  Effect.gen(function* DrizzleAssistantUsageLive() {
    const db = yield* Drizzle;

    return AssistantUsage.of({
      claim: Effect.fn("AssistantUsage.claim")(function* claim(
        workspaceId: WorkspaceId,
        day: LocalDate,
        dailyLimit: number,
        cost: number
      ) {
        // More than the whole day allows: nothing to count.
        if (cost > dailyLimit) {
          return Option.none();
        }

        // The first request of the day inserts the row with its cost; the
        // others add theirs, unless that would pass the limit, in which
        // case the row stays as it is and nothing is returned.
        const rows = yield* db
          .insert(dailyUsage)
          .values({ day: isoDay(day), requests: cost, workspaceId })
          .onConflictDoUpdate({
            set: { requests: sql`${dailyUsage.requests} + ${cost}` },
            setWhere: lte(dailyUsage.requests, dailyLimit - cost),
            target: [dailyUsage.workspaceId, dailyUsage.day],
          })
          .returning({ requests: dailyUsage.requests })
          .pipe(Effect.orDie);

        return Option.fromUndefinedOr(rows[0]).pipe(
          Option.map(({ requests }) => requests)
        );
      }),
      release: Effect.fn("AssistantUsage.release")(function* release(
        workspaceId: WorkspaceId,
        day: LocalDate,
        cost: number
      ) {
        yield* db
          .update(dailyUsage)
          .set({
            requests: sql`greatest(${dailyUsage.requests} - ${cost}, 0)`,
          })
          .where(and(today(workspaceId, day), gt(dailyUsage.requests, 0)))
          .pipe(Effect.orDie);
      }),
      used: Effect.fn("AssistantUsage.used")(function* used(
        workspaceId: WorkspaceId,
        day: LocalDate
      ) {
        const rows = yield* db
          .select({ requests: dailyUsage.requests })
          .from(dailyUsage)
          .where(today(workspaceId, day))
          .pipe(Effect.orDie);

        return rows[0]?.requests ?? 0;
      }),
      usedIn: Effect.fn("AssistantUsage.usedIn")(function* usedIn(
        workspaceIds: readonly WorkspaceId[],
        day: LocalDate
      ) {
        if (workspaceIds.length === 0) {
          return new Map<WorkspaceId, number>();
        }

        const rows = yield* db
          .select({
            requests: dailyUsage.requests,
            workspaceId: dailyUsage.workspaceId,
          })
          .from(dailyUsage)
          .where(
            and(
              inArray(dailyUsage.workspaceId, [...workspaceIds]),
              eq(dailyUsage.day, isoDay(day)),
              gt(dailyUsage.requests, 0)
            )
          )
          .pipe(Effect.orDie);

        const sent = new Map(
          rows.map((row) => [row.workspaceId, row.requests])
        );

        // Keyed by the ids asked for, which are the workspaces' own.
        return new Map(
          workspaceIds.flatMap((id) => {
            const requests = sent.get(id);

            return requests === undefined ? [] : [[id, requests] as const];
          })
        );
      }),
    });
  })
);
