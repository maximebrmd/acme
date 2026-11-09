import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DateTime, Effect, Layer } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { ExpiredAuditEvents } from "#staff/application/ports/expired-audit-events.ts";
import { banActions } from "#staff/domain/audit-retention.ts";
import type { AuditCutoffs } from "#staff/domain/audit-retention.ts";

import { auditEvents } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

// A later unban of the same account, which ends a ban until lifted.
const unbans = alias(auditEvents, "unbans");

/**
 * The audit log's expired events, in SQL as `isExpired` decides them:
 * older than 12 months, or, for bans and unbans, older than 5 years and
 * ended more than 12 months ago. A ban until lifted ends when a later unban
 * lifts it, or when its account is closed (its target forgotten); until
 * then it is kept.
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
                lt(auditEvents.banExpiresAt, general),
                and(
                  isNull(auditEvents.banExpiresAt),
                  or(
                    eq(auditEvents.action, "unban"),
                    isNull(auditEvents.targetId),
                    sql`exists ${db
                      .select({ one: sql`1` })
                      .from(unbans)
                      .where(
                        and(
                          eq(unbans.action, "unban"),
                          isNotNull(unbans.targetId),
                          eq(unbans.targetId, auditEvents.targetId),
                          gt(unbans.at, auditEvents.at),
                          lt(unbans.at, general)
                        )
                      )}`
                  )
                )
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
