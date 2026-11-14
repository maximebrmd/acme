import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { TestClock } from "effect/testing";
import { Api, Forbidden, Unauthenticated } from "peal-contract";
import type { Member } from "peal-contract";
import { rateCard } from "peal-contract/rate-card";

import { AccountDays } from "#billing/application/account-days.ts";
import { AccountViews } from "#billing/application/account-views.ts";
import { BillingOverview } from "#billing/application/billing-overview.ts";
import { AccountChannels } from "#billing/application/ports/account-channels.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { WorkspaceStanding } from "#billing/application/workspace-standing.ts";
import { BillingApiLive } from "#billing/container.ts";
import type { Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import {
  aloneAccountId,
  AloneAccountViewsTest,
  AloneInAccountsTest,
  NoAddressesTest,
  NoTrialsTest,
  PlainPseudonymsTest,
  subscriptionOf,
  subscriptionsHolding,
  NoMetersTest,
} from "#test/billing/support.ts";
import {
  anonymousSecurityTest,
  securityTest,
} from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The billing endpoint on its use case, with the workspace's subscription
// and usage in memory. Each request acts as a member, as the
// WorkspaceAccess middleware would.

const workspaceId = WorkspaceIdSchema.make(
  "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f70"
);

const midnight = DateTime.makeUnsafe("2026-11-10T00:00:00Z");

const periodEnd = DateTime.makeUnsafe("2026-12-09T10:00:00Z");

const startedAt = DateTime.makeUnsafe("2026-11-09T10:00:00Z");

// A Pro subscription, paid for, with synthetic Stripe ids.
const SubscriptionsTest = subscriptionsHolding([
  subscriptionOf({
    currentPeriodEnd: Option.some(periodEnd),
    currentPeriodStart: Option.some(startedAt),
    plan: "pro",
    startedAt: Option.some(startedAt),
    status: "active",
    workspaceId,
  }),
]);

const UsageTest = Layer.succeed(
  WorkspaceUsage,
  WorkspaceUsage.of({
    heldIn: () => Effect.die("not read here"),
    of: () =>
      Effect.succeed({
        assistantRequests: { resetsAt: midnight, used: 4 },
        channels: 2,
        mediaStorage: 1_250_000,
        members: 1,
        scheduledPosts: { resetsAt: midnight, used: 12 },
      }),
  })
);

// The workspace connected one account itself, its billing account two.
const OwnChannelsTest = Layer.mock(AccountChannels, {
  ownIn: (workspaceIds) =>
    Effect.succeed(new Map(workspaceIds.map((id) => [id, 1]))),
});

// What Stripe's next invoice takes, tax included.
const UpcomingTest = Layer.mock(StripeContracts, {
  upcomingTotal: () =>
    Effect.succeed(Option.some({ amount: 4800, currency: "usd" })),
});

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

// Ten accounts on ten days of November: 100 account-days, of which the
// ladder's first 60 are free.
const novemberDays = Array.from({ length: 10 }, (_, index) => ({
  day: day(`2026-11-${String(index + 1).padStart(2, "0")}`),
  holder: workspaceId,
  peak: 10,
  reported: 10,
}));

const DaysTest = Layer.mock(AccountDays, {
  ofMonth: (holders, now) =>
    Effect.succeed(
      novemberDays.filter(
        ({ day: on, holder }) =>
          holders.includes(holder) &&
          DateTime.getPartUtc(on, "month") === DateTime.getPartUtc(now, "month")
      )
    ),
});

const overviewWith = (
  enabled: boolean,
  subscriptions: Layer.Layer<Subscriptions> = SubscriptionsTest,
  billed: Layer.Layer<AccountDays | StripeContracts> = Layer.merge(
    DaysTest,
    UpcomingTest
  ),
  holders: Layer.Layer<PlanHolders> = PlanHolders.layerOwn
) =>
  Layer.mergeAll(BillingOverview.layer, WorkspaceStanding.layer).pipe(
    Layer.provide(UsageTest),
    Layer.provide(NoMetersTest),
    Layer.provide(WorkspaceEntitlements.layerShared),
    Layer.provide(Layer.mergeAll(holders, OwnChannelsTest, billed)),
    Layer.provide(subscriptions),
    Layer.provide(NoTrialsTest),
    Layer.provide(Layer.mergeAll(NoAddressesTest, PlainPseudonymsTest)),
    Layer.provide(
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    ),
    Layer.provide(AloneInAccountsTest)
  );

const overviewOn = (enabled: boolean) => overviewWith(enabled);

const clientWith = <E, R>(
  security: Layer.Layer<Layer.Success<typeof anonymousSecurityTest>, E, R>,
  views: Layer.Layer<AccountViews> = AloneAccountViewsTest
) =>
  HttpApiTest.groups(Api, ["billing"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        BillingApiLive.pipe(Layer.provideMerge(security), Layer.provide(views)),
        HttpServer.layerServices
      )
    )
  );

const memberWith = (permissions: readonly Permission[]): Member => ({
  permissions,
  principal: {
    _tag: "user",
    impersonatedBy: null,
    userId: "6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c",
  },
  workspaceId,
});

const as = (permissions: readonly Permission[]) =>
  clientWith(securityTest(memberWith(permissions)));

const params = { workspaceId };

layer(overviewOn(true))("the billing endpoint on a server that bills", (it) => {
  it.effect(
    "show a member with billing:read the plan, its limits, the usage and every plan",
    () =>
      Effect.gen(function* shows() {
        // The day the subscription started.
        yield* TestClock.setTime(startedAt.epochMilliseconds);

        const client = yield* as(permissionsFor("admin"));
        const billing = yield* client.billing.get({ params });

        assert.isTrue(billing.enabled);
        assert.strictEqual(billing.plan, "pro");
        assert.deepStrictEqual(billing.subscription, {
          cancelAtPeriodEnd: false,
          currentPeriodEnd: periodEnd,
          endsAt: null,
          interval: "month",
          plan: "pro",
          startedAt,
          status: "active",
          trialEnd: null,
        });
        assert.deepStrictEqual(billing.allowances, {
          assistantRequests: 20,
          channels: 10,
          mediaStorage: 20_000_000_000,
          members: null,
          scheduledPosts: null,
        });
        assert.deepStrictEqual(
          billing.plans.map(({ plan, price }) => [plan, price]),
          // The plans a workspace can be on, which the rate card prices.
          [
            ["free", null],
            ["payAsYouGo", null],
          ]
        );
        assert.strictEqual(billing.currency, "eur");
        assert.strictEqual(billing.vatRate, 20);
        assert.strictEqual(billing.usage.mediaStorage, 1_250_000);
        // A workspace that had a subscription has no trial left.
        assert.deepStrictEqual(billing.trial, {
          available: false,
          days: 14,
          plan: "pro",
        });
        // Started today: a consumer may withdraw for 14 days.
        assert.deepStrictEqual(
          billing.withdrawableUntil,
          DateTime.makeUnsafe("2026-11-23T10:00:00Z")
        );
        assert.deepStrictEqual(billing.usage.scheduledPosts, {
          resetsAt: midnight,
          used: 12,
        });

        // The month's accounts, priced by the rate card, and Stripe's
        // next invoice, tax included.
        assert.deepStrictEqual(billing.rateCard, rateCard);
        assert.deepStrictEqual(billing.accounts, {
          accountDays: 100,
          connected: 1,
          estimate: { amount: 667, currency: "usd" },
          nextAccount: { amount: 500, currency: "usd" },
          pooled: 2,
        });
        assert.deepStrictEqual(billing.estimate, {
          amount: 667,
          currency: "usd",
        });
        assert.deepStrictEqual(billing.upcomingInvoice, {
          amount: 4800,
          currency: "usd",
        });
        assert.isTrue(billing.paymentMethod);

        // Stripe's ids stay on the server.
        assert.notInclude(JSON.stringify(billing), "cus_synthetic");
        assert.notInclude(JSON.stringify(billing), "sub_synthetic");
      })
  );

  it.effect("tell every member where the workspace stands", () =>
    Effect.gen(function* stands() {
      const client = yield* as(permissionsFor("viewer"));

      assert.deepStrictEqual(yield* client.billing.standing({ params }), {
        account: {
          billingWorkspaceId: workspaceId,
          billingWorkspaceName: null,
          id: aloneAccountId,
          otherWorkspaces: [],
          partner: false,
          payer: false,
          transfer: null,
          workspaces: 1,
        },
        graceUntil: null,
        mustReduce: false,
        over: [],
        plan: "pro",
        planWithRoom: null,
        scheduledPosts: 12,
      });
    })
  );

  it.effect("answer 403 to a member without billing:read", () =>
    Effect.gen(function* forbidden() {
      for (const role of ["editor", "contributor", "viewer"]) {
        const client = yield* as(permissionsFor(role));
        const refused = yield* Effect.flip(client.billing.get({ params }));

        assert.instanceOf(refused, Forbidden, role);
      }
    })
  );

  it.effect("answer 401 without credentials", () =>
    Effect.gen(function* anonymous() {
      const client = yield* clientWith(anonymousSecurityTest);
      const refused = yield* Effect.flip(client.billing.get({ params }));

      assert.instanceOf(refused, Unauthenticated);
    })
  );
});

// A billing account on the free tier, the workspace billing it: no
// subscription, nothing asked of Stripe, what its days would cost with a
// payment method.
layer(
  overviewWith(
    true,
    subscriptionsHolding([]),
    Layer.merge(DaysTest, Layer.mock(StripeContracts, {}))
  )
)("the billing endpoint for a billing account on the free tier", (it) => {
  it.effect(
    "show the month's accounts and what they would cost, and no invoice",
    () =>
      Effect.gen(function* free() {
        yield* TestClock.setTime(startedAt.epochMilliseconds);

        const client = yield* as(permissionsFor("owner"));
        const billing = yield* client.billing.get({ params });

        assert.strictEqual(billing.plan, "free");
        assert.isFalse(billing.paymentMethod);
        assert.isNull(billing.upcomingInvoice);
        assert.deepStrictEqual(billing.accounts.estimate, {
          amount: 667,
          currency: "usd",
        });
        assert.deepStrictEqual(billing.estimate, billing.accounts.estimate);
      })
  );
});

// Per-account pricing ordered on the 6th: twenty accounts each day since
// the 1st, reported from the 6th only.
const orderedDays = Array.from({ length: 10 }, (_, index) => ({
  day: day(`2026-11-${String(index + 1).padStart(2, "0")}`),
  holder: workspaceId,
  peak: 20,
  reported: index < 5 ? 0 : 20,
}));

layer(
  overviewWith(
    true,
    subscriptionsHolding([
      subscriptionOf({
        plan: "payAsYouGo",
        startedAt: Option.some(DateTime.makeUnsafe("2026-11-06T09:00:00Z")),
        status: "active",
        workspaceId,
      }),
    ]),
    Layer.merge(
      Layer.mock(AccountDays, {
        ofMonth: () => Effect.succeed(orderedDays),
      }),
      UpcomingTest
    )
  )
)("the billing endpoint for per-account pricing ordered this month", (it) => {
  it.effect(
    "price only the account-days reported since it was ordered, as the invoice will",
    () =>
      Effect.gen(function* ordered() {
        yield* TestClock.setTime(
          DateTime.makeUnsafe("2026-11-10T12:00:00Z").epochMilliseconds
        );

        const client = yield* as(permissionsFor("owner"));
        const billing = yield* client.billing.get({ params });

        assert.strictEqual(billing.accounts.accountDays, 100);
        assert.deepStrictEqual(billing.accounts.estimate, {
          amount: 667,
          currency: "usd",
        });
        assert.isTrue(billing.paymentMethod);
      })
  );
});

// A partner's customer, or any workspace of an account that another
// workspace bills: the account's days are on that billing workspace.
const home = WorkspaceIdSchema.make("5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a81");

layer(
  overviewWith(
    true,
    // The partner's own contract, its card failing.
    subscriptionsHolding([
      subscriptionOf({
        currentPeriodEnd: Option.some(
          DateTime.makeUnsafe("2026-12-01T00:00:00Z")
        ),
        plan: "payAsYouGo",
        startedAt: Option.some(startedAt),
        status: "past_due",
        workspaceId: home,
      }),
    ]),
    Layer.merge(DaysTest, Layer.mock(StripeContracts, {})),
    Layer.succeed(
      PlanHolders,
      PlanHolders.ofHolders({
        holderOf: () => Effect.succeed(home),
        holdersOf: (workspaceIds) =>
          Effect.succeed(new Map(workspaceIds.map((id) => [id, home]))),
      })
    )
  )
)("the billing endpoint for a partner's customer", (it) => {
  it.effect(
    "tell a workspace that does not bill its account nothing of the account's month, its money or its invoice",
    () =>
      Effect.gen(function* customer() {
        yield* TestClock.setTime(startedAt.epochMilliseconds);

        const client = yield* as(permissionsFor("owner"));
        const billing = yield* client.billing.get({ params });

        // The partner's figures are its home workspace's members' only.
        assert.deepStrictEqual(billing.accounts, {
          accountDays: null,
          connected: 1,
          estimate: null,
          nextAccount: null,
          pooled: 2,
        });
        assert.isNull(billing.estimate);
        assert.isNull(billing.upcomingInvoice);
        // Its meters' counts and allowances, never what they bill.
        assert.isAbove(billing.meters?.length ?? 0, 0);
        assert.deepStrictEqual(
          billing.meters?.map(({ billable, ceiling, estimate }) => ({
            billable,
            ceiling,
            estimate,
          })),
          billing.meters?.map(() => ({
            billable: null,
            ceiling: null,
            estimate: null,
          }))
        );
      })
  );

  it.effect(
    "tell it the account's pool and limits, as its usage does, but none of its contract or its payment failing",
    () =>
      Effect.gen(function* contract() {
        yield* TestClock.setTime(startedAt.epochMilliseconds);

        const client = yield* as(permissionsFor("owner"));
        const billing = yield* client.billing.get({ params });

        // The plan it shares, and nothing of whose contract gives it.
        assert.strictEqual(billing.plan, "payAsYouGo");
        assert.isNull(billing.subscription);
        assert.isNull(billing.withdrawableUntil);
        assert.isFalse(billing.paymentFailed ?? false);
        // The pool's counts and limits, which its uploads and connections
        // are held to: never "no limit".
        assert.strictEqual(billing.usage.channels, 2);
        assert.strictEqual(billing.usage.mediaStorage, 1_250_000);
        assert.isNotNull(billing.allowances.mediaStorage);
      })
  );
});

// A billing account whose per-account contract is past due: it still
// entitles while Stripe retries, and its payment method needs updating.
layer(
  overviewWith(
    true,
    subscriptionsHolding([
      subscriptionOf({
        plan: "payAsYouGo",
        startedAt: Option.some(startedAt),
        status: "past_due",
        workspaceId,
      }),
    ]),
    Layer.merge(DaysTest, UpcomingTest)
  )
)("the billing endpoint for a past due per-account contract", (it) => {
  it.effect("say its payment failed to the workspace that bills it", () =>
    Effect.gen(function* pastDue() {
      yield* TestClock.setTime(startedAt.epochMilliseconds);

      const client = yield* as(permissionsFor("owner"));
      const billing = yield* client.billing.get({ params });

      assert.strictEqual(billing.plan, "payAsYouGo");
      assert.strictEqual(billing.subscription?.status, "past_due");
      assert.isTrue(billing.paymentFailed);
    })
  );
});

// A billing account whose per-account contract went unpaid: back on the
// free tier, yet Stripe may still bill it, so nothing is ordered.
layer(
  overviewWith(
    true,
    subscriptionsHolding([
      subscriptionOf({
        plan: "payAsYouGo",
        startedAt: Option.some(startedAt),
        status: "unpaid",
        workspaceId,
      }),
    ]),
    Layer.merge(DaysTest, Layer.mock(StripeContracts, {}))
  )
)("the billing endpoint for an unpaid per-account contract", (it) => {
  it.effect("say its payment failed to the workspace that bills it", () =>
    Effect.gen(function* unpaid() {
      yield* TestClock.setTime(startedAt.epochMilliseconds);

      const client = yield* as(permissionsFor("owner"));
      const billing = yield* client.billing.get({ params });

      assert.strictEqual(billing.plan, "free");
      assert.isNull(billing.subscription);
      assert.isTrue(billing.paymentFailed);
    })
  );
});

layer(overviewOn(false))(
  "the billing endpoint on a server that does not bill",
  (it) => {
    it.effect("show no plan, limit nothing, and read no billing account", () =>
      Effect.gen(function* unmetered() {
        // Any read of the account dies.
        const client = yield* clientWith(
          securityTest(memberWith(permissionsFor("owner"))),
          Layer.mock(AccountViews, {})
        );

        const billing = yield* client.billing.get({ params });

        assert.isUndefined(billing.account);

        assert.isFalse(billing.enabled);
        assert.isNull(billing.plan);
        assert.isNull(billing.subscription);
        assert.deepStrictEqual(billing.plans, []);
        assert.isNull(billing.trial);
        assert.isNull(billing.withdrawableUntil);
        assert.deepStrictEqual(billing.allowances, {
          assistantRequests: null,
          channels: null,
          mediaStorage: null,
          members: null,
          scheduledPosts: null,
        });
        // Nothing priced, counted by day or asked of Stripe.
        assert.isNull(billing.rateCard);
        assert.deepStrictEqual(billing.accounts, {
          accountDays: null,
          connected: 1,
          estimate: null,
          nextAccount: null,
          pooled: 2,
        });
        assert.isNull(billing.estimate);
        assert.isNull(billing.upcomingInvoice);
        assert.isFalse(billing.paymentMethod);
      })
    );

    it.effect(
      "tell where the workspace stands without reading its billing account",
      () =>
        Effect.gen(function* standsUnbilled() {
          // Any read of the account dies.
          const client = yield* clientWith(
            securityTest(memberWith(permissionsFor("viewer"))),
            Layer.mock(AccountViews, {})
          );

          const standing = yield* client.billing.standing({ params });

          assert.isUndefined(standing.account);
          assert.isFalse(standing.mustReduce);
        })
    );
  }
);
