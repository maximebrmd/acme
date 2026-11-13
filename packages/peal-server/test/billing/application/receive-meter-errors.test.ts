// What Stripe reports of meter events it took and could not count: each
// report counted for the alert, and the events it names kept refused.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Metric, Option } from "effect";
import { SqlClient } from "effect/sql";

import { AccountDayStore } from "#billing/application/ports/account-day-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { MeterErrorEvents } from "#billing/application/ports/meter-error-events.ts";
import type { MeterErrorReading } from "#billing/application/ports/meter-error-events.ts";
import {
  meterErrors,
  ReceiveMeterErrors,
} from "#billing/application/receive-meter-errors.ts";
import { DrizzleAccountDayStoreLive } from "#billing/infrastructure/drizzle-account-day-store.ts";
import { DrizzleStripeEventLedgerLive } from "#billing/infrastructure/drizzle-stripe-event-ledger.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";

const holder = WorkspaceIdSchema.make(randomUUID());

const taken = `acc:${holder}:2026-11-13:3`;
const other = `acc:${holder}:2026-11-13:4`;

// The event each signature stands for.
const readings = new Map<string, MeterErrorReading>([
  [
    "signed-report",
    {
      _tag: "report",
      report: {
        errors: [
          {
            code: "meter_event_customer_not_found",
            count: 2,
            // The sample names the request: identifier and timestamp.
            identifiers: [`${taken}:1794571200`],
          },
          { code: "archived_meter", count: 1, identifiers: [] },
        ],
        eventId: `evt_synthetic_meter_errors_${randomUUID()}`,
      },
    },
  ],
  ["signed-other", { _tag: "ignored" }],
]);

const EventsTest = Layer.succeed(
  MeterErrorEvents,
  MeterErrorEvents.of({
    enabled: true,
    read: (_body, signature) =>
      Effect.succeed(readings.get(signature) ?? { _tag: "refused" }),
  })
);

const ReceiveTest = ReceiveMeterErrors.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      EventsTest,
      DrizzleStripeEventLedgerLive,
      TransactionsTest,
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled: true,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    )
  ),
  Layer.provideMerge(DrizzleAccountDayStoreLive),
  Layer.provideMerge(DatabaseTest)
);

const refusalsOf = (identifiers: readonly string[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly identifier: string;
        readonly refusal: string | null;
      }>`SELECT identifier, refusal FROM billing.meter_reports WHERE identifier = ANY(string_to_array(${identifiers.join(",")}, ',')) ORDER BY identifier`
  ).pipe(Effect.orDie);

layer(ReceiveTest)("Stripe's meter error events", (it) => {
  it.effect(
    "count each error, keep the events named refused, and leave the others",
    () =>
      Effect.gen(function* report() {
        const store = yield* AccountDayStore;
        const receive = yield* ReceiveMeterErrors;
        const before = (yield* Metric.value(meterErrors)).count;
        const now = yield* DateTime.now;

        yield* store.enqueue(
          [taken, other].map((identifier) => ({
            createdAt: now,
            eventName: "peal_accounts",
            holder,
            identifier,
            occurredAt: now,
            stripeCustomerId: "cus_synthetic_errors",
            value: 1,
          })),
          []
        );
        yield* store.markSent([taken, other], now);

        assert.strictEqual(
          yield* receive.receive("{}", "signed-report"),
          "recorded"
        );
        assert.strictEqual(
          (yield* Metric.value(meterErrors)).count - before,
          3
        );
        assert.deepStrictEqual(yield* refusalsOf([taken, other]), [
          {
            identifier: taken,
            refusal: "stripe:meter_event_customer_not_found",
          },
          { identifier: other, refusal: null },
        ]);
        // What the reporter's alert reads: kept refused, though sent.
        assert.isAtLeast((yield* store.backlog).refused, 1);

        // Delivered again: counted and marked once.
        assert.strictEqual(
          yield* receive.receive("{}", "signed-report"),
          "duplicate"
        );
        assert.strictEqual(
          (yield* Metric.value(meterErrors)).count - before,
          3
        );

        assert.strictEqual(
          yield* receive.receive("{}", "signed-other"),
          "ignored"
        );
        assert.strictEqual(yield* receive.receive("{}", "forged"), "refused");

        yield* SqlClient.SqlClient.use(
          (sql) =>
            sql`DELETE FROM billing.meter_reports WHERE holder_workspace_id = ${holder}`
        ).pipe(Effect.orDie);
      })
  );
});
