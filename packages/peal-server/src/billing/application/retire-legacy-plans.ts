import { Context, DateTime, Effect, Layer, Option } from "effect";

import { BillingOff } from "#billing/domain/billing-off.ts";
import {
  chargesRenewal,
  endsOnDay,
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
  { requestedFor, retiresAt, subscription, toldAt }: RetiringSubscription,
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

  // Asked of Stripe before and never confirmed: the same day again, which
  // Stripe may hold already, never read as the subscriber's own end.
  if (Option.isSome(requestedFor)) {
    return { _tag: "retire", endsAt: requestedFor.value, subscription };
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
 * own: the day asked is kept first (`retirement_requested_for`, with the
 * period it had paid for), then Stripe is set to end it on the day
 * (`retirementDay`: 30 days after the latest its notice may go out,
 * `retirementTelling`), within the period paid for without proration,
 * past it charging the renewal only up to the day (`chargesRenewal`); only
 * once Stripe took it is the day confirmed (`retires_at`), so the hourly
 * reminders tell its billing managers of an end Stripe will make
 * (`PlansRetiring`, always emailed). One that fails is reported
 * (`failed`) and the others go on; a run again takes it up from the day
 * kept, and one Stripe holds already (its `cancel_at` the day asked) is
 * confirmed without asking again, never read as the subscriber's own
 * end. A
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

      // The day kept before Stripe is asked, Stripe asked (not when it
      // holds that day already: a call whose answer was lost), then the day
      // confirmed. Stripe refusing or not answering, or the database
      // failing, is reported, and a run again takes it up from what was
      // kept.
      const apply = (
        held: RetiringSubscription,
        endsAt: DateTime.Utc,
        now: DateTime.Utc
      ): Effect.Effect<Retirement> => {
        const { subscription } = held;
        const id = subscription.stripeSubscriptionId;

        const paidUntil = Option.orElse(
          held.paidUntil,
          () => subscription.currentPeriodEnd
        );

        const asked = Option.isSome(held.requestedFor)
          ? Effect.void
          : retirements.request(id, endsAt, paidUntil, now);

        const atStripe = endsOnDay(subscription.cancelAt, endsAt)
          ? Effect.void
          : stripe.retireAt(
              subscription.workspaceId,
              id,
              endsAt,
              chargesRenewal(endsAt, paidUntil)
            );

        const failedWith = (permanent: boolean) =>
          Effect.logWarning(
            "A legacy plan's retirement did not go through: a run again takes it up"
          ).pipe(
            Effect.annotateLogs({ permanent, stripeSubscriptionId: id }),
            Effect.as<Retirement>({
              _tag: "failed",
              endsAt,
              permanent,
              subscription,
            })
          );

        return asked.pipe(
          Effect.andThen(atStripe),
          Effect.andThen(retirements.retire(id, endsAt, now)),
          Effect.as<Retirement>({ _tag: "retire", endsAt, subscription }),
          Effect.catchTags({
            DatabaseError: () => failedWith(false),
            StripeUnreachable: ({ permanent }) => failedWith(permanent),
          })
        );
      };

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

        const legacy = yield* retirements.legacy;

        const found = legacy.map(
          (held) => [held, planned(held, endsAt)] as const
        );

        const retired = options.apply
          ? yield* Effect.forEach(
              found,
              ([held, retirement]) =>
                retirement._tag === "retire"
                  ? apply(held, retirement.endsAt, now)
                  : Effect.succeed(retirement),
              { concurrency: 1 }
            )
          : found.map(([, retirement]) => retirement);

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
