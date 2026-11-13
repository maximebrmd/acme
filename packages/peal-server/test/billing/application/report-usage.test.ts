import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import {
  ConfigProvider,
  Context,
  DateTime,
  Effect,
  Layer,
  Metric,
  Option,
  Ref,
} from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { AccountDayStore } from "#billing/application/ports/account-day-store.ts";
import type { MeterReport } from "#billing/application/ports/account-day-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type { PaidInvoice } from "#billing/application/ports/stripe-contracts.ts";
import { UsageBilling } from "#billing/application/ports/usage-billing.ts";
import type {
  MeterEvent,
  ReportOutcome,
} from "#billing/application/ports/usage-billing.ts";
import {
  customersPaused,
  refusedKept,
  ReportUsage,
  reportsRefused,
} from "#billing/application/report-usage.ts";
import { DrizzleAccountDayStoreLive } from "#billing/infrastructure/drizzle-account-day-store.ts";
import { StripeUsageBillingLive } from "#billing/infrastructure/stripe-usage-billing.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { subscriptionOf, subscriptionsHolding } from "#test/billing/support.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import {
  headerOf,
  json,
  platformServer,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformAnswer } from "#test/publishing/fakes/platform-server.ts";

const at = (written: string) => DateTime.makeUnsafe(written);

// What the stand-in for Stripe was sent, in order, and what it answers
// each identifier (taken, by default).
const sentEvents = Ref.makeUnsafe<readonly MeterEvent[]>([]);

const answers = Ref.makeUnsafe<ReadonlyMap<string, ReportOutcome>>(new Map());

// The customers whose every event Stripe answers as one that refuses the
// server's key, and those it refuses for a reason of their own it does not
// name.
const refusingCustomers = Ref.makeUnsafe<ReadonlySet<string>>(new Set());

const stuckCustomers = Ref.makeUnsafe<ReadonlySet<string>>(new Set());

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

        const refusing = (yield* Ref.get(refusingCustomers)).has(
          event.stripeCustomerId
        );

        const stuck = (yield* Ref.get(stuckCustomers)).has(
          event.stripeCustomerId
        );

        if (answer !== undefined) {
          return answer;
        }

        if (refusing) {
          return { _tag: "retry", reason: "account" };
        }

        return stuck ? { _tag: "retry", reason: "refusing" } : { _tag: "sent" };
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
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled: true,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      ),
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

// A gauge's value as this process last set it.
const gaugeOf = (gauge: typeof customersPaused) =>
  Metric.value(gauge).pipe(Effect.map(({ value }) => value));

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
          new Map([
            [
              refusedFirst?.identifier ?? "",
              { _tag: "retry", reason: "unavailable" },
            ],
          ])
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
    "marks nothing refused when Stripe refuses the server's key, pauses each customer, stops the run, and sends everything once it takes it",
    () =>
      Effect.gen(function* keyRefused() {
        const store = yield* AccountDayStore;
        const report = yield* ReportUsage;
        const now = yield* DateTime.now;
        const customers = Array.from({ length: 30 }, () => customer());

        const reports = customers.flatMap((each, index) => [
          reportOf(each, now, 30 + index),
          reportOf(each, now, 31 + index),
        ]);

        yield* Ref.set(refusingCustomers, new Set(customers));
        yield* store.enqueue(reports, []);

        const ran = yield* report.run;
        const rows = yield* rowsOf(reports.map(({ identifier }) => identifier));

        // Nothing refused for good, nothing sent, and the run stopped
        // asking after a few: every customer would answer the same.
        assert.isTrue(
          rows.every(({ refusal, sent }) => refusal === null && !sent)
        );
        assert.isBelow((yield* sentOf(customers)).length, customers.length);
        assert.isAtLeast(ran.paused, 1);
        assert.isAtLeast(yield* gaugeOf(customersPaused), 1);

        yield* Ref.set(refusingCustomers, new Set());
        yield* report.run;

        const again = yield* rowsOf(
          reports.map(({ identifier }) => identifier)
        );

        assert.isTrue(
          again.every(({ refusal, sent }) => refusal === null && sent)
        );
        assert.strictEqual(yield* gaugeOf(customersPaused), 0);

        yield* Ref.set(sentEvents, []);
        yield* cleanUp(holder);
      })
  );

  it.effect(
    "never lets customers Stripe keeps refusing for their own reasons stop the others",
    () =>
      Effect.gen(function* stuckFew() {
        const store = yield* AccountDayStore;
        const report = yield* ReportUsage;
        const now = yield* DateTime.now;
        const stuck = Array.from({ length: 5 }, () => customer());
        const healthy = Array.from({ length: 15 }, () => customer());

        // The stuck ones first: the oldest rows are theirs.
        const reports = [...stuck, ...healthy].map((each, index) =>
          reportOf(each, now, 100 + index)
        );

        yield* Ref.set(stuckCustomers, new Set(stuck));
        yield* store.enqueue(reports, []);

        const ran = yield* report.run;

        assert.lengthOf(yield* sentOf(healthy), healthy.length);
        assert.strictEqual(ran.paused, stuck.length);

        yield* Ref.set(stuckCustomers, new Set());
        yield* Ref.set(sentEvents, []);
        yield* cleanUp(holder);
      })
  );

  it.effect(
    "sends a report again with the timestamp of its first attempt, however late",
    () =>
      Effect.gen(function* firstStamp() {
        const store = yield* AccountDayStore;
        const report = yield* ReportUsage;
        const failing = customer();
        const written = yield* DateTime.now;
        const late = reportOf(failing, written, 0);

        yield* Ref.set(
          answers,
          new Map([[late.identifier, { _tag: "retry", reason: "unavailable" }]])
        );
        yield* store.enqueue([late], []);
        yield* report.run;

        // Two hours on, Stripe answers: the same request as the first.
        yield* TestClock.adjust("2 hours");
        yield* Ref.set(answers, new Map());
        yield* report.run;

        const sent = yield* sentOf([failing]);

        assert.lengthOf(sent, 2);
        assert.deepStrictEqual(sent[1]?.timestamp, sent[0]?.timestamp);
        assert.deepStrictEqual(sent[0]?.timestamp, written);
        assert.isTrue((yield* rowsOf([late.identifier]))[0]?.sent);

        yield* Ref.set(sentEvents, []);
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
        // The paid one's threshold lifted; the unpaid one's set again, as
        // Stripe may have refused it when it was recorded.
        assert.deepStrictEqual(
          (yield* Ref.get(thresholds)).toSorted((left, right) =>
            left.id.localeCompare(right.id)
          ),
          [
            { cents: Option.none(), id: paidSubscription },
            { cents: Option.some(10_000), id: unpaidSubscription },
          ]
        );
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

// Stripe as its idempotency rule says: the first answer to a key is kept
// and given again to the same request, a 500 included, and a request with
// the same key and other parameters is refused.
const idempotentStripe = (failFirst: ReadonlySet<string>) =>
  platformServer((request) => {
    const form = textOf(request);
    const key = headerOf(request, "idempotency-key");
    const kept = seen.get(key);

    if (kept !== undefined) {
      return kept.form === form
        ? kept.answer
        : json(
            {
              error: {
                message: "synthetic: keys are for the same request",
                type: "idempotency_error",
              },
            },
            400
          );
    }

    const identifier = new URLSearchParams(form).get("identifier") ?? "";

    const answer = failFirst.has(identifier)
      ? json({ error: { message: "synthetic", type: "api_error" } }, 500)
      : json({ identifier, object: "billing.meter_event" });

    seen.set(key, { answer, form });

    return answer;
  });

const seen = new Map<
  string,
  { readonly answer: PlatformAnswer; readonly form: string }
>();

const reporterOn = (apiUrl: string) =>
  Layer.build(
    ReportUsage.make(500).pipe(
      Layer.provide(
        Layer.mergeAll(
          StripeUsageBillingLive.pipe(
            Layer.provide(
              ConfigProvider.layer(
                ConfigProvider.fromUnknown({
                  STRIPE_API_URL: apiUrl,
                  STRIPE_SECRET_KEY: "sk_test_synthetic",
                  STRIPE_WEBHOOK_SECRET: "whsec_synthetic_reporter",
                })
              )
            )
          ),
          StripeTest,
          subscriptionsHolding([]),
          Layer.succeed(
            BillingMode,
            BillingMode.of({
              enabled: true,
              graceSince: Option.none(),
              graceUntil: Option.none(),
            })
          )
        )
      )
    )
  ).pipe(Effect.map(Context.get(ReportUsage)));

layer(Layer.provideMerge(DrizzleAccountDayStoreLive, DatabaseTest))(
  "the reporter against Stripe's idempotency rule",
  (it) => {
    it.effect(
      "keeps waiting, never refusing, on a 500 Stripe gives again past the hour",
      () =>
        Effect.gen(function* replayed() {
          const store = yield* AccountDayStore;
          const failing = customer();
          const report = reportOf(failing, yield* DateTime.now, 0);
          const stripe = yield* idempotentStripe(new Set([report.identifier]));
          const reporter = yield* reporterOn(stripe.url);

          yield* store.enqueue([report], []);
          yield* reporter.run;
          yield* TestClock.adjust("2 hours");
          yield* reporter.run;

          assert.deepStrictEqual(yield* rowsOf([report.identifier]), [
            { identifier: report.identifier, refusal: null, sent: false },
          ]);

          yield* cleanUp(holder);
        }).pipe(Effect.scoped)
    );

    it.effect(
      "ends sent a report Stripe took but the run never marked, sent again past the hour",
      () =>
        Effect.gen(function* unmarked() {
          const store = yield* AccountDayStore;
          const report = reportOf(customer(), yield* DateTime.now, 0);
          const stripe = yield* idempotentStripe(new Set());
          const reporter = yield* reporterOn(stripe.url);

          yield* store.enqueue([report], []);
          yield* reporter.run;

          // The run ended before it marked it, as when a release replaces
          // the server.
          yield* SqlClient.SqlClient.use(
            (sql) =>
              sql`UPDATE billing.meter_reports SET sent_at = NULL WHERE identifier = ${report.identifier}`
          ).pipe(Effect.orDie);
          yield* TestClock.adjust("2 hours");
          yield* reporter.run;

          assert.deepStrictEqual(yield* rowsOf([report.identifier]), [
            { identifier: report.identifier, refusal: null, sent: true },
          ]);

          yield* cleanUp(holder);
        }).pipe(Effect.scoped)
    );
  }
);

// A server that bills starts with three refusals kept in its outbox.
const RestartedTest = ReportUsage.make(2).pipe(
  Layer.provide(
    Layer.mergeAll(
      UsageBillingTest,
      StripeTest,
      subscriptionsHolding([]),
      Layer.mock(AccountDayStore, {
        backlog: Effect.succeed({ left: 0, oldest: Option.none(), refused: 3 }),
      }),
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled: true,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    )
  )
);

layer(RestartedTest)("the reporter when the server starts", (it) => {
  it.effect("tells the refusals the rows keep, never 0", () =>
    Effect.gen(function* restarted() {
      yield* ReportUsage;

      assert.strictEqual(yield* gaugeOf(refusedKept), 3);
    })
  );
});
