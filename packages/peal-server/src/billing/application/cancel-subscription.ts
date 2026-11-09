import { Context, DateTime, Effect, Layer, Option } from "effect";

import { BillingOff } from "#billing/domain/billing-off.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import { NothingToCancel } from "#billing/domain/nothing-to-cancel.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { currentSubscription } from "./current-subscription.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { BillingNotices } from "./ports/billing-notices.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import type { Subscriptions } from "./ports/subscriptions.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** What cancelling did: the plan, and when it ends. */
export interface Cancellation {
  readonly endsAt: DateTime.Utc;
  readonly plan: PaidPlan;
}

/**
 * Cancels the workspace's subscription online, as French law asks it be
 * possible in a few clicks (Code de la consommation L215-1-1): a paid one
 * ends when its period does, and nothing more is charged; a trial ends at
 * once. The members who manage billing are told, by email too, which
 * confirms the cancellation and its date on a durable medium. Needs
 * billing:manage and the member in person.
 */
export class CancelSubscription extends Context.Service<
  CancelSubscription,
  {
    readonly cancel: (
      actor: Actor
    ) => Effect.Effect<
      Cancellation,
      | BillingOff
      | DatabaseError
      | MissingPermission
      | NothingToCancel
      | PersonRequired
      | StripeUnreachable
    >;
  }
>()("peal-server/billing/application/CancelSubscription") {
  static readonly layer = Layer.effect(
    CancelSubscription,
    Effect.gen(function* CancelSubscriptionLive() {
      const { enabled } = yield* BillingMode;
      const stripe = yield* StripeContracts;
      const notices = yield* BillingNotices;
      const context = yield* Effect.context<Subscriptions>();

      const cancel = Effect.fn("CancelSubscription.cancel")(function* cancel(
        actor: Actor
      ) {
        yield* Effect.fromResult(authorize(actor, "billing:manage"));
        yield* Effect.fromResult(inPerson(actor));

        if (!enabled) {
          return yield* new BillingOff();
        }

        const { workspaceId } = actor;

        const current = (yield* currentSubscription(workspaceId)).pipe(
          Option.filter(({ cancelAtPeriodEnd }) => !cancelAtPeriodEnd)
        );

        if (Option.isNone(current)) {
          return yield* new NothingToCancel();
        }

        const subscription = current.value;
        const now = yield* DateTime.now;
        const id = subscription.stripeSubscriptionId;

        yield* subscription.status === "trialing"
          ? stripe.endNow(workspaceId, id, "trialCancelled")
          : stripe.cancelAtPeriodEnd(workspaceId, id);

        const cancellation: Cancellation = {
          endsAt:
            subscription.status === "trialing"
              ? now
              : Option.getOrElse(subscription.currentPeriodEnd, () => now),
          plan: subscription.plan,
        };

        yield* notices.tell({
          key: `subscription:${id}:cancelled`,
          notice: { _tag: "SubscriptionCancelled", ...cancellation },
          workspaceId,
        });

        yield* Effect.logInfo("Cancelled a subscription").pipe(
          Effect.annotateLogs({ plan: subscription.plan, workspaceId })
        );

        return cancellation;
      }, Effect.provide(context));

      return CancelSubscription.of({ cancel });
    })
  );
}
