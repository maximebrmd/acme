// The audit log's retention on Postgres. Events are written in the 1890s,
// before any other suite's, so the purge's cutoffs touch nothing else.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { ExpiredAuditEvents } from "#staff/application/ports/expired-audit-events.ts";
import { auditCutoffs } from "#staff/domain/audit-retention.ts";
import { DrizzleExpiredAuditEvents } from "#staff/infrastructure/drizzle-expired-audit-events.ts";
import { DatabaseTest } from "#test/channels/support.ts";

const now = DateTime.makeUnsafe("1899-01-01T00:00:00Z");

const RetentionTest = DrizzleExpiredAuditEvents.pipe(
  Layer.provideMerge(DatabaseTest)
);

layer(RetentionTest)("the audit log's retention", (it) => {
  it.effect(
    "deletes events past 12 months, and bans past 3 years once ended a year ago",
    () =>
      Effect.gen(function* purges() {
        const sql = yield* SqlClient.SqlClient;

        const expired = yield* Effect.context<ExpiredAuditEvents>().pipe(
          Effect.map(Context.get(ExpiredAuditEvents))
        );

        const rows = {
          banEnded: ["ban", "1895-06-01", "1897-06-01"],
          banForGood: ["ban", "1895-06-01", null],
          banRecent: ["ban", "1897-01-01", null],
          banStillRecent: ["ban", "1895-06-01", "1898-06-01"],
          changedAsMember: ["impersonatedChange", "1897-12-01", null],
          changedRecently: ["impersonatedChange", "1898-06-01", null],
          impersonated: ["impersonate", "1898-06-01", null],
          revoked: ["revokeSessions", "1897-12-01", null],
          unbanned: ["unban", "1895-06-01", null],
        } as const;

        const ids = new Map(
          Object.keys(rows).map((name) => [name, randomUUID()])
        );

        for (const [name, [action, at, ends]] of Object.entries(rows)) {
          yield* sql`INSERT INTO staff.audit_events (id, action, at, ban_expires_at)
            VALUES (${ids.get(name) ?? ""}, ${action}, ${`${at}T00:00:00Z`}::timestamptz, ${ends === null ? null : `${ends}T00:00:00Z`}::timestamptz)`;
        }

        assert.strictEqual(
          (yield* expired.deleteBatch(auditCutoffs(now), 1)) +
            (yield* expired.deleteBatch(auditCutoffs(now), 500)),
          5
        );

        const left = yield* sql<{ id: string }>`
          SELECT id FROM staff.audit_events WHERE id IN ${sql.in([...ids.values()])}`;

        assert.sameMembers(
          left.map(({ id }) => id),
          [
            "banRecent",
            "banStillRecent",
            "changedRecently",
            "impersonated",
          ].map((name) => ids.get(name) ?? "")
        );

        yield* sql`DELETE FROM staff.audit_events WHERE id IN ${sql.in([...ids.values()])}`;
      })
  );
});
