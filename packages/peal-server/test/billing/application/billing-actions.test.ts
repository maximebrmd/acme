// Ordering, checkout, cancelling, withdrawing and the reminders, on ports
// in memory: Stripe's side is a log of what was asked, the notices a list.
import { assert, layer } from "@effect/vitest";
import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Ref,
} from "effect";
import { TestClock } from "effect/testing";

import { CancelSubscription } from "#billing/application/cancel-subscription.ts";
import { CheckoutOrders } from "#billing/application/checkout-orders.ts";
import { PlaceOrder } from "#billing/application/place-order.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { BillingNotices } from "#billing/application/ports/billing-notices.ts";
import { ContractReferences } from "#billing/application/ports/contract-references.ts";
import { ContractRequests } from "#billing/application/ports/contract-requests.ts";
import { Orders } from "#billing/application/ports/orders.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type { PaidInvoice } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { Trials } from "#billing/application/ports/trials.ts";
import type { StartedTrial } from "#billing/application/ports/trials.ts";
import { Withdrawals } from "#billing/application/ports/withdrawals.ts";
import type { Withdrawal } from "#billing/application/ports/withdrawals.ts";
import { SendBillingReminders } from "#billing/application/send-billing-reminders.ts";
import { Withdraw } from "#billing/application/withdraw.ts";
import type { BillingNotice } from "#billing/domain/billing-notice.ts";
import type { ContractRequest } from "#billing/domain/contract-request.ts";
import type { Order } from "#billing/domain/order.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import { Ids } from "#shared/application/ids.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlainPseudonymsTest, subscriptionOf } from "#test/billing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const workspaceId = WorkspaceIdSchema.make(
  "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b"
);

const userId = UserIdSchema.make("6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9c");

const staffId = UserIdSchema.make("7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d");

const inPerson: Actor["subject"] = {
  _tag: "user",
  impersonatedBy: Option.none(),
  userId,
};

const actorAs = (
  permissions: readonly Permission[] = permissionsFor("owner"),
  subject: Actor["subject"] = inPerson
) => new Actor({ permissions, subject, workspaceId });

const at = (iso: string) => DateTime.makeUnsafe(iso);

// An order, and whether a checkout took it.
interface PlacedOrder {
  readonly order: Order;
  readonly used: boolean;
}

// What a test sets and reads: the subscriptions billing holds, what was
// asked of Stripe, the notices told, and the payment Stripe reports.
class BillingLog extends Context.Service<
  BillingLog,
  {
    readonly business: Ref.Ref<boolean>;
    readonly held: Ref.Ref<readonly Subscription[]>;
    readonly notices: Ref.Ref<
      readonly { readonly key: string; readonly notice: BillingNotice }[]
    >;
    readonly orders: Ref.Ref<readonly PlacedOrder[]>;
    readonly requests: Ref.Ref<readonly ContractRequest[]>;
    readonly invoices: Ref.Ref<readonly PaidInvoice[]>;
    readonly stripe: Ref.Ref<readonly string[]>;
    readonly trials: Ref.Ref<readonly StartedTrial[]>;
    readonly withdrawals: Ref.Ref<readonly Withdrawal[]>;
  }
>()("peal-server/test/billing/BillingLog") {}

const LogLive = Layer.effect(
  BillingLog,
  Effect.all({
    business: Ref.make(false),
    held: Ref.make<readonly Subscription[]>([]),
    invoices: Ref.make<readonly PaidInvoice[]>([]),
    notices: Ref.make<
      readonly { readonly key: string; readonly notice: BillingNotice }[]
    >([]),
    orders: Ref.make<readonly PlacedOrder[]>([]),
    requests: Ref.make<readonly ContractRequest[]>([]),
    stripe: Ref.make<readonly string[]>([]),
    trials: Ref.make<readonly StartedTrial[]>([]),
    withdrawals: Ref.make<readonly Withdrawal[]>([]),
  })
);

const PortsInMemory = Layer.mergeAll(
  Layer.effect(
    Subscriptions,
    BillingLog.use(({ held }) =>
      Effect.succeed(
        Subscriptions.of({
          eraseWorkspace: () => Effect.void,
          forgetUser: () => Effect.void,
          ofWorkspace: () => Ref.get(held),
          record: () => Effect.succeed("recorded" as const),
          remindable: () => Ref.get(held),
        })
      )
    )
  ),
  Layer.effect(
    Orders,
    BillingLog.use(({ orders }) =>
      Effect.succeed(
        Orders.of({
          place: (order) =>
            Ref.update(orders, (all) => [...all, { order, used: false }]),
          take: (claim, since) =>
            Ref.modify(orders, (all) => {
              const found = all.find(
                ({ order, used }) =>
                  order.id === claim.id &&
                  order.userId === claim.userId &&
                  order.plan === claim.plan &&
                  order.interval === claim.interval &&
                  !used &&
                  DateTime.isGreaterThan(order.createdAt, since)
              );

              return [
                Option.fromUndefinedOr(found).pipe(
                  Option.map(({ order }) => order)
                ),
                all.map((placed) =>
                  placed === found
                    ? { order: placed.order, used: true }
                    : placed
                ),
              ];
            }),
        })
      )
    )
  ),
  Layer.effect(
    Trials,
    BillingLog.use(({ trials }) =>
      Effect.succeed(
        Trials.of({
          forgetPseudonyms: () => Effect.succeed(0),
          record: (trial) =>
            Ref.update(trials, (all) => [...all, trial]).pipe(Effect.as(true)),
          reserve: () => Effect.succeed(true),
          used: (user, workspace) =>
            Ref.get(trials).pipe(
              Effect.map((all) =>
                all.some(
                  (trial) =>
                    trial.userId === user || trial.workspaceId === workspace
                )
              )
            ),
          usedByPseudonym: (pseudonym) =>
            Effect.succeed(pseudonym === "pseudonym:closed@example.com"),
        })
      )
    )
  ),
  Layer.effect(
    Withdrawals,
    BillingLog.use(({ withdrawals }) =>
      Effect.succeed(
        Withdrawals.of({
          record: (withdrawal) =>
            Ref.modify(withdrawals, (all) => {
              const before = all.find(
                ({ stripeSubscriptionId }) =>
                  stripeSubscriptionId === withdrawal.stripeSubscriptionId
              );

              return before === undefined
                ? [withdrawal, [...all, withdrawal]]
                : [before, all];
            }),
        })
      )
    )
  ),
  Layer.effect(
    StripeContracts,
    BillingLog.use(({ business, invoices, stripe }) => {
      const asked = (call: string) =>
        Ref.update(stripe, (all) => [...all, call]);

      return Effect.succeed(
        StripeContracts.of({
          cancelAt: (_workspace, id, on) =>
            asked(`cancelAt ${id} ${DateTime.formatIso(on)}`),
          cancelAtPeriodEnd: (_workspace, id) =>
            asked(`cancelAtPeriodEnd ${id}`),
          credit: (_workspace, id, credits) =>
            asked(
              `credit ${id} ${credits.map(({ amount, invoiceId }) => `${invoiceId}:${amount}`).join(" ")}`
            ),
          endAtTrialEnd: (_workspace, id) => asked(`endAtTrialEnd ${id}`),
          endNow: (_workspace, id, reason) => asked(`endNow ${id} ${reason}`),
          isBusiness: () => Ref.get(business),
          paidInvoices: () => Ref.get(invoices),
          // A yearly business plan, VAT included.
          upcomingTotal: () =>
            Effect.succeed(Option.some({ amount: 30_000, currency: "eur" })),
        })
      );
    })
  ),
  Layer.succeed(
    ContractReferences,
    ContractReferences.of({
      eraseWorkspace: () => Effect.void,
      find: () => Effect.succeedNone,
      issue: ({ stripeSubscriptionId }) =>
        Effect.succeed(`number-of-${stripeSubscriptionId}`),
    })
  ),
  Layer.effect(
    ContractRequests,
    BillingLog.use(({ requests }) =>
      Effect.succeed(
        ContractRequests.of({
          acknowledgedTo: () => Effect.succeed(0),
          byConfirmation: () => Effect.succeedNone,
          byId: () => Effect.succeedNone,
          eraseWorkspace: () => Effect.void,
          forgetUser: () => Effect.void,
          ofUser: () => Effect.succeed([]),
          open: () => Effect.succeed([]),
          pending: () => Effect.succeed([]),
          purge: () => Effect.succeed(0),
          save: (request) => Ref.update(requests, (all) => [...all, request]),
          setConfirmation: () => Effect.void,
        })
      )
    )
  ),
  Layer.effect(
    BillingNotices,
    BillingLog.use(({ notices }) =>
      Effect.succeed(
        BillingNotices.of({
          tell: ({ key, notice }) =>
            Ref.update(notices, (all) => [...all, { key, notice }]),
        })
      )
    )
  )
);

const ActionsTest = Layer.mergeAll(
  PlaceOrder.layer,
  CheckoutOrders.layer,
  CancelSubscription.layer,
  Withdraw.layer,
  SendBillingReminders.layer
).pipe(
  Layer.provideMerge(PortsInMemory),
  Layer.provide(Ids.layerTest),
  Layer.provide(PlainPseudonymsTest),
  Layer.provide(Layer.succeed(BillingMode, BillingMode.of({ enabled: true }))),
  Layer.provideMerge(LogLive)
);

// Each test starts with nothing held, asked or told.
const reset = BillingLog.use((log) =>
  Effect.all([
    Ref.set(log.business, false),
    Ref.set(log.held, []),
    Ref.set(log.notices, []),
    Ref.set(log.orders, []),
    Ref.set(log.requests, []),
    Ref.set(log.invoices, []),
    Ref.set(log.stripe, []),
    Ref.set(log.trials, []),
    Ref.set(log.withdrawals, []),
  ])
);

const holding = (...subscriptions: readonly Subscription[]) =>
  BillingLog.use(({ held }) => Ref.set(held, subscriptions));

const askedOfStripe = BillingLog.use(({ stripe }) => Ref.get(stripe));

const paying = (...paidInvoices: readonly PaidInvoice[]) =>
  BillingLog.use(({ invoices }) => Ref.set(invoices, paidInvoices));

const told = BillingLog.use(({ notices }) => Ref.get(notices));

const setNow = (iso: string) =>
  reset.pipe(Effect.andThen(TestClock.setTime(at(iso).epochMilliseconds)));

const paid = (fields: Partial<Subscription> = {}) =>
  subscriptionOf({
    currentPeriodEnd: Option.some(at("2026-12-01T00:00:00Z")),
    currentPeriodStart: Option.some(at("2026-11-01T00:00:00Z")),
    plan: "starter",
    startedAt: Option.some(at("2026-11-01T00:00:00Z")),
    status: "active",
    stripeSubscriptionId: "sub_synthetic_paid",
    workspaceId,
    ...fields,
  });

layer(ActionsTest)("billing's actions", (it) => {
  it.effect("orders the trial once per account and per workspace", () =>
    Effect.gen(function* trial() {
      yield* setNow("2026-11-09T10:00:00Z");

      const orders = yield* PlaceOrder;
      const request = { interval: "month", plan: "pro", trial: true } as const;
      const order = yield* orders.place(actorAs(), request);

      assert.isTrue(order.trial);
      assert.strictEqual(order.consentVersion, "2026-11-10");

      yield* BillingLog.use(({ trials }) =>
        Ref.set(trials, [
          {
            plan: "pro",
            startedAt: at("2026-11-09T10:00:00Z"),
            stripeSubscriptionId: "sub_synthetic_trial",
            userId,
            workspaceId: WorkspaceIdSchema.make(
              "8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e"
            ),
          },
        ])
      );

      const used = yield* orders.place(actorAs(), request).pipe(Effect.flip);

      assert.deepInclude(used, { _tag: "TrialUnavailable", reason: "used" });

      const other = yield* orders
        .place(actorAs(), { ...request, plan: "agency" })
        .pipe(Effect.flip);

      assert.deepInclude(other, {
        _tag: "TrialUnavailable",
        reason: "notOffered",
      });
    })
  );

  it.effect(
    "takes orders only from members who manage billing, in person",
    () =>
      Effect.gen(function* people() {
        yield* setNow("2026-11-09T10:00:00Z");

        const orders = yield* PlaceOrder;

        const request = {
          interval: "year",
          plan: "business",
          trial: false,
        } as const;

        const editor = yield* orders
          .place(actorAs(permissionsFor("editor")), request)
          .pipe(Effect.flip);

        assert.strictEqual(editor._tag, "MissingPermission");

        const impersonated = yield* orders
          .place(
            actorAs(permissionsFor("owner"), {
              _tag: "user",
              impersonatedBy: Option.some(staffId),
              userId,
            }),
            request
          )
          .pipe(Effect.flip);

        assert.strictEqual(impersonated._tag, "PersonRequired");

        const apiKey = yield* orders
          .place(
            actorAs(permissionsFor("owner"), {
              _tag: "apiKey",
              apiKeyId: "key_synthetic",
            }),
            request
          )
          .pipe(Effect.flip);

        assert.strictEqual(apiKey._tag, "PersonRequired");
      })
  );

  it.effect(
    "keeps the trial running when a paid plan is ordered, until it is paid",
    () =>
      Effect.gen(function* duringTrial() {
        yield* setNow("2026-11-09T10:00:00Z");
        yield* holding(
          paid({
            plan: "pro",
            status: "trialing",
            stripeSubscriptionId: "sub_synthetic_trialing",
          })
        );

        yield* (yield* PlaceOrder).place(actorAs(), {
          interval: "month",
          plan: "pro",
          trial: false,
        });

        assert.deepStrictEqual(yield* askedOfStripe, []);
      })
  );

  it.effect(
    "starts a checkout once per order, for its plan and interval, within 30 minutes",
    () =>
      Effect.gen(function* checkout() {
        yield* setNow("2026-11-09T10:00:00Z");

        const orders = yield* PlaceOrder;
        const checkouts = yield* CheckoutOrders;

        const order = yield* orders.place(actorAs(), {
          interval: "year",
          plan: "business",
          trial: false,
        });

        const claim = {
          email: "member@example.com",
          interval: "year",
          orderId: order.id,
          plan: "business",
          userId,
          workspaceId,
        } as const;

        const wrongPlan = yield* checkouts
          .take({ ...claim, plan: "agency" })
          .pipe(Effect.flip);

        assert.strictEqual(wrongPlan._tag, "OrderRequired");

        const terms = yield* checkouts.take(claim);

        assert.isTrue(Option.isNone(terms.trialDays));

        const twice = yield* checkouts.take(claim).pipe(Effect.flip);

        assert.strictEqual(twice._tag, "OrderRequired");

        const late = yield* orders.place(actorAs(), {
          interval: "month",
          plan: "starter",
          trial: false,
        });

        yield* TestClock.adjust(Duration.minutes(31));

        const expired = yield* checkouts
          .take({
            ...claim,
            interval: "month",
            orderId: late.id,
            plan: "starter",
          })
          .pipe(Effect.flip);

        assert.strictEqual(expired._tag, "OrderRequired");

        const trial = yield* orders.place(actorAs(), {
          interval: "month",
          plan: "pro",
          trial: true,
        });

        const trialTerms = yield* checkouts.take({
          ...claim,
          interval: "month",
          orderId: trial.id,
          plan: "pro",
        });

        assert.deepStrictEqual(trialTerms.trialDays, Option.some(14));

        // An account closed with the same address had its trial.
        const again = yield* orders.place(actorAs(), {
          interval: "month",
          plan: "pro",
          trial: true,
        });

        const closed = yield* checkouts
          .take({
            ...claim,
            email: "Closed@Example.com",
            interval: "month",
            orderId: again.id,
            plan: "pro",
          })
          .pipe(Effect.flip);

        assert.deepInclude(closed, {
          _tag: "TrialUnavailable",
          reason: "used",
        });
      })
  );

  it.effect(
    "cancels a paid plan at its period's end, a trial at once, and confirms it",
    () =>
      Effect.gen(function* cancels() {
        yield* setNow("2026-11-20T10:00:00Z");

        const cancellations = yield* CancelSubscription;

        const nothing = yield* cancellations
          .cancel(actorAs())
          .pipe(Effect.flip);

        assert.strictEqual(nothing._tag, "NothingToCancel");

        yield* holding(paid());

        const cancelled = yield* cancellations.cancel(actorAs());

        assert.deepStrictEqual(cancelled, {
          endsAt: at("2026-12-01T00:00:00Z"),
          plan: "starter",
        });
        assert.deepStrictEqual(yield* askedOfStripe, [
          "cancelAtPeriodEnd sub_synthetic_paid",
        ]);
        assert.deepStrictEqual(yield* told, [
          {
            key: "subscription:sub_synthetic_paid:cancelled",
            notice: {
              _tag: "SubscriptionCancelled",
              endsAt: at("2026-12-01T00:00:00Z"),
              plan: "starter",
            },
          },
        ]);

        yield* reset;
        yield* holding(
          paid({
            plan: "pro",
            status: "trialing",
            stripeSubscriptionId: "sub_t",
          })
        );

        const trial = yield* cancellations.cancel(actorAs());

        assert.deepStrictEqual(trial.endsAt, at("2026-11-20T10:00:00Z"));
        assert.deepStrictEqual(yield* askedOfStripe, [
          "endNow sub_t trialCancelled",
        ]);

        const viewer = yield* cancellations
          .cancel(actorAs(permissionsFor("viewer")))
          .pipe(Effect.flip);

        assert.strictEqual(viewer._tag, "MissingPermission");
      })
  );

  it.effect(
    "refunds a consumer's unused days, ends the subscription and acknowledges the withdrawal",
    () =>
      Effect.gen(function* withdraws() {
        // Three days into a 30-day period paid 900 cents.
        yield* setNow("2026-11-04T00:00:00Z");
        yield* holding(paid());
        yield* paying({
          invoiceId: "in_synthetic",
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        });

        const withdrawals = yield* Withdraw;
        const preview = yield* withdrawals.preview(actorAs());

        assert.deepStrictEqual(preview, {
          endsAt: at("2026-11-15T00:00:00Z"),
          plan: "starter",
          refund: { amount: 810, currency: "eur" },
          startedAt: at("2026-11-01T00:00:00Z"),
        });

        const done = yield* withdrawals.confirm(actorAs());

        assert.deepStrictEqual(done, {
          plan: "starter",
          refunded: { amount: 810, currency: "eur" },
          withdrawnAt: at("2026-11-04T00:00:00Z"),
        });
        // The refund before the end: one tried again refunds what was
        // recorded, under the same key.
        assert.deepStrictEqual(yield* askedOfStripe, [
          "credit sub_synthetic_paid in_synthetic:810",
          "endNow sub_synthetic_paid withdrawn",
        ]);
        assert.deepStrictEqual(
          (yield* told).map(({ key }) => key),
          ["subscription:sub_synthetic_paid:withdrawn"]
        );

        yield* TestClock.adjust(Duration.hours(1));

        const again = yield* withdrawals.confirm(actorAs());

        assert.deepStrictEqual(again.refunded, {
          amount: 810,
          currency: "eur",
        });
      })
  );

  it.effect(
    "lets a consumer who cancelled still withdraw within 14 days, refunded",
    () =>
      Effect.gen(function* cancelledThenWithdrawn() {
        yield* setNow("2026-11-02T00:00:00Z");
        yield* holding(paid());
        yield* paying({
          invoiceId: "in_synthetic",
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        });

        yield* (yield* CancelSubscription).cancel(actorAs());
        // Stripe's event then says it ends with its period.
        yield* holding(paid({ cancelAtPeriodEnd: true }));
        yield* TestClock.setTime(at("2026-11-04T00:00:00Z").epochMilliseconds);

        const done = yield* (yield* Withdraw).confirm(actorAs());

        assert.deepStrictEqual(done.refunded, { amount: 810, currency: "eur" });
        assert.deepStrictEqual(yield* askedOfStripe, [
          "cancelAtPeriodEnd sub_synthetic_paid",
          "credit sub_synthetic_paid in_synthetic:810",
          "endNow sub_synthetic_paid withdrawn",
        ]);
      })
  );

  it.effect(
    "refunds every payment since the contract started, each for the unused part of its own period",
    () =>
      Effect.gen(function* everyPayment() {
        // A starter plan paid 900 on the 1st; on the 6th, a change of plan
        // charged 1500 more for the 24 days left of the period.
        yield* setNow("2026-11-11T00:00:00Z");
        yield* holding(paid());
        yield* paying(
          {
            invoiceId: "in_proration",
            paid: { amount: 1500, currency: "eur" },
            periodEnd: Option.some(at("2026-12-01T00:00:00Z")),
            periodStart: Option.some(at("2026-11-07T00:00:00Z")),
          },
          {
            invoiceId: "in_first",
            paid: { amount: 900, currency: "eur" },
            periodEnd: Option.some(at("2026-12-01T00:00:00Z")),
            periodStart: Option.some(at("2026-11-01T00:00:00Z")),
          }
        );

        const preview = yield* (yield* Withdraw).preview(actorAs());

        // 20 of 24 days of 1500, and 20 of 30 days of 900.
        assert.deepStrictEqual(preview.refund, {
          amount: 1250 + 600,
          currency: "eur",
        });

        yield* (yield* Withdraw).confirm(actorAs());

        assert.deepStrictEqual(yield* askedOfStripe, [
          "credit sub_synthetic_paid in_proration:1250 in_first:600",
          "endNow sub_synthetic_paid withdrawn",
        ]);
      })
  );

  it.effect("refuses a withdrawal to a business and after 14 days", () =>
    Effect.gen(function* refuses() {
      yield* setNow("2026-11-04T00:00:00Z");
      yield* holding(paid());
      yield* BillingLog.use(({ business }) => Ref.set(business, true));

      const withdrawals = yield* Withdraw;
      const business = yield* withdrawals.confirm(actorAs()).pipe(Effect.flip);

      assert.deepInclude(business, {
        _tag: "WithdrawalUnavailable",
        reason: "business",
      });

      yield* BillingLog.use((log) => Ref.set(log.business, false));
      yield* TestClock.setTime(at("2026-11-16T00:00:00Z").epochMilliseconds);

      const late = yield* withdrawals.confirm(actorAs()).pipe(Effect.flip);

      assert.deepInclude(late, {
        _tag: "WithdrawalUnavailable",
        reason: "expired",
      });
      assert.deepStrictEqual(yield* askedOfStripe, []);
    })
  );

  it.effect("reminds a trial's end and a yearly plan's renewal", () =>
    Effect.gen(function* reminds() {
      yield* setNow("2026-12-20T09:00:00Z");
      yield* holding(
        paid({
          currentPeriodEnd: Option.some(at("2027-01-31T00:00:00Z")),
          interval: "year",
          plan: "business",
          stripeSubscriptionId: "sub_yearly",
        }),
        paid({
          plan: "pro",
          status: "trialing",
          stripeSubscriptionId: "sub_trial",
          trialEnd: Option.some(at("2026-12-22T10:00:00Z")),
        }),
        paid({ stripeSubscriptionId: "sub_monthly" })
      );

      const count = yield* (yield* SendBillingReminders).run;

      assert.strictEqual(count, 2);
      assert.deepStrictEqual(yield* told, [
        {
          key: `subscription:sub_yearly:renewal:${at("2027-01-31T00:00:00Z").epochMilliseconds}`,
          notice: {
            _tag: "SubscriptionRenewing",
            plan: "business",
            price: { amount: 30_000, currency: "eur" },
            reference: "number-of-sub_yearly",
            renewsAt: at("2027-01-31T00:00:00Z"),
          },
        },
        {
          key: "subscription:sub_trial:trial-ending",
          notice: {
            _tag: "TrialEnding",
            endsAt: at("2026-12-22T10:00:00Z"),
            plan: "pro",
          },
        },
      ]);
    })
  );

  it.effect(
    "waits to confirm a subscription until Stripe says what it charged",
    () =>
      Effect.gen(function* waits() {
        yield* setNow("2026-11-09T11:00:00Z");
        yield* holding(
          paid({
            startedAt: Option.some(at("2026-11-09T10:30:00Z")),
            stripeSubscriptionId: "sub_unpaid",
          })
        );

        assert.strictEqual(yield* (yield* SendBillingReminders).run, 0);
        assert.deepStrictEqual(yield* told, []);
      })
  );

  it.effect(
    "confirms a subscription that started, with what Stripe charged",
    () =>
      Effect.gen(function* confirms() {
        yield* setNow("2026-11-09T11:00:00Z");
        yield* paying({
          invoiceId: "in_synthetic",
          paid: { amount: 30_000, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        });
        yield* holding(
          paid({
            interval: "year",
            plan: "business",
            startedAt: Option.some(at("2026-11-09T10:30:00Z")),
            stripeSubscriptionId: "sub_new",
          })
        );

        assert.strictEqual(yield* (yield* SendBillingReminders).run, 1);
        assert.deepStrictEqual(yield* told, [
          {
            key: "subscription:sub_new:started",
            notice: {
              _tag: "SubscriptionStarted",
              interval: "year",
              plan: "business",
              price: { amount: 30_000, currency: "eur" },
              reference: "number-of-sub_new",
              startedAt: at("2026-11-09T10:30:00Z"),
              trialEnd: Option.none(),
            },
          },
        ]);
      })
  );

  it.effect(
    "records what a member asked in session, with when: the proof of the request",
    () =>
      Effect.gen(function* recorded() {
        yield* setNow("2026-11-04T00:00:00Z");
        yield* holding(paid());
        yield* paying({
          invoiceId: "in_synthetic",
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        });

        yield* (yield* CancelSubscription).cancel(actorAs());
        yield* holding(paid({ cancelAtPeriodEnd: true }));
        yield* (yield* Withdraw).confirm(actorAs());

        const requests = yield* BillingLog.use((log) => Ref.get(log.requests));

        assert.deepStrictEqual(
          requests.map((request) => ({
            channel: request.channel,
            effectiveAt: request.effectiveAt,
            kind: request.kind,
            receivedAt: request.receivedAt,
            refunded: request.refunded,
            status: request.status,
            stripeSubscriptionId: request.stripeSubscriptionId,
            userId: request.userId,
            workspaceId: request.workspaceId,
          })),
          [
            {
              channel: "session",
              effectiveAt: Option.some(at("2026-12-01T00:00:00Z")),
              kind: "cancellation",
              receivedAt: at("2026-11-04T00:00:00Z"),
              refunded: Option.none(),
              status: "applied",
              stripeSubscriptionId: Option.some("sub_synthetic_paid"),
              userId: Option.some(userId),
              workspaceId: Option.some(workspaceId),
            },
            {
              channel: "session",
              effectiveAt: Option.some(at("2026-11-04T00:00:00Z")),
              kind: "withdrawal",
              receivedAt: at("2026-11-04T00:00:00Z"),
              refunded: Option.some({ amount: 810, currency: "eur" }),
              status: "applied",
              stripeSubscriptionId: Option.some("sub_synthetic_paid"),
              userId: Option.some(userId),
              workspaceId: Option.some(workspaceId),
            },
          ]
        );
      })
  );

  it.effect(
    "applies a cancellation received before a renewal as of that day: the renewal goes back and the plan ends",
    () =>
      Effect.gen(function* late() {
        // Received on 30 November; the plan renewed on 1 December; applied
        // on the 2nd.
        yield* setNow("2026-12-02T09:00:00Z");
        yield* holding(
          paid({
            currentPeriodEnd: Option.some(at("2027-01-01T00:00:00Z")),
            currentPeriodStart: Option.some(at("2026-12-01T00:00:00Z")),
          })
        );
        yield* paying(
          {
            invoiceId: "in_december",
            paid: { amount: 900, currency: "eur" },
            periodEnd: Option.some(at("2027-01-01T00:00:00Z")),
            periodStart: Option.some(at("2026-12-01T00:00:00Z")),
          },
          {
            invoiceId: "in_november",
            paid: { amount: 900, currency: "eur" },
            periodEnd: Option.some(at("2026-12-01T00:00:00Z")),
            periodStart: Option.some(at("2026-11-01T00:00:00Z")),
          }
        );

        const cancellations = yield* CancelSubscription;

        const done = yield* cancellations.received({
          desiredAt: Option.none(),
          receivedAt: at("2026-11-30T22:00:00Z"),
          stripeSubscriptionId: Option.some("sub_synthetic_paid"),
          workspaceId,
        });

        assert.deepStrictEqual(done, {
          endsAt: at("2026-12-02T09:00:00Z"),
          plan: "starter",
          refunded: Option.some({ amount: 900, currency: "eur" }),
          stripeSubscriptionId: "sub_synthetic_paid",
        });
        assert.deepStrictEqual(yield* askedOfStripe, [
          "credit sub_synthetic_paid in_december:900",
          "endNow sub_synthetic_paid cancelledLate",
        ]);

        // One that names another subscription than the workspace's cancels
        // nothing.
        yield* reset;
        yield* holding(paid());

        const other = yield* cancellations
          .received({
            desiredAt: Option.none(),
            receivedAt: at("2026-11-30T22:00:00Z"),
            stripeSubscriptionId: Option.some("sub_other"),
            workspaceId,
          })
          .pipe(Effect.flip);

        assert.strictEqual(other._tag, "NothingToCancel");
        assert.deepStrictEqual(yield* askedOfStripe, []);
      })
  );

  it.effect(
    "ends a plan on the day its member asks for, when that is after the period paid for",
    () =>
      Effect.gen(function* onDate() {
        yield* setNow("2026-11-20T10:00:00Z");
        yield* holding(paid());

        const cancelled = yield* (yield* CancelSubscription).cancel(
          actorAs(),
          Option.some(at("2027-02-16T00:00:00Z"))
        );

        assert.deepStrictEqual(cancelled, {
          endsAt: at("2027-02-16T00:00:00Z"),
          plan: "starter",
        });
        assert.deepStrictEqual(yield* askedOfStripe, [
          "cancelAt sub_synthetic_paid 2027-02-16T00:00:00.000Z",
        ]);
      })
  );

  it.effect(
    "counts a withdrawal's 14 days, and its refund, from when it was received",
    () =>
      Effect.gen(function* receivedWithdrawal() {
        // The contract started on 1 November. A withdrawal received on the
        // 14th and applied on the 17th is in time, and refunds from the
        // 14th; one received on the 15th is late.
        yield* setNow("2026-11-17T00:00:00Z");
        yield* holding(paid());
        yield* paying({
          invoiceId: "in_synthetic",
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        });

        const withdrawals = yield* Withdraw;

        const late = yield* withdrawals
          .received({
            receivedAt: at("2026-11-15T00:00:00Z"),
            stripeSubscriptionId: Option.none(),
            userId: Option.none(),
            workspaceId,
          })
          .pipe(Effect.flip);

        assert.deepInclude(late, {
          _tag: "WithdrawalUnavailable",
          reason: "expired",
        });

        const done = yield* withdrawals.received({
          receivedAt: at("2026-11-14T00:00:00Z"),
          stripeSubscriptionId: Option.none(),
          userId: Option.none(),
          workspaceId,
        });

        // 17 of 30 days left on the 14th: 900 × 17 / 30.
        assert.deepStrictEqual(done, {
          plan: "starter",
          refunded: { amount: 510, currency: "eur" },
          stripeSubscriptionId: "sub_synthetic_paid",
          withdrawnAt: at("2026-11-14T00:00:00Z"),
        });
        assert.deepStrictEqual(yield* askedOfStripe, [
          "credit sub_synthetic_paid in_synthetic:510",
          "endNow sub_synthetic_paid withdrawn",
        ]);
        assert.deepStrictEqual(
          (yield* BillingLog.use((log) => Ref.get(log.withdrawals))).map(
            ({ userId: by }) => by
          ),
          [Option.none()]
        );
      })
  );
});
