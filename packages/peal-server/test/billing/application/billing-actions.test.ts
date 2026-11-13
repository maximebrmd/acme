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

import { BillingOverview } from "#billing/application/billing-overview.ts";
import { CancelSubscription } from "#billing/application/cancel-subscription.ts";
import { CheckoutOrders } from "#billing/application/checkout-orders.ts";
import { PlaceOrder } from "#billing/application/place-order.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { BillingNotices } from "#billing/application/ports/billing-notices.ts";
import { ContractReferences } from "#billing/application/ports/contract-references.ts";
import { ContractRequests } from "#billing/application/ports/contract-requests.ts";
import { MemberAddresses } from "#billing/application/ports/member-addresses.ts";
import { Orders } from "#billing/application/ports/orders.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type { PaidInvoice } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { Trials } from "#billing/application/ports/trials.ts";
import type { StartedTrial } from "#billing/application/ports/trials.ts";
import { UsageAtCheckout } from "#billing/application/ports/usage-at-checkout.ts";
import { Withdrawals } from "#billing/application/ports/withdrawals.ts";
import type { Withdrawal } from "#billing/application/ports/withdrawals.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { SendBillingReminders } from "#billing/application/send-billing-reminders.ts";
import { Withdraw } from "#billing/application/withdraw.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { AlreadySubscribed } from "#billing/domain/already-subscribed.ts";
import type { BillingNotice } from "#billing/domain/billing-notice.ts";
import { ConsentChanged } from "#billing/domain/consent-changed.ts";
import { ContractRequestIdSchema } from "#billing/domain/contract-request.ts";
import type {
  ContractRequest,
  RequestIntent,
} from "#billing/domain/contract-request.ts";
import { consentVersion, Order, OrderIdSchema } from "#billing/domain/order.ts";
import { PlanNotSold } from "#billing/domain/plan-not-sold.ts";
import { rateCard } from "#billing/domain/rate-card.ts";
import type { Holdings } from "#billing/domain/standing.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import { Ids } from "#shared/application/ids.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  AloneInAccountsTest,
  PlainPseudonymsTest,
  subscriptionOf,
  AccountDaysUncountedTest,
  NoOwnChannelsTest,
} from "#test/billing/support.ts";
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

// A workspace every plan holds.
const small: Holdings = { channels: 1, mediaStorage: 0, members: 1 };

// What a test sets and reads: the subscriptions billing holds, what was
// asked of Stripe, the notices told, and the payment Stripe reports.
class BillingLog extends Context.Service<
  BillingLog,
  {
    readonly address: Ref.Ref<string>;
    readonly business: Ref.Ref<boolean>;
    readonly held: Ref.Ref<readonly Subscription[]>;
    readonly holdings: Ref.Ref<Holdings>;
    readonly notices: Ref.Ref<
      readonly { readonly key: string; readonly notice: BillingNotice }[]
    >;
    readonly orders: Ref.Ref<readonly PlacedOrder[]>;
    readonly requests: Ref.Ref<readonly ContractRequest[]>;
    readonly invoices: Ref.Ref<readonly PaidInvoice[]>;
    /** The request keys Stripe was asked under, in order. */
    readonly keys: Ref.Ref<readonly string[]>;
    readonly stripe: Ref.Ref<readonly string[]>;
    readonly trials: Ref.Ref<readonly StartedTrial[]>;
    readonly withdrawals: Ref.Ref<readonly Withdrawal[]>;
  }
>()("peal-server/test/billing/BillingLog") {}

const LogLive = Layer.effect(
  BillingLog,
  Effect.all({
    address: Ref.make("member@example.com"),
    business: Ref.make(false),
    held: Ref.make<readonly Subscription[]>([]),
    holdings: Ref.make(small),
    invoices: Ref.make<readonly PaidInvoice[]>([]),
    keys: Ref.make<readonly string[]>([]),
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

// What the workspace holds, as a test sets it: within every plan unless
// told.
const UsageTest = Layer.effect(
  WorkspaceUsage,
  BillingLog.use(({ holdings }) =>
    Effect.succeed(
      WorkspaceUsage.of({
        storedBy: () => Effect.die("not read here"),
        heldIn: () => Effect.die("not read here"),
        of: () =>
          Ref.get(holdings).pipe(
            Effect.map((held) => ({
              ...held,
              assistantRequests: {
                resetsAt: at("2026-12-21T00:00:00Z"),
                used: 0,
              },
              scheduledPosts: { resetsAt: at("2027-01-01T00:00:00Z"), used: 0 },
            }))
          ),
      })
    )
  )
);

// The address the member's account has, as a test sets it.
const AddressesTest = Layer.effect(
  MemberAddresses,
  BillingLog.use(({ address }) =>
    Effect.succeed(
      MemberAddresses.of({
        of: () => Ref.get(address).pipe(Effect.map(Option.some)),
      })
    )
  )
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
          ofWorkspaces: () => Effect.die("not read here"),
          markPaidInvoice: () => Effect.void,
          perAccount: () => Effect.succeed([]),
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
    BillingLog.use(({ business, invoices, keys, stripe }) => {
      const asked = (call: string) =>
        Ref.update(stripe, (all) => [...all, call]);

      const keyed = (key: string) => Ref.update(keys, (all) => [...all, key]);

      return Effect.succeed(
        StripeContracts.of({
          cancelAt: (_workspace, id, on, key) =>
            asked(`cancelAt ${id} ${DateTime.formatIso(on)}`).pipe(
              Effect.andThen(keyed(key))
            ),
          cancelAtPeriodEnd: (_workspace, id, key) =>
            asked(`cancelAtPeriodEnd ${id}`).pipe(Effect.andThen(keyed(key))),
          credit: (_workspace, id, credits) =>
            asked(
              `credit ${id} ${credits.map(({ amount, invoiceId }) => `${invoiceId}:${amount}`).join(" ")}`
            ),
          endAtTrialEnd: (_workspace, id) => asked(`endAtTrialEnd ${id}`),
          endAndInvoice: (_workspace, id, reason) =>
            asked(`endAndInvoice ${id} ${reason}`),
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
          byConfirmation: () => Effect.succeedNone,
          byId: () => Effect.succeedNone,
          claimAcknowledgement: () => Effect.succeed(true),
          eraseWorkspace: () => Effect.void,
          forgetUser: () => Effect.void,
          ofUser: () => Effect.succeed([]),
          open: () => Effect.succeed([]),
          pending: () => Effect.succeed([]),
          purge: () => Effect.succeed(0),
          // As the table keeps them: one row a request, by its id.
          save: (request) =>
            Ref.update(requests, (all) => [
              ...all.filter(({ id }) => id !== request.id),
              request,
            ]),
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

// The workspace that bills each workspace's account: its own, unless a
// test hands it to another.
const billedBy = Ref.makeUnsafe<Option.Option<WorkspaceId>>(Option.none());

const BilledByTest = Layer.succeed(
  PlanHolders,
  PlanHolders.ofHolders({
    holderOf: (id) =>
      Ref.get(billedBy).pipe(Effect.map(Option.getOrElse(() => id))),
    holdersOf: (ids) => Effect.succeed(new Map(ids.map((id) => [id, id]))),
  })
);

const ActionsTest = Layer.mergeAll(
  BillingOverview.layer.pipe(Layer.provide(WorkspaceEntitlements.layer)),
  PlaceOrder.layer,
  CheckoutOrders.layer,
  CancelSubscription.layer,
  Withdraw.layer,
  SendBillingReminders.layer.pipe(Layer.provide(WorkspaceEntitlements.layer))
).pipe(
  Layer.provideMerge(PortsInMemory),
  Layer.provide(Ids.layerTest),
  Layer.provide(PlainPseudonymsTest),
  Layer.provide(
    Layer.effect(
      UsageAtCheckout,
      WorkspaceUsage.use((usage) =>
        Effect.succeed(
          UsageAtCheckout.of({
            bind: () => Effect.void,
            of: (id) => usage.of(id).pipe(Effect.map(Option.some)),
          })
        )
      )
    )
  ),
  Layer.provide(UsageTest),
  Layer.provide(AddressesTest),
  Layer.provide(
    Layer.succeed(
      BillingMode,
      BillingMode.of({
        enabled: true,
        graceSince: Option.none(),
        graceUntil: Option.none(),
      })
    )
  ),
  Layer.provide(AloneInAccountsTest),
  Layer.provide(Layer.merge(AccountDaysUncountedTest, NoOwnChannelsTest)),
  Layer.provide(BilledByTest),
  Layer.provideMerge(LogLive)
);

// Each test starts with nothing held, asked or told.
const reset = BillingLog.use((log) =>
  Effect.all([
    Ref.set(log.address, "member@example.com"),
    Ref.set(log.business, false),
    Ref.set(log.held, []),
    Ref.set(log.holdings, small),
    Ref.set(log.notices, []),
    Ref.set(log.orders, []),
    Ref.set(log.requests, []),
    Ref.set(log.invoices, []),
    Ref.set(log.keys, []),
    Ref.set(log.stripe, []),
    Ref.set(log.trials, []),
    Ref.set(log.withdrawals, []),
  ])
);

const holding = (...subscriptions: readonly Subscription[]) =>
  BillingLog.use(({ held }) => Ref.set(held, subscriptions));

const holds = (holdings: Holdings) =>
  BillingLog.use((log) => Ref.set(log.holdings, holdings));

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

// A request that came earlier, with nothing decided for it yet.
const statement = { decided: () => Effect.void, intent: Option.none() };

const asRequest = {
  ...statement,
  requestId: ContractRequestIdSchema.make(
    "0190f3a0-0000-7000-8000-00000000aa01"
  ),
};

// An order placed before legacy plans and trials stopped being sold.
const placedBefore = (id: string, plan: "pro" | "starter", trial: boolean) =>
  new Order({
    consentVersion: "2026-11-10",
    createdAt: at("2026-11-09T09:55:00Z"),
    id: OrderIdSchema.make(id),
    interval: "month",
    plan,
    trial,
    userId,
    workspaceId,
  });

layer(ActionsTest)("billing's actions", (it) => {
  it.effect(
    "orders per-account pricing, monthly, and neither a trial nor a legacy plan",
    () =>
      Effect.gen(function* ordering() {
        yield* setNow("2026-11-09T10:00:00Z");

        const orders = yield* PlaceOrder;

        const order = yield* orders.place(actorAs(), {
          consentVersion,
          interval: "month",
          plan: "payAsYouGo",
          trial: false,
        });

        assert.strictEqual(order.plan, "payAsYouGo");
        assert.strictEqual(order.interval, "month");
        assert.isFalse(order.trial);
        assert.strictEqual(order.consentVersion, consentVersion);

        const trial = yield* orders
          .place(actorAs(), { interval: "month", plan: "pro", trial: true })
          .pipe(Effect.flip);

        assert.deepInclude(trial, {
          _tag: "TrialUnavailable",
          reason: "notOffered",
        });

        const legacy = yield* orders
          .place(actorAs(), { interval: "month", plan: "agency", trial: false })
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          legacy,
          new PlanNotSold({ interval: "month", plan: "agency" })
        );

        const yearly = yield* orders
          .place(actorAs(), {
            consentVersion,
            interval: "year",
            plan: "payAsYouGo",
            trial: false,
          })
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          yearly,
          new PlanNotSold({ interval: "year", plan: "payAsYouGo" })
        );
        assert.lengthOf(
          yield* BillingLog.use(({ orders: placed }) => Ref.get(placed)),
          1
        );
      })
  );

  it.effect(
    "orders nothing more for an account already on per-account pricing, even past due or unpaid",
    () =>
      Effect.gen(function* twice() {
        const orders = yield* PlaceOrder;

        const request = {
          consentVersion,
          interval: "month",
          plan: "payAsYouGo",
          trial: false,
        } as const;

        for (const status of ["active", "past_due", "unpaid"] as const) {
          yield* setNow("2026-11-09T10:00:00Z");
          yield* holding(paid({ plan: "payAsYouGo", status }));

          assert.deepStrictEqual(
            yield* orders.place(actorAs(), request).pipe(Effect.flip),
            new AlreadySubscribed({ status })
          );
        }

        // One that ended orders again.
        yield* setNow("2026-11-09T10:00:00Z");
        yield* holding(paid({ plan: "payAsYouGo", status: "canceled" }));

        assert.strictEqual(
          (yield* orders.place(actorAs(), request)).plan,
          "payAsYouGo"
        );
      })
  );

  it.effect(
    "starts no checkout once the account is on per-account pricing, though the order was placed before",
    () =>
      Effect.gen(function* raced() {
        yield* setNow("2026-11-09T10:00:00Z");

        const order = yield* (yield* PlaceOrder).place(actorAs(), {
          consentVersion,
          interval: "month",
          plan: "payAsYouGo",
          trial: false,
        });

        // Another manager's checkout went through meanwhile.
        yield* holding(paid({ plan: "payAsYouGo" }));

        assert.deepStrictEqual(
          yield* (yield* CheckoutOrders)
            .take({
              email: "member@example.com",
              interval: "month",
              orderId: order.id,
              plan: "payAsYouGo",
              userId,
              workspaceId,
            })
            .pipe(Effect.flip),
          new AlreadySubscribed({ status: "active" })
        );
      })
  );

  it.effect(
    "refuses an order whose box was shown in other words than the server records",
    () =>
      Effect.gen(function* words() {
        yield* setNow("2026-11-09T10:00:00Z");

        const orders = yield* PlaceOrder;

        const request = {
          interval: "month",
          plan: "payAsYouGo",
          trial: false,
        } as const;

        assert.deepStrictEqual(
          yield* orders
            .place(actorAs(), { ...request, consentVersion: "2026-11-10" })
            .pipe(Effect.flip),
          new ConsentChanged({ current: consentVersion, shown: "2026-11-10" })
        );
        // A page older than the version itself names none.
        assert.deepStrictEqual(
          yield* orders.place(actorAs(), request).pipe(Effect.flip),
          new ConsentChanged({ current: consentVersion })
        );
        // The legacy plans answer as they did.
        assert.strictEqual(
          (yield* orders
            .place(actorAs(), { ...request, plan: "starter" })
            .pipe(Effect.flip))._tag,
          "PlanNotSold"
        );
        assert.strictEqual(
          (yield* orders.place(actorAs(), { ...request, consentVersion }))
            .consentVersion,
          consentVersion
        );
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
    "keeps the trial running when per-account pricing is ordered, until it is paid",
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
          consentVersion,
          interval: "month",
          plan: "payAsYouGo",
          trial: false,
        });

        assert.deepStrictEqual(yield* askedOfStripe, []);
      })
  );

  it.effect(
    "starts no checkout for a legacy plan or a trial ordered before they stopped being sold",
    () =>
      Effect.gen(function* notSold() {
        yield* setNow("2026-11-09T10:00:00Z");

        const legacy = placedBefore(
          "0190f3a0-0000-7000-8000-0000000000c1",
          "starter",
          false
        );

        const trial = placedBefore(
          "0190f3a0-0000-7000-8000-0000000000c2",
          "pro",
          true
        );

        yield* BillingLog.use(({ orders }) =>
          Ref.set(orders, [
            { order: legacy, used: false },
            { order: trial, used: false },
          ])
        );

        const checkouts = yield* CheckoutOrders;

        const take = (order: Order) =>
          checkouts
            .take({
              email: "member@example.com",
              interval: "month",
              orderId: order.id,
              plan: order.plan,
              userId,
              workspaceId,
            })
            .pipe(Effect.flip);

        assert.strictEqual((yield* take(legacy))._tag, "OrderRequired");
        assert.deepInclude(yield* take(trial), {
          _tag: "TrialUnavailable",
          reason: "notOffered",
        });
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
          consentVersion,
          interval: "month",
          plan: "payAsYouGo",
          trial: false,
        });

        const claim = {
          email: "member@example.com",
          interval: "month",
          orderId: order.id,
          plan: "payAsYouGo",
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

        // Ordered while the workspace billed its account, taken once it no
        // longer does: refused.
        const moved = yield* orders.place(actorAs(), {
          consentVersion,
          interval: "month",
          plan: "payAsYouGo",
          trial: false,
        });

        yield* Ref.set(
          billedBy,
          Option.some(
            WorkspaceIdSchema.make("00000000-0000-4000-8000-0000000b111e")
          )
        );

        const elsewhere = yield* checkouts
          .take({ ...claim, orderId: moved.id })
          .pipe(Effect.flip, Effect.ensuring(Ref.set(billedBy, Option.none())));

        assert.strictEqual(elsewhere._tag, "OrderRequired");

        const late = yield* orders.place(actorAs(), {
          consentVersion,
          interval: "month",
          plan: "payAsYouGo",
          trial: false,
        });

        yield* TestClock.adjust(Duration.minutes(31));

        const expired = yield* checkouts
          .take({ ...claim, orderId: late.id })
          .pipe(Effect.flip);

        assert.strictEqual(expired._tag, "OrderRequired");
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
        const [asked] = yield* BillingLog.use((log) => Ref.get(log.requests));

        // Told under the request's own key: cancelled again later, as
        // after the cancellation was undone, the members are told again.
        assert.deepStrictEqual(yield* told, [
          {
            key: `subscription:sub_synthetic_paid:cancelled:${asked?.id ?? ""}`,
            notice: {
              _tag: "SubscriptionCancelled",
              endsAt: at("2026-12-01T00:00:00Z"),
              plan: "starter",
            },
          },
        ]);

        // Undone since, in Stripe's portal or by staff: cancelling again
        // is another request, which Stripe is asked under another key.
        yield* cancellations.cancel(actorAs());

        const keys = yield* BillingLog.use((log) => Ref.get(log.keys));

        assert.lengthOf(keys, 2);
        assert.notStrictEqual(keys[0], keys[1]);
        assert.lengthOf(yield* told, 2);

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
          lines: [],
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
    "lets a workspace that holds more than its plan allows cancel and withdraw all the same",
    () =>
      Effect.gen(function* overPlan() {
        // Three days into a 30-day period paid 900 cents, with far more
        // channels, members and media than any plan it could move to.
        yield* setNow("2026-11-04T00:00:00Z");
        yield* holds({
          channels: 400,
          mediaStorage: 900_000_000_000,
          members: 90,
        });
        yield* holding(paid());
        yield* paying({
          invoiceId: "in_synthetic",
          lines: [],
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        });

        const cancelled = yield* (yield* CancelSubscription).cancel(actorAs());

        assert.deepStrictEqual(cancelled, {
          endsAt: at("2026-12-01T00:00:00Z"),
          plan: "starter",
        });

        const withdrawn = yield* (yield* Withdraw).confirm(actorAs());

        assert.deepStrictEqual(withdrawn.refunded, {
          amount: 810,
          currency: "eur",
        });
        assert.deepStrictEqual(yield* askedOfStripe, [
          "cancelAtPeriodEnd sub_synthetic_paid",
          "credit sub_synthetic_paid in_synthetic:810",
          "endNow sub_synthetic_paid withdrawn",
        ]);
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
          lines: [],
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
            lines: [],
            paid: { amount: 1500, currency: "eur" },
            periodEnd: Option.some(at("2026-12-01T00:00:00Z")),
            periodStart: Option.some(at("2026-11-07T00:00:00Z")),
          },
          {
            invoiceId: "in_first",
            lines: [],
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

  it.effect(
    "credits nothing on a withdrawal from per-account pricing, whose paid invoices were for usage supplied",
    () =>
      Effect.gen(function* perAccountWithdrawal() {
        // The month past's arrears, paid on the 1st, its lines without a
        // period: the running month's would otherwise refund part of it.
        yield* setNow("2026-11-04T00:00:00Z");
        yield* holding(paid({ plan: "payAsYouGo" }));
        yield* paying({
          invoiceId: "in_synthetic_arrears",
          lines: [],
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        });

        const preview = yield* (yield* Withdraw).preview(actorAs());

        assert.deepStrictEqual(preview.refund, { amount: 0, currency: "eur" });

        const done = yield* (yield* Withdraw).confirm(actorAs());

        assert.deepStrictEqual(done.refunded, { amount: 0, currency: "eur" });
        assert.deepStrictEqual(yield* askedOfStripe, [
          "endAndInvoice sub_synthetic_paid withdrawn",
        ]);
      })
  );

  it.effect("offers no trial: the free accounts replace it", () =>
    Effect.gen(function* noTrial() {
      yield* setNow("2026-11-09T10:00:00Z");

      const trial = yield* BillingOverview.use((billing) =>
        billing.of(actorAs())
      ).pipe(Effect.map(({ trial: offer }) => Option.getOrThrow(offer)));

      assert.isFalse(trial.available);
      assert.deepInclude(
        yield* PlaceOrder.use((orders) =>
          orders.place(actorAs(), {
            interval: "month",
            plan: "pro",
            trial: true,
          })
        ).pipe(Effect.flip),
        { _tag: "TrialUnavailable", reason: "notOffered" }
      );
      assert.deepStrictEqual(
        yield* BillingLog.use(({ orders }) => Ref.get(orders)),
        []
      );
    })
  );

  it.effect(
    "orders per-account pricing whatever a legacy plan's workspace holds",
    () =>
      Effect.gen(function* holdsAll() {
        yield* setNow("2026-11-09T10:00:00Z");
        yield* holds({
          channels: 80,
          mediaStorage: 200_000_000_000,
          members: 40,
        });
        yield* holding(paid({ plan: "agency" }));

        const order = yield* (yield* PlaceOrder).place(actorAs(), {
          consentVersion,
          interval: "month",
          plan: "payAsYouGo",
          trial: false,
        });

        assert.strictEqual(order.plan, "payAsYouGo");
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
      yield* holds({ channels: 8, mediaStorage: 900_000_000, members: 2 });
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
          // With what the workspace holds beyond the free plan it moves to.
          notice: {
            _tag: "TrialEnding",
            endsAt: at("2026-12-22T10:00:00Z"),
            over: [{ allowed: 2, limit: "channels", used: 8 }],
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
          lines: [],
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
    "confirms per-account pricing with its rates, before any invoice",
    () =>
      Effect.gen(function* confirmsRates() {
        yield* setNow("2026-11-09T11:00:00Z");
        yield* holding(
          paid({
            plan: "payAsYouGo",
            startedAt: Option.some(at("2026-11-09T10:30:00Z")),
            stripeSubscriptionId: "sub_accounts",
          })
        );

        assert.strictEqual(yield* (yield* SendBillingReminders).run, 1);
        assert.deepStrictEqual(yield* told, [
          {
            key: "subscription:sub_accounts:started",
            notice: {
              _tag: "SubscriptionStarted",
              interval: "month",
              plan: "payAsYouGo",
              price: { amount: 0, currency: "usd" },
              rates: {
                bands: rateCard.prices.usd.accounts.bands,
                currency: "usd",
                freeAccounts: 2,
              },
              reference: "number-of-sub_accounts",
              startedAt: at("2026-11-09T10:30:00Z"),
              trialEnd: Option.none(),
            },
          },
        ]);
        // Nothing was asked of Stripe: no invoice says a price.
        assert.deepStrictEqual(yield* askedOfStripe, []);
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
          lines: [],
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
          // The renewal's invoice also settles a change of plan made on
          // 10 November, before the request: 1,415 before tax.
          {
            invoiceId: "in_december",
            lines: [
              { amount: -250, start: at("2026-11-10T00:00:00Z") },
              { amount: 415, start: at("2026-11-10T00:00:00Z") },
              { amount: 1250, start: at("2026-12-01T00:00:00Z") },
            ],
            paid: { amount: 1698, currency: "eur" },
            periodEnd: Option.some(at("2027-01-01T00:00:00Z")),
            periodStart: Option.some(at("2026-11-10T00:00:00Z")),
          },
          {
            invoiceId: "in_november",
            lines: [{ amount: 750, start: at("2026-11-01T00:00:00Z") }],
            paid: { amount: 900, currency: "eur" },
            periodEnd: Option.some(at("2026-12-01T00:00:00Z")),
            periodStart: Option.some(at("2026-11-01T00:00:00Z")),
          }
        );

        const cancellations = yield* CancelSubscription;

        const done = yield* cancellations.received({
          ...asRequest,
          desiredAt: Option.none(),
          receivedAt: at("2026-11-30T22:00:00Z"),
          stripeSubscriptionId: Option.some("sub_synthetic_paid"),
          workspaceId,
        });

        assert.deepStrictEqual(done, {
          endsAt: at("2026-12-02T09:00:00Z"),
          plan: "starter",
          // The renewal with its tax, not what the change of plan cost.
          refunded: Option.some({ amount: 1500, currency: "eur" }),
          stripeSubscriptionId: "sub_synthetic_paid",
        });
        assert.deepStrictEqual(yield* askedOfStripe, [
          "credit sub_synthetic_paid in_december:1500",
          "endNow sub_synthetic_paid cancelledLate",
        ]);

        // One that names another subscription than the workspace's cancels
        // nothing.
        yield* reset;
        yield* holding(paid());

        const other = yield* cancellations
          .received({
            ...asRequest,
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
    "takes up a cancellation as it was decided, when a try stopped after Stripe: never 'nothing to cancel' for what it cancelled itself",
    () =>
      Effect.gen(function* takenUp() {
        yield* setNow("2026-11-20T10:00:00Z");
        yield* holding(paid());

        const cancellations = yield* CancelSubscription;
        const decided = yield* Ref.make(Option.none<RequestIntent>());

        const request = {
          ...asRequest,
          decided: (intent: RequestIntent) =>
            Ref.set(decided, Option.some(intent)),
          desiredAt: Option.none(),
          receivedAt: at("2026-11-20T10:00:00Z"),
          stripeSubscriptionId: Option.none(),
          workspaceId,
        };

        const first = yield* cancellations.received(request);

        // What was decided is kept before Stripe is asked.
        assert.deepStrictEqual(
          yield* Ref.get(decided),
          Option.some({
            effect: {
              endsAt: "2026-12-01T00:00:00.000Z",
              refundSince: null,
              tag: "atPeriodEnd" as const,
            },
            plan: "starter" as const,
            stripeSubscriptionId: "sub_synthetic_paid",
          })
        );

        // The database missed the answer; Stripe's event came meanwhile,
        // and the subscription now reads as set to end.
        yield* holding(paid({ cancelAtPeriodEnd: true }));

        const again = yield* cancellations.received({
          ...request,
          intent: yield* Ref.get(decided),
        });

        assert.deepStrictEqual(again, first);

        // Asked of Stripe again under the same key, which changes nothing.
        const keys = yield* BillingLog.use((log) => Ref.get(log.keys));

        assert.deepStrictEqual(keys, [
          asRequest.requestId,
          asRequest.requestId,
        ]);
      })
  );

  it.effect(
    "applies a request that came in time to a contract that ended while it waited",
    () =>
      Effect.gen(function* endedSince() {
        // A withdrawal statement of 10 November, ten days into the
        // contract, applied on the 25th, after the plan was ended.
        yield* setNow("2026-11-25T00:00:00Z");
        yield* holding(paid({ status: "canceled" }));
        yield* paying({
          invoiceId: "in_synthetic",
          lines: [],
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        });

        const withdrawn = yield* (yield* Withdraw).received({
          ...statement,
          receivedAt: at("2026-11-10T00:00:00Z"),
          stripeSubscriptionId: Option.none(),
          userId: Option.none(),
          workspaceId,
        });

        // 21 of 30 days left on the 10th: 900 × 21 / 30.
        assert.deepStrictEqual(withdrawn.refunded, {
          amount: 630,
          currency: "eur",
        });

        // A cancellation of 30 November, applied after the plan renewed
        // and was then ended: the renewal goes back all the same.
        yield* setNow("2026-12-05T00:00:00Z");
        yield* holding(
          paid({
            currentPeriodEnd: Option.some(at("2027-01-01T00:00:00Z")),
            currentPeriodStart: Option.some(at("2026-12-01T00:00:00Z")),
            status: "canceled",
          })
        );
        yield* paying({
          invoiceId: "in_december",
          lines: [{ amount: 750, start: at("2026-12-01T00:00:00Z") }],
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.some(at("2027-01-01T00:00:00Z")),
          periodStart: Option.some(at("2026-12-01T00:00:00Z")),
        });

        const cancelled = yield* (yield* CancelSubscription).received({
          ...asRequest,
          desiredAt: Option.none(),
          receivedAt: at("2026-11-30T22:00:00Z"),
          stripeSubscriptionId: Option.none(),
          workspaceId,
        });

        assert.deepStrictEqual(
          cancelled.refunded,
          Option.some({ amount: 900, currency: "eur" })
        );

        // One that ended before the request came had nothing to cancel.
        yield* holding(
          paid({
            currentPeriodEnd: Option.some(at("2026-11-15T00:00:00Z")),
            status: "canceled",
          })
        );

        const over = yield* (yield* CancelSubscription)
          .received({
            ...asRequest,
            desiredAt: Option.none(),
            receivedAt: at("2026-11-30T22:00:00Z"),
            stripeSubscriptionId: Option.none(),
            workspaceId,
          })
          .pipe(Effect.flip);

        assert.strictEqual(over._tag, "NothingToCancel");
      })
  );

  it.effect(
    "brings forward an end set on a later day, as after a date mistyped",
    () =>
      Effect.gen(function* corrected() {
        yield* setNow("2026-11-20T10:00:00Z");
        // Set to end in 2062, by a cancellation whose date was mistyped.
        yield* holding(
          paid({
            cancelAt: Option.some(at("2062-03-01T00:00:00Z")),
            cancelAtPeriodEnd: true,
          })
        );

        const cancellations = yield* CancelSubscription;
        const sooner = yield* cancellations.cancel(actorAs());

        assert.deepStrictEqual(sooner.endsAt, at("2026-12-01T00:00:00Z"));
        assert.deepStrictEqual(yield* askedOfStripe, [
          "cancelAtPeriodEnd sub_synthetic_paid",
        ]);

        // Once it ends with its period, there is nothing more to cancel.
        yield* holding(paid({ cancelAtPeriodEnd: true }));

        const nothing = yield* cancellations
          .cancel(actorAs())
          .pipe(Effect.flip);

        assert.strictEqual(nothing._tag, "NothingToCancel");
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
          lines: [],
          paid: { amount: 900, currency: "eur" },
          periodEnd: Option.none(),
          periodStart: Option.none(),
        });

        const withdrawals = yield* Withdraw;

        const late = yield* withdrawals
          .received({
            ...statement,
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
          ...statement,
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
