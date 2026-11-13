import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Metric, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { AccountDayStore } from "#billing/application/ports/account-day-store.ts";
import type { MeterReport } from "#billing/application/ports/account-day-store.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type { PaidInvoice } from "#billing/application/ports/stripe-contracts.ts";
import { UsageBilling } from "#billing/application/ports/usage-billing.ts";
import type {
  MeterEvent,
  ReportOutcome,
} from "#billing/application/ports/usage-billing.ts";
import {
  ReportUsage,
  reportsRefused,
} from "#billing/application/report-usage.ts";
import { DrizzleAccountDayStoreLive } from "#billing/infrastructure/drizzle-account-day-store.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { subscriptionOf, subscriptionsHolding } from "#test/billing/support.ts";
import { DatabaseTest } from "#test/channels/support.ts";

const at = (written: string) => DateTime.makeUnsafe(written);

// What the stand-in for Stripe was sent, in order, and what it answers
// each identifier (taken, by default).
const sentEvents = Ref.makeUnsafe<readonly MeterEvent[]>([]);

const answers = Ref.makeUnsafe<ReadonlyMap<string, ReportOutcome>>(new Map());

// The subscriptions whose items were kept, and the thresholds set.
const itemsKept = Ref.makeUnsafe<readonly string[]>([]);

const thresholds = Ref.makeUnsafe<
  readonly { readonly cents: Option.Option<number>; readonly id: string }[]
>([]);

const UsageBillingTest = Layer.succeed(
  UsageBilling,
  UsageBilling.of({
    ensureItems: (_workspaceId, subscriptionId) =>
      Ref.update(itemsKept, (all) => [...all, subscriptionId]).pipe(
        Effect.as({ added: 1, replaced: 0 })
      ),
    eventNames: {
      accounts: "peal_accounts",
      assistantImages: "peal_assistant_images",
      assistantRequests: "peal_assistant_requests",
      managedAds: "peal_managed_ads",
      outboundMessages: "peal_outbound_messages",
      xApi: "peal_x_api",
    },
    report: (event) =>
      Effect.gen(function* reported() {
        yield* Ref.update(sentEvents, (all) => [...all, event]);

        const answer = (yield* Ref.get(answers)).get(event.identifier);

        return answer ?? { _tag: "sent" };
      }),
    setThreshold: (_workspaceId, id, cents) =>
      Ref.update(thresholds, (all) => [...all, { cents, id }]),
  })
);

const paidSubscription = "sub_synthetic_paid";
const unpaidSubscription = "sub_synthetic_unpaid";

const invoice: PaidInvoice = {
  invoiceId: "in_synthetic",
  lines: [],
  paid: { amount: 4000, currency: "usd" },
  periodEnd: Option.none(),
  periodStart: Option.none(),
};

const StripeTest = Layer.mock(StripeContracts, {
  paidInvoices: (_workspaceId, id) =>
    Effect.succeed(id === paidSubscription ? [invoice] : []),
});

const holder = WorkspaceIdSchema.make(randomUUID());

const ReportTest = ReportUsage.make(2).pipe(
  Layer.provide(
    Layer.mergeAll(
      UsageBillingTest,
      StripeTest,
      subscriptionsHolding([
        subscriptionOf({
          plan: "payAsYouGo",
          status: "active",
          stripeSubscriptionId: paidSubscription,
          workspaceId: holder,
        }),
        subscriptionOf({
          plan: "payAsYouGo",
          status: "active",
          stripeSubscriptionId: unpaidSubscription,
          workspaceId: holder,
        }),
        subscriptionOf({
          paidInvoiceAt: Option.some(at("2026-10-01T00:00:00Z")),
          plan: "payAsYouGo",
          status: "active",
          stripeSubscriptionId: "sub_synthetic_known",
          workspaceId: holder,
        }),
      ])
    )
  ),
  Layer.provideMerge(DrizzleAccountDayStoreLive),
  Layer.provideMerge(DatabaseTest)
);

// A report of `customer`'s, written `minutes` after `from`, describing
// `occurredAt`.
const reportOf = (
  customer: string,
  from: DateTime.Utc,
  minutes: number,
  occurredAt: DateTime.Utc = DateTime.add(from, { minutes })
): MeterReport => ({
  createdAt: DateTime.add(from, { minutes }),
  eventName: "peal_accounts",
  holder,
  identifier: `acc:test:${randomUUID()}`,
  occurredAt,
  stripeCustomerId: customer,
  value: 1,
});

const customer = () => `cus_synthetic_${randomUUID()}`;

// The events sent of these customers, in the order Stripe got them.
const sentOf = (customers: readonly string[]) =>
  Ref.get(sentEvents).pipe(
    Effect.map((all) =>
      all.filter(({ stripeCustomerId }) => customers.includes(stripeCustomerId))
    )
  );

const rowsOf = (identifiers: readonly string[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly identifier: string;
        readonly refusal: string | null;
        readonly sent: boolean;
      }>`SELECT identifier, refusal, sent_at IS NOT NULL AS sent FROM billing.meter_reports WHERE identifier = ANY(string_to_array(${identifiers.join(",")}, ',')) ORDER BY identifier`
  ).pipe(Effect.orDie);

const cleanUp = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM billing.meter_reports WHERE holder_workspace_id = ${workspaceId}`
  ).pipe(Effect.orDie);

layer(ReportTest)("the reporter of usage to Stripe", (it) => {
  it.effect(
    "sends each customer's reports in order, across pages, marks them sent, and sends nothing twice",
    () =>
      Effect.gen(function* inOrder() {
        const store = yield* AccountDayStore;
        const report = yield* ReportUsage;
        const [first, second] = [customer(), customer()];

        const now = yield* DateTime.now;

        const reports = [
          reportOf(first, now, 0),
          reportOf(second, now, 1),
          reportOf(first, now, 2),
          reportOf(first, now, 3),
          reportOf(second, now, 4),
        ];

        yield* store.enqueue(reports, []);
        yield* report.run;

        const sent = yield* sentOf([first, second]);

        const identifiersOf = (
          events: readonly Pick<MeterEvent, "identifier" | "stripeCustomerId">[]
        ) =>
          events.flatMap(({ identifier, stripeCustomerId }) =>
            stripeCustomerId === first ? [identifier] : []
          );

        assert.deepStrictEqual(identifiersOf(sent), identifiersOf(reports));
        assert.lengthOf(sent, reports.length);

        const rows = yield* rowsOf(reports.map(({ identifier }) => identifier));

        assert.isTrue(rows.every(({ sent: done }) => done));

        yield* report.run;

        assert.lengthOf(yield* sentOf([first, second]), reports.length);

        yield* cleanUp(holder);
      })
  );

  it.effect(
    "leaves a report Stripe did not take, and the customer's later ones, for the next run",
    () =>
      Effect.gen(function* deferred() {
        const store = yield* AccountDayStore;
        const report = yield* ReportUsage;
        const [limited, other] = [customer(), customer()];

        const now = yield* DateTime.now;

        const reports = [
          reportOf(limited, now, 10),
          reportOf(limited, now, 11),
          reportOf(other, now, 12),
          reportOf(limited, now, 13),
        ];

        const [refusedFirst] = reports;

        yield* Ref.set(
          answers,
          new Map([[refusedFirst?.identifier ?? "", { _tag: "retry" }]])
        );

        yield* store.enqueue(reports, []);

        const ran = yield* report.run;

        assert.isAtLeast(ran.deferred, 3);
        assert.deepStrictEqual(
          (yield* sentOf([limited, other])).map(({ identifier }) => identifier),
          [refusedFirst?.identifier, reports[2]?.identifier]
        );

        const waiting = yield* rowsOf(
          reports.map(({ identifier }) => identifier)
        );

        assert.deepStrictEqual(waiting.filter(({ sent }) => !sent).length, 3);

        // Stripe takes it now: the three go, in their order.
        yield* Ref.set(answers, new Map());
        yield* report.run;

        assert.deepStrictEqual(
          (yield* sentOf([limited])).map(({ identifier }) => identifier),
          [
            refusedFirst?.identifier,
            refusedFirst?.identifier,
            reports[1]?.identifier,
            reports[3]?.identifier,
          ]
        );

        yield* Ref.set(sentEvents, []);
        yield* cleanUp(holder);
      })
  );

  it.effect(
    "keeps a report Stripe refused for good, counted, and goes on with the customer's next",
    () =>
      Effect.gen(function* refused() {
        const store = yield* AccountDayStore;
        const report = yield* ReportUsage;
        const refusing = customer();
        const counted = (yield* Metric.value(reportsRefused)).count;

        const now = yield* DateTime.now;

        const reports = [
          reportOf(refusing, now, 20),
          reportOf(refusing, now, 21),
        ];

        yield* Ref.set(
          answers,
          new Map([
            [
              reports[0]?.identifier ?? "",
              { _tag: "refused", code: "parameter_invalid_integer" },
            ],
          ])
        );

        yield* store.enqueue(reports, []);
        yield* report.run;
        yield* report.run;

        const rows = yield* rowsOf(reports.map(({ identifier }) => identifier));

        assert.deepStrictEqual(
          rows.find(({ identifier }) => identifier === reports[0]?.identifier),
          {
            identifier: reports[0]?.identifier ?? "",
            refusal: "parameter_invalid_integer",
            sent: false,
          }
        );
        assert.isTrue(
          rows.find(({ identifier }) => identifier === reports[1]?.identifier)
            ?.sent
        );
        // Sent once each: a refusal is not tried again.
        assert.lengthOf(yield* sentOf([refusing]), 2);
        assert.strictEqual(
          (yield* Metric.value(reportsRefused)).count,
          counted + 1
        );

        yield* Ref.set(answers, new Map());
        yield* cleanUp(holder);
      })
  );

  it.effect(
    "stamps a report with the instant it describes within the last hour, else with the sending time",
    () =>
      Effect.gen(function* stamped() {
        const store = yield* AccountDayStore;
        const report = yield* ReportUsage;
        const [recent, late] = [customer(), customer()];
        const written = yield* DateTime.now;

        yield* store.enqueue(
          [reportOf(recent, written, 150), reportOf(late, written, 0)],
          []
        );

        // Sent three hours on: the late one is stamped then.
        yield* TestClock.adjust("3 hours");
        yield* report.run;

        const [first, second] = [
          ...(yield* sentOf([recent])),
          ...(yield* sentOf([late])),
        ];

        assert.deepStrictEqual(
          first?.timestamp,
          DateTime.add(written, { minutes: 150 })
        );
        assert.deepStrictEqual(
          second?.timestamp,
          DateTime.add(written, { hours: 3 })
        );

        yield* cleanUp(holder);
      })
  );

  it.effect(
    "keeps each per-account subscription's items daily, and lifts the threshold once its first invoice is paid",
    () =>
      Effect.gen(function* daily() {
        const report = yield* ReportUsage;

        yield* Ref.set(itemsKept, []);
        yield* Ref.set(thresholds, []);

        const kept = yield* report.daily;

        assert.deepStrictEqual(
          (yield* Ref.get(itemsKept)).toSorted(),
          [
            paidSubscription,
            "sub_synthetic_known",
            unpaidSubscription,
          ].toSorted()
        );
        assert.deepStrictEqual(yield* Ref.get(thresholds), [
          { cents: Option.none(), id: paidSubscription },
        ]);
        assert.deepStrictEqual(kept, {
          failed: 0,
          itemsAdded: 3,
          itemsReplaced: 0,
          paid: 1,
          subscriptions: 3,
        });
      })
  );
});
