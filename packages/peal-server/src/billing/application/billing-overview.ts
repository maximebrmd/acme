import { Context, DateTime, Effect, Layer, Option, Result } from "effect";

import {
  accountDaysOf,
  nextAccountMonthly,
} from "#billing/domain/account-days.ts";
import type { Money } from "#billing/domain/billing-notice.ts";
import type { Entitlements } from "#billing/domain/entitlements.ts";
import { planAllowances, planPrices } from "#billing/domain/legacy-plans.ts";
import type { PlanPrice } from "#billing/domain/legacy-plans.ts";
import { livePerAccount } from "#billing/domain/live-per-account.ts";
import {
  meterMonthOf,
  meterMonthsOf,
  meterStandingOf,
} from "#billing/domain/meter-claims.ts";
import type { MeterMonth } from "#billing/domain/meter-claims.ts";
import {
  allowancesOf,
  legacyPlans,
  trialDays,
  trialPlan,
} from "#billing/domain/plans.ts";
import type { Allowances } from "#billing/domain/plans.ts";
import { accountsCharge, rateCard } from "#billing/domain/rate-card.ts";
import type { RateCard } from "#billing/domain/rate-card.ts";
import { billsAt } from "#billing/domain/subscription.ts";
import type {
  Subscription,
  SubscriptionStatus,
} from "#billing/domain/subscription.ts";
import { mayWithdraw } from "#billing/domain/withdrawal.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { LegacyPlan, PaidPlan, Plan } from "#shared/domain/plan.ts";

import { AccountDays } from "./account-days.ts";
import { AccountChannels } from "./ports/account-channels.ts";
import { MeterUsageStore } from "./ports/meter-usage-store.ts";
import { PlanHolders } from "./ports/plan-holders.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import type { Usage } from "./ports/workspace-usage.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

// The statuses of a contract whose last payment failed.
const failedPayment: ReadonlySet<SubscriptionStatus> = new Set([
  "past_due",
  "unpaid",
]);

/** A plan, what it allows, and its prices excluding VAT, if it is paid. */
export interface PlanOffer {
  readonly allowances: Allowances;
  readonly plan: Plan;
  readonly price: Option.Option<PlanPrice>;
}

/** The trial a workspace may start. */
export interface TrialOffer {
  /** Whether this member may start it for this workspace now. */
  readonly available: boolean;
  readonly days: number;
  readonly plan: PaidPlan;
}

/**
 * The billing account's connected accounts this month (UTC), and what they
 * cost by the rate card, in US dollar cents excluding tax; none on a
 * server that does not bill.
 */
export interface AccountsThisMonth {
  readonly accountDays: Option.Option<number>;
  /** The accounts the workspace connected itself. */
  readonly connected: number;
  readonly estimate: Option.Option<Money>;
  /** What one more account costs a month. */
  readonly nextAccount: Option.Option<Money>;
  /** The accounts connected across the billing account. */
  readonly pooled: number;
}

/** A workspace's plan, what it uses of it, and the plans it can move to. */
export interface Overview {
  readonly accounts: AccountsThisMonth;
  /** What the plan allows the billing account, across its workspaces. */
  readonly allowances: Allowances;
  /**
   * Whether the workspace bills its billing account: only then is it told
   * the account's contract and money.
   */
  readonly billsHere: boolean;
  readonly entitlements: Entitlements;
  /** The month so far, excluding tax; none on a server that does not bill. */
  readonly estimate: Option.Option<Money>;
  /**
   * The billing account's meters this month, and whether the reader's
   * workspace bills it (it alone reads their money); none on a server
   * that does not bill.
   */
  readonly meters: Option.Option<{
    readonly billing: boolean;
    readonly months: readonly MeterMonth[];
  }>;
  /**
   * Whether the account's per-account subscription's last payment failed
   * (past due while Stripe retries, or unpaid once it gave up), told to the
   * workspace that bills the account only.
   */
  readonly paymentFailed: boolean;
  /** Whether a subscription paid for with a payment method entitles it. */
  readonly paymentMethod: boolean;
  /** Every plan, from the smallest; none on a server that does not bill. */
  readonly plans: readonly PlanOffer[];
  /** Per-account pricing's rates; none on a server that does not bill. */
  readonly rateCard: Option.Option<RateCard>;
  /** None on a server that does not bill. */
  readonly trial: Option.Option<TrialOffer>;
  /** What Stripe's next invoice takes, tax included, when it says. */
  readonly upcomingInvoice: Option.Option<Money>;
  readonly usage: Usage;
  /**
   * Until when the subscription can be withdrawn from, while a consumer
   * may (whether the customer is one is checked on withdrawing).
   */
  readonly withdrawableUntil: Option.Option<DateTime.Utc>;
}

/** The account's month, as its billing workspace's members read it. */
interface Month {
  readonly accountDays: Option.Option<number>;
  readonly estimate: Option.Option<Money>;
  readonly nextAccount: Option.Option<Money>;
  readonly upcomingInvoice: Option.Option<Money>;
}

// Nothing of the account's month: where nothing bills, or for a
// workspace that does not bill its account.
const noMonth: Month = {
  accountDays: Option.none(),
  estimate: Option.none(),
  nextAccount: Option.none(),
  upcomingInvoice: Option.none(),
};

// Cents of the rate card's currency.
const dollars = (amount: number): Money => ({ amount, currency: "usd" });

// A subscription paid with a payment method: a trial needs none.
const paidWith = (status: SubscriptionStatus): boolean =>
  status === "active" || status === "past_due";

const priceOfPlan = (plan: LegacyPlan): Option.Option<PlanPrice> =>
  plan === "free" ? Option.none() : Option.some(planPrices[plan]);

/**
 * Every legacy plan, with its allowances and prices, as the contract's
 * `planCatalogue` copies them. Legacy: none is sold.
 */
export const catalogue: readonly PlanOffer[] = legacyPlans.map((plan) => ({
  allowances: planAllowances[plan],
  plan,
  price: priceOfPlan(plan),
}));

/**
 * The plans a workspace can be on, from the smallest: the free tier and
 * per-account pricing, which the rate card prices (no listed price), with
 * their allowances for the account's `accounts` and free tier.
 */
const offersFor = (
  entitlements: Entitlements,
  accounts: number
): readonly PlanOffer[] =>
  (["free", "payAsYouGo"] as const).map((plan) => ({
    allowances: allowancesOf(plan, {
      accounts,
      freeTier: entitlements.freeTier,
    }),
    plan,
    price: Option.none(),
  }));

/** The actor's workspace's billing, for its billing page. Needs billing:read. */
export class BillingOverview extends Context.Service<
  BillingOverview,
  {
    readonly of: (
      actor: Actor
    ) => Effect.Effect<Overview, DatabaseError | MissingPermission>;
  }
>()("peal-server/billing/application/BillingOverview") {
  static readonly layer = Layer.effect(
    BillingOverview,
    Effect.gen(function* BillingOverviewLive() {
      const entitlements = yield* WorkspaceEntitlements;
      const usage = yield* WorkspaceUsage;
      const channels = yield* AccountChannels;
      const holders = yield* PlanHolders;
      const days = yield* AccountDays;
      const stripe = yield* StripeContracts;
      const meterStore = yield* MeterUsageStore;

      // The billing account's meters this month, on its holder.
      const metersOf = Effect.fn("BillingOverview.metersOf")(function* metersOf(
        workspaceId: Actor["workspaceId"],
        current: Entitlements,
        now: DateTime.Utc
      ) {
        const { freeTier, holder } = yield* holders.heldBy(workspaceId);
        const month = meterMonthOf(now);

        const [counts, ceilings] = yield* Effect.all(
          [meterStore.ofMonth(holder, month), meterStore.ceilings(holder)],
          { concurrency: "unbounded" }
        );

        return {
          billing: holder === workspaceId,
          months: meterMonthsOf({
            ceilings: new Map(
              ceilings.map(({ cents, group }) => [group, cents] as const)
            ),
            counts,
            freeTier,
            month,
            standing: meterStandingOf(current),
          }),
        };
      });

      const subscriptions = yield* Subscriptions;

      // What Stripe's next invoice of the subscription takes: none when it
      // cannot say, which the page tells as no figure.
      const upcomingOf = (
        workspaceId: Actor["workspaceId"],
        subscription: Option.Option<Subscription>
      ) =>
        Option.match(
          subscription.pipe(Option.filter(({ status }) => billsAt(status))),
          {
            onNone: () => Effect.succeedNone,
            onSome: ({ stripeSubscriptionId }) =>
              stripe
                .upcomingTotal(workspaceId, stripeSubscriptionId)
                .pipe(
                  Effect.catchTag("StripeUnreachable", () =>
                    Effect.logWarning(
                      "Stripe did not say what the next invoice takes"
                    ).pipe(
                      Effect.annotateLogs({ workspaceId }),
                      Effect.as(Option.none<Money>())
                    )
                  )
                ),
          }
        );

      // The billing account's month, on a server that bills, for the
      // members of the workspace that bills it only: its days, priced by
      // the ladder, what Stripe was told of them once it pays (reported
      // since it was ordered, as the invoice prices them), else what they
      // would cost; and what Stripe's next invoice takes. Any other of its
      // workspaces (a partner's customer, a person's other workspaces)
      // tells nothing of the account's money.
      const monthOf = Effect.fn("BillingOverview.monthOf")(function* monthOf(
        holder: Actor["workspaceId"],
        current: Entitlements,
        pooled: number,
        now: DateTime.Utc
      ) {
        const counted = yield* days.ofMonth([holder], now);

        const paying =
          Option.contains(current.plan, "payAsYouGo") &&
          Option.isSome(current.subscription);

        const accountDays = paying
          ? counted.reduce((sum, { reported }) => sum + reported, 0)
          : accountDaysOf(counted);

        const month: Month = {
          accountDays: Option.some(accountDays),
          estimate: Option.some(dollars(accountsCharge(accountDays))),
          nextAccount: Option.some(dollars(nextAccountMonthly(pooled))),
          upcomingInvoice: yield* upcomingOf(holder, current.subscription),
        };

        return month;
      });

      const of = Effect.fn("BillingOverview.of")(function* of(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "billing:read"));

        const [current, used, own] = yield* Effect.all(
          [
            entitlements.of(actor.workspaceId),
            usage.of(actor.workspaceId),
            channels.ownIn([actor.workspaceId]),
          ],
          { concurrency: "unbounded" }
        );

        const billing = Option.isSome(current.plan);
        const now = yield* DateTime.now;

        // The workspace that bills the account (on a server that bills):
        // only it is told the account's contract and money. Every workspace
        // of the account reads its pool and limits, as its usage does.
        const holder = billing
          ? yield* holders.holderOf(actor.workspaceId)
          : actor.workspaceId;

        const billsHere = holder === actor.workspaceId;

        const month =
          billing && billsHere
            ? yield* monthOf(holder, current, used.channels, now)
            : noMonth;

        // A contract whose last payment failed: past due while Stripe
        // retries, or unpaid once it gave up (Stripe may still bill it, so
        // nothing is ordered). Paused is left out: Stripe pauses only a
        // trial that ended without a payment method, which per-account
        // pricing never has, never for a failed payment.
        const paymentFailed =
          billing && billsHere
            ? livePerAccount(yield* subscriptions.ofWorkspace(holder)).pipe(
                Option.exists(({ status }) => failedPayment.has(status))
              )
            : false;

        const meters = billing
          ? Option.some(yield* metersOf(actor.workspaceId, current, now))
          : Option.none();

        // The meters' charges join the accounts' for the workspace that
        // bills the account.
        const estimate = month.estimate.pipe(
          Option.map((accounts) =>
            dollars(
              accounts.amount +
                Option.match(meters, {
                  onNone: () => 0,
                  onSome: ({ months }) =>
                    months.reduce((sum, { charge }) => sum + charge, 0),
                })
            )
          )
        );

        const overview: Overview = {
          accounts: {
            accountDays: month.accountDays,
            connected: own.get(actor.workspaceId) ?? 0,
            estimate: month.estimate,
            nextAccount: month.nextAccount,
            pooled: used.channels,
          },
          allowances: current.allowancesFor(used.channels),
          billsHere,
          entitlements: current,
          estimate,
          meters,
          paymentFailed,
          paymentMethod: Option.exists(current.subscription, ({ status }) =>
            paidWith(status)
          ),
          plans: billing ? offersFor(current, used.channels) : [],
          // No trial is offered: the rate card's free accounts replace it.
          trial: billing
            ? Option.some({
                available: false,
                days: trialDays,
                plan: trialPlan,
              })
            : Option.none(),
          rateCard: billing ? Option.some(rateCard) : Option.none(),
          upcomingInvoice: month.upcomingInvoice,
          usage: used,
          withdrawableUntil: current.subscription.pipe(
            Option.filter(() => billsHere),
            Option.flatMap((subscription) =>
              Result.getSuccess(mayWithdraw(subscription, now))
            )
          ),
        };

        return overview;
      });

      return BillingOverview.of({ of });
    })
  );
}
