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
    "deletes events past 12 months, and bans past 5 years once ended or lifted a year ago, never one that holds",
    () =>
      Effect.gen(function* purges() {
        const sql = yield* SqlClient.SqlClient;

        const expired = yield* Effect.context<ExpiredAuditEvents>().pipe(
          Effect.map(Context.get(ExpiredAuditEvents))
        );

        // Accounts the bans until lifted are about.
        const held = randomUUID();
        const lifted = randomUUID();
        const liftedRecently = randomUUID();

        // Action, time, ban's end, account (none once it was closed).
        const rows = {
          banEnded: ["ban", "1893-06-01", "1897-06-01", null],
          banHeld: ["ban", "1893-06-01", null, held],
          banLifted: ["ban", "1893-06-01", null, lifted],
          banLiftedRecently: ["ban", "1893-06-01", null, liftedRecently],
          banOfClosedAccount: ["ban", "1893-06-01", null, null],
          banRecent: ["ban", "1895-01-01", null, null],
          banStillRecent: ["ban", "1893-06-01", "1898-06-01", null],
          changedAsMember: ["impersonatedChange", "1897-12-01", null, null],
          changedRecently: ["impersonatedChange", "1898-06-01", null, null],
          impersonated: ["impersonate", "1898-06-01", null, null],
          lift: ["unban", "1897-06-01", null, lifted],
          liftRecent: ["unban", "1898-06-01", null, liftedRecently],
          revoked: ["revokeSessions", "1897-12-01", null, null],
          unbanned: ["unban", "1893-06-01", null, null],
        } as const;

        const ids = new Map(
          Object.keys(rows).map((name) => [name, randomUUID()])
        );

        for (const [name, [action, at, ends, target]] of Object.entries(rows)) {
          yield* sql`INSERT INTO staff.audit_events (id, action, at, ban_expires_at, target_id)
            VALUES (${ids.get(name) ?? ""}, ${action}, ${`${at}T00:00:00Z`}::timestamptz, ${ends === null ? null : `${ends}T00:00:00Z`}::timestamptz, ${target}::uuid)`;
        }

        assert.strictEqual(
          (yield* expired.deleteBatch(auditCutoffs(now), 1)) +
            (yield* expired.deleteBatch(auditCutoffs(now), 500)),
          6
        );

        const left = yield* sql<{ id: string }>`
          SELECT id FROM staff.audit_events WHERE id IN ${sql.in([...ids.values()])}`;

        assert.sameMembers(
          left.map(({ id }) => id),
          [
            "banHeld",
            "banLiftedRecently",
            "banRecent",
            "banStillRecent",
            "changedRecently",
            "impersonated",
            "lift",
            "liftRecent",
          ].map((name) => ids.get(name) ?? "")
        );

        yield* sql`DELETE FROM staff.audit_events WHERE id IN ${sql.in([...ids.values()])}`;
      })
  );
});
