import { lt, sql } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { ManualSends } from "#webhooks/application/ports/manual-sends.ts";
import type { SendAllowance } from "#webhooks/application/ports/manual-sends.ts";
import {
  manualSendAllowance,
  manualSendWindow,
} from "#webhooks/domain/delivery-policy.ts";

import { manualSends } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/**
 * ManualSends counted in Postgres, by workspace and kind, in fixed windows
 * of an hour on the hour (UTC). One statement inserts the hour's row, or
 * adds to it only while the sum stays within the allowance, so sends from
 * every server take turns on the row and are taken whole or not at all.
 */
export const DrizzleManualSends = Layer.effect(
  ManualSends,
  Effect.gen(function* DrizzleManualSends() {
    const db = yield* Drizzle;

    const take = Effect.fn("ManualSends.take")(function* take(
      workspaceId: Parameters<ManualSends["Service"]["take"]>[0],
      kind: Parameters<ManualSends["Service"]["take"]>[1],
      count: number
    ) {
      const allowed = manualSendAllowance(kind);
      const now = yield* DateTime.now;
      const windowStart = DateTime.startOf(now, "hour");

      const refused: SendAllowance = {
        _tag: "refused",
        allowed,
        retryAfter: DateTime.distance(
          now,
          DateTime.addDuration(windowStart, manualSendWindow)
        ),
      };

      if (count > allowed) {
        return refused;
      }

      const rows = yield* db
        .insert(manualSends)
        .values({
          kind,
          sent: count,
          windowStart: DateTime.toDateUtc(windowStart),
          workspaceId,
        })
        .onConflictDoUpdate({
          set: { sent: sql`${manualSends.sent} + ${count}` },
          setWhere: sql`${manualSends.sent} + ${count} <= ${allowed}`,
          target: [
            manualSends.workspaceId,
            manualSends.kind,
            manualSends.windowStart,
          ],
        })
        .returning({ sent: manualSends.sent })
        .pipe(Effect.mapError(failed));

      const taken: SendAllowance = { _tag: "taken" };

      return rows.length > 0 ? taken : refused;
    });

    return ManualSends.of({
      purge: Effect.fn("ManualSends.purge")(function* purge(before) {
        const deleted = yield* db
          .delete(manualSends)
          .where(lt(manualSends.windowStart, DateTime.toDateUtc(before)))
          .returning({ workspaceId: manualSends.workspaceId })
          .pipe(Effect.mapError(failed));

        return deleted.length;
      }),
      take,
    });
  })
);
