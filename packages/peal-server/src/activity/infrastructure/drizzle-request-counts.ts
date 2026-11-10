import { lt, sql } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { RequestCounts } from "#activity/application/request-counts.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { requestCounts } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/**
 * The requests counted in Postgres: one statement inserts the window's row
 * with one, or adds one to it, so Postgres serializes requests sent
 * together on that row and each gets its own count.
 */
export const DrizzleRequestCounts = Layer.effect(
  RequestCounts,
  Effect.gen(function* DrizzleRequestCounts() {
    const db = yield* Drizzle;

    return RequestCounts.of({
      count: Effect.fn("RequestCounts.count")(function* count(subject, window) {
        const rows = yield* db
          .insert(requestCounts)
          .values({
            requests: 1,
            subject,
            windowStart: DateTime.toDateUtc(window),
          })
          .onConflictDoUpdate({
            set: { requests: sql`${requestCounts.requests} + 1` },
            target: [requestCounts.subject, requestCounts.windowStart],
          })
          .returning({ requests: requestCounts.requests })
          .pipe(Effect.mapError(failed));

        return rows[0]?.requests ?? 1;
      }),
      purge: Effect.fn("RequestCounts.purge")(function* purge(before) {
        const deleted = yield* db
          .delete(requestCounts)
          .where(lt(requestCounts.windowStart, DateTime.toDateUtc(before)))
          .returning({ subject: requestCounts.subject })
          .pipe(Effect.mapError(failed));

        return deleted.length;
      }),
    });
  })
);
