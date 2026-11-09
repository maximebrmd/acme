import { Context, DateTime, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { auditCutoffs } from "#staff/domain/audit-retention.ts";

import { ExpiredAuditEvents } from "./ports/expired-audit-events.ts";

// Events deleted per statement, so one run never holds long locks.
const batchSize = 500;

/**
 * Deletes the audit log's events once their retention ends
 * (`#staff/domain/audit-retention.ts`): 12 months, 3 years for bans. The
 * only deletion of the log besides forgetting a closed account.
 */
export class PurgeAuditLog extends Context.Service<
  PurgeAuditLog,
  {
    /** Deletes every expired event now, and says how many. */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/staff/application/PurgeAuditLog") {
  static readonly layer = Layer.effect(
    PurgeAuditLog,
    Effect.gen(function* PurgeAuditLogLive() {
      const expired = yield* ExpiredAuditEvents;

      const untilShort = (
        cutoffs: ReturnType<typeof auditCutoffs>,
        total: number
      ): Effect.Effect<number, DatabaseError> =>
        expired
          .deleteBatch(cutoffs, batchSize)
          .pipe(
            Effect.flatMap((count) =>
              count < batchSize
                ? Effect.succeed(total + count)
                : untilShort(cutoffs, total + count)
            )
          );

      const purge = DateTime.now.pipe(
        Effect.flatMap((now) => untilShort(auditCutoffs(now), 0)),
        Effect.withSpan("PurgeAuditLog.purge")
      );

      return PurgeAuditLog.of({ purge });
    })
  );
}
