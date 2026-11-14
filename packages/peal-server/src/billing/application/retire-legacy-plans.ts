import { Context, DateTime, Effect, Layer, Option } from "effect";

import { BillingOff } from "#billing/domain/billing-off.ts";
import {
  retirementDay,
  retirementTelling,
} from "#billing/domain/plan-retirement.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { PlanRetirements } from "./ports/plan-retirements.ts";
import type { RetiringSubscription } from "./ports/plan-retirements.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** What retiring does, or did, to one legacy plan's subscription. */
export type Retirement =
  // Set to end on `endsAt`, or to be, on a dry run.
  | {
      readonly _tag: "retire";
      readonly endsAt: DateTime.Utc;
      readonly subscription: Subscription;
    }
  // Retired before, to `endsAt`; its billing managers told or not yet.
  | {
      readonly _tag: "retired";
      readonly endsAt: DateTime.Utc;
      readonly subscription: Subscription;
      readonly told: boolean;
    }
  // Set to end already, by a cancellation: nothing to change, nobody told.
  | {
      readonly _tag: "ending";
      readonly endsAt: Option.Option<DateTime.Utc>;
      readonly subscription: Subscription;
    }
  // A trial, which runs to its end, already set to cancel then.
  | { readonly _tag: "trial"; readonly subscription: Subscription }
  // No period end is known: left to staff.
  | { readonly _tag: "unknownPeriod"; readonly subscription: Subscription };

/** What the command found, and whether it changed anything. */
export interface RetirementReport {
  readonly applied: boolean;
  readonly retirements: readonly Retirement[];
}

// Why the retirement's call to Stripe names itself: asked again, the
// same request.
const requestKey = "retirement";

// Whether Stripe ends it already, as the events recorded say.
const endsAlready = ({ cancelAt, cancelAtPeriodEnd }: Subscription) =>
  cancelAtPeriodEnd || Option.isSome(cancelAt);

const planned = (
  { retiresAt, subscription, toldAt }: RetiringSubscription,
  noticeAt: DateTime.Utc
): Retirement => {
  if (Option.isSome(retiresAt)) {
    return {
      _tag: "retired",
      endsAt: retiresAt.value,
      subscription,
      told: Option.isSome(toldAt),
    };
  }

  if (subscription.status === "trialing") {
    return { _tag: "trial", subscription };
  }

  if (endsAlready(subscription)) {
    return {
      _tag: "ending",
      endsAt: Option.orElse(
        subscription.cancelAt,
        () => subscription.currentPeriodEnd
      ),
      subscription,
    };
  }

  return Option.match(subscription.currentPeriodEnd, {
    onNone: (): Retirement => ({ _tag: "unknownPeriod", subscription }),
    onSome: (periodEnd): Retirement => ({
      _tag: "retire",
      endsAt: retirementDay(noticeAt, periodEnd, subscription.interval),
      subscription,
    }),
  });
};

/**
 * Retiring the legacy plans (`nx run peal-server:billing:retire-plans`):
 * lists every legacy subscription that may still give its plan with what
 * retiring does to it, and changes nothing; with `apply`, keeps each one's
 * day first, then sets it to end then at Stripe (at its period's end, or
 * on the day, which a later period ends on, or, for a yearly plan
 * renewing within the notice, the 30th day), under the same request key
 * when asked again: the hourly reminders then tell its billing managers,
 * once (`PlansRetiring`, always emailed), and the day was counted from
 * when they may be told at the latest (`retirementTelling`), 30 days
 * before (`retirementNotice`). A trial runs to its end; one a
 * cancellation ends already is left as it is. A server that does not bill
 * lists them, and applies nothing (`BillingOff`).
 */
export class RetireLegacyPlans extends Context.Service<
  RetireLegacyPlans,
  {
    readonly run: (options: {
      readonly apply: boolean;
    }) => Effect.Effect<
      RetirementReport,
      BillingOff | DatabaseError | StripeUnreachable
    >;
  }
>()("peal-server/billing/application/RetireLegacyPlans") {
  static readonly layer = Layer.effect(
    RetireLegacyPlans,
    Effect.gen(function* RetireLegacyPlansLive() {
      const { enabled } = yield* BillingMode;
      const retirements = yield* PlanRetirements;
      const stripe = yield* StripeContracts;

      // Sets it to end on `endsAt` at Stripe: with its period, or on the
      // day.
      const endAt = (subscription: Subscription, endsAt: DateTime.Utc) => {
        const { stripeSubscriptionId: id, workspaceId } = subscription;

        return Option.exists(subscription.currentPeriodEnd, (end) =>
          DateTime.Equivalence(end, endsAt)
        )
          ? stripe.cancelAtPeriodEnd(workspaceId, id, requestKey)
          : stripe.cancelAt(workspaceId, id, endsAt, requestKey);
      };

      const run = Effect.fn("RetireLegacyPlans.run")(function* run({
        apply,
      }: {
        readonly apply: boolean;
      }) {
        if (apply && !enabled) {
          return yield* new BillingOff();
        }

        const now = yield* DateTime.now;
        const noticeAt = DateTime.addDuration(now, retirementTelling);

        const found = (yield* retirements.legacy).map((held) =>
          planned(held, noticeAt)
        );

        if (!apply) {
          const report: RetirementReport = {
            applied: false,
            retirements: found,
          };

          return report;
        }

        const done = yield* Effect.forEach(
          found,
          (retirement) =>
            Effect.gen(function* applied() {
              if (retirement._tag === "retire") {
                // Kept first: asked again, the same day.
                const endsAt = yield* retirements.retire(
                  retirement.subscription.stripeSubscriptionId,
                  retirement.endsAt
                );

                yield* endAt(retirement.subscription, endsAt);

                const set: Retirement = { ...retirement, endsAt };

                return set;
              }

              // Kept before, and not yet ended at Stripe as its events
              // tell: the call that did not go through is made again.
              if (
                retirement._tag === "retired" &&
                !endsAlready(retirement.subscription)
              ) {
                yield* endAt(retirement.subscription, retirement.endsAt);
              }

              return retirement;
            }),
          { concurrency: 1 }
        );

        const report: RetirementReport = { applied: true, retirements: done };

        return report;
      });

      return RetireLegacyPlans.of({ run });
    })
  );
}
