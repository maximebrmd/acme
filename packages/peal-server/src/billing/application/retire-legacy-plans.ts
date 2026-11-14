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
  // Set by a cancellation to end on or before the day it would retire on:
  // nothing to change, nobody told.
  | {
      readonly _tag: "ending";
      readonly endsAt: DateTime.Utc;
      readonly subscription: Subscription;
    }
  // A trial, which runs to its end, already set to cancel then.
  | { readonly _tag: "trial"; readonly subscription: Subscription }
  // Stripe did not take the change: nothing kept, a run again tries again.
  | {
      readonly _tag: "failed";
      readonly endsAt: DateTime.Utc;
      readonly permanent: boolean;
      readonly subscription: Subscription;
    };

/** What the command found, and whether it changed anything. */
export interface RetirementReport {
  readonly applied: boolean;
  readonly retirements: readonly Retirement[];
}

// When it ends on its own already, as the events recorded say.
const ownEndOf = ({
  cancelAt,
  cancelAtPeriodEnd,
  currentPeriodEnd,
}: Subscription): Option.Option<DateTime.Utc> =>
  Option.orElse(cancelAt, () =>
    cancelAtPeriodEnd ? currentPeriodEnd : Option.none()
  );

const planned = (
  { retiresAt, subscription, toldAt }: RetiringSubscription,
  endsAt: DateTime.Utc
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

  // A cancellation that ends it by the day stands; one for a later day is
  // brought forward to it.
  const ownEnd = ownEndOf(subscription).pipe(
    Option.filter((end) => DateTime.isLessThanOrEqualTo(end, endsAt))
  );

  return Option.match(ownEnd, {
    onNone: (): Retirement => ({ _tag: "retire", endsAt, subscription }),
    onSome: (end): Retirement => ({
      _tag: "ending",
      endsAt: end,
      subscription,
    }),
  });
};

/**
 * Retiring the legacy plans (`nx run peal-server:billing:retire-plans`):
 * lists every legacy subscription that may still give its plan with what
 * retiring does to it, and changes nothing. With `apply`, each one on its
 * own: Stripe is set first to end it on the day (`retirementDay`: 30 days
 * after the latest its notice may go out, `retirementTelling`), within the
 * period paid for without proration, in a later one charging that period
 * only up to the day; only once Stripe took it is the day kept, so the
 * hourly reminders tell its billing managers of an end Stripe will make
 * (`PlansRetiring`, always emailed). One Stripe refuses or does not answer
 * is reported (`failed`) and the others go on; a run again retries it. A
 * trial runs to its end; a cancellation that ends it by the day stands.
 * A server that does not bill lists them, and applies nothing
 * (`BillingOff`).
 */
export class RetireLegacyPlans extends Context.Service<
  RetireLegacyPlans,
  {
    readonly run: (options: {
      readonly apply: boolean;
    }) => Effect.Effect<RetirementReport, BillingOff | DatabaseError>;
  }
>()("peal-server/billing/application/RetireLegacyPlans") {
  static readonly layer = Layer.effect(
    RetireLegacyPlans,
    Effect.gen(function* RetireLegacyPlansLive() {
      const { enabled } = yield* BillingMode;
      const retirements = yield* PlanRetirements;
      const stripe = yield* StripeContracts;

      // Stripe first, then the day kept; a refusal or no answer is
      // reported, and nothing is kept.
      const apply = (
        subscription: Subscription,
        endsAt: DateTime.Utc,
        now: DateTime.Utc
      ): Effect.Effect<Retirement, DatabaseError> =>
        stripe
          .retireAt(
            subscription.workspaceId,
            subscription.stripeSubscriptionId,
            endsAt,
            Option.exists(subscription.currentPeriodEnd, (end) =>
              DateTime.isLessThan(end, endsAt)
            )
          )
          .pipe(
            Effect.andThen(
              retirements.retire(subscription.stripeSubscriptionId, endsAt, now)
            ),
            Effect.as<Retirement>({ _tag: "retire", endsAt, subscription }),
            Effect.catchTag("StripeUnreachable", ({ permanent }) =>
              Effect.logWarning(
                "Stripe did not take a legacy plan's retirement: a run again tries again"
              ).pipe(
                Effect.annotateLogs({
                  permanent,
                  stripeSubscriptionId: subscription.stripeSubscriptionId,
                }),
                Effect.as<Retirement>({
                  _tag: "failed",
                  endsAt,
                  permanent,
                  subscription,
                })
              )
            )
          );

      const run = Effect.fn("RetireLegacyPlans.run")(function* run(options: {
        readonly apply: boolean;
      }) {
        if (options.apply && !enabled) {
          return yield* new BillingOff();
        }

        const now = yield* DateTime.now;

        const endsAt = retirementDay(
          DateTime.addDuration(now, retirementTelling)
        );

        const found = (yield* retirements.legacy).map((held) =>
          planned(held, endsAt)
        );

        const retired = options.apply
          ? yield* Effect.forEach(
              found,
              (retirement) =>
                retirement._tag === "retire"
                  ? apply(retirement.subscription, retirement.endsAt, now)
                  : Effect.succeed(retirement),
              { concurrency: 1 }
            )
          : found;

        const report: RetirementReport = {
          applied: options.apply,
          retirements: retired,
        };

        return report;
      });

      return RetireLegacyPlans.of({ run });
    })
  );
}
