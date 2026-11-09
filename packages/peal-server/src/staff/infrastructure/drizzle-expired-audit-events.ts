import { and, inArray, isNull, lt, notInArray, or } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { ExpiredAuditEvents } from "#staff/application/ports/expired-audit-events.ts";
import { banActions } from "#staff/domain/audit-retention.ts";
import type { AuditCutoffs } from "#staff/domain/audit-retention.ts";

import { auditEvents } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/**
 * The audit log's expired events, in SQL as `isExpired` decides them:
 * older than 12 months, or, for bans, older than 3 years and ended (or
 * never to end) more than 12 months ago.
 */
export const DrizzleExpiredAuditEvents = Layer.effect(
  ExpiredAuditEvents,
  Effect.gen(function* DrizzleExpiredAuditEvents() {
    const db = yield* Drizzle;

    const deleteBatch = (cutoffs: AuditCutoffs, limit: number) => {
      const general = DateTime.toDateUtc(cutoffs.general);
      const bans = DateTime.toDateUtc(cutoffs.bans);

      const expired = db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(
          or(
            and(
              notInArray(auditEvents.action, [...banActions]),
              lt(auditEvents.at, general)
            ),
            and(
              inArray(auditEvents.action, [...banActions]),
              lt(auditEvents.at, bans),
              or(
                isNull(auditEvents.banExpiresAt),
                lt(auditEvents.banExpiresAt, general)
              )
            )
          )
        )
        .limit(limit);

      return db
        .delete(auditEvents)
        .where(inArray(auditEvents.id, expired))
        .returning({ id: auditEvents.id })
        .pipe(
          Effect.mapError(failed),
          Effect.map((rows) => rows.length),
          Effect.withSpan("ExpiredAuditEvents.deleteBatch")
        );
    };

    return ExpiredAuditEvents.of({ deleteBatch });
  })
);
