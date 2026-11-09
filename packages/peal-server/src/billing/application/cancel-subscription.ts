import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { Money } from "#billing/domain/billing-notice.ts";
import { BillingOff } from "#billing/domain/billing-off.ts";
import { cancellationEffect } from "#billing/domain/cancellation-effect.ts";
import type { CancellationEffect } from "#billing/domain/cancellation-effect.ts";
import {
  ContractRequest,
  ContractRequestIdSchema,
} from "#billing/domain/contract-request.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import { NothingToCancel } from "#billing/domain/nothing-to-cancel.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { currency } from "#billing/domain/prices.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { currentSubscription } from "./current-subscription.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { BillingNotices } from "./ports/billing-notices.ts";
import { ContractRequests } from "./ports/contract-requests.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import type { PaidInvoice } from "./ports/stripe-contracts.ts";
import type { Subscriptions } from "./ports/subscriptions.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** What cancelling did: the plan, and when it ends. */
export interface Cancellation {
  readonly endsAt: DateTime.Utc;
  readonly plan: PaidPlan;
}

/**
 * What applying a cancellation received earlier did: the subscription it
 * ended, and what went back when it had renewed meanwhile.
 */
export interface ReceivedCancellation extends Cancellation {
  readonly refunded: Option.Option<Money>;
  readonly stripeSubscriptionId: string;
}

/** A cancellation that came some time ago, to apply now. */
export interface CancellationReceived {
  /** When its sender wants the contract to end, if they said. */
  readonly desiredAt: Option.Option<DateTime.Utc>;
  /** When it came: the day that counts. */
  readonly receivedAt: DateTime.Utc;
  /** The subscription it named, when it named one. */
  readonly stripeSubscriptionId: Option.Option<string>;
  readonly workspaceId: WorkspaceId;
}

type ReceivedFailure =
  | BillingOff
  | DatabaseError
  | NothingToCancel
  | StripeUnreachable;

// What was charged for the periods that started after `since`, each in
// full: the renewals a cancellation received before them should have
// stopped.
const renewalsSince = (invoices: readonly PaidInvoice[], since: DateTime.Utc) =>
  invoices.flatMap(({ invoiceId, paid, periodStart }) =>
    Option.exists(periodStart, (start) => DateTime.isGreaterThan(start, since))
      ? [{ amount: paid.amount, invoiceId }]
      : []
  );

/**
 * Cancels the workspace's subscription online, as French law asks it be
 * possible in a few clicks (Code de la consommation L215-1-1): a paid one
 * ends when its period does, and nothing more is charged; a trial ends at
 * once. The members who manage billing are told, by email too, which
 * confirms the cancellation and its date on a durable medium. A day asked
 * for after the period paid for is the day it ends (D215-2, 4°). `cancel` is
 * the member's, in person, with billing:manage, recorded as a request
 * received and applied then; `received` applies one that came earlier,
 * from the form anyone reaches, as of the day it came: a plan that renewed
 * since ends at once, and the renewal goes back.
 */
export class CancelSubscription extends Context.Service<
  CancelSubscription,
  {
    readonly cancel: (
      actor: Actor,
      desiredAt?: Option.Option<DateTime.Utc>
    ) => Effect.Effect<
      Cancellation,
      ReceivedFailure | MissingPermission | PersonRequired
    >;
    readonly received: (
      cancellation: CancellationReceived
    ) => Effect.Effect<ReceivedCancellation, ReceivedFailure>;
  }
>()("peal-server/billing/application/CancelSubscription") {
  static readonly layer = Layer.effect(
    CancelSubscription,
    Effect.gen(function* CancelSubscriptionLive() {
      const { enabled } = yield* BillingMode;
      const stripe = yield* StripeContracts;
      const notices = yield* BillingNotices;
      const requests = yield* ContractRequests;
      const context = yield* Effect.context<Ids | Subscriptions>();

      // Asks Stripe for what the effect says; answers what went back.
      const carryOut = Effect.fn("CancelSubscription.carryOut")(
        function* carryOut(
          subscription: Subscription,
          effect: CancellationEffect
        ) {
          const { stripeSubscriptionId: id, workspaceId } = subscription;

          if (effect._tag === "atPeriodEnd") {
            yield* stripe.cancelAtPeriodEnd(workspaceId, id);

            return Option.none<Money>();
          }

          if (effect._tag === "onDate") {
            yield* stripe.cancelAt(workspaceId, id, effect.endsAt);

            return Option.none<Money>();
          }

          if (Option.isNone(effect.refundSince)) {
            yield* stripe.endNow(workspaceId, id, "trialCancelled");

            return Option.none<Money>();
          }

          const invoices = yield* stripe.paidInvoices(workspaceId, id);
          const credits = renewalsSince(invoices, effect.refundSince.value);

          yield* stripe.credit(workspaceId, id, credits);
          yield* stripe.endNow(workspaceId, id, "cancelledLate");

          return Option.some<Money>({
            amount: credits.reduce((sum, { amount }) => sum + amount, 0),
            currency: invoices[0]?.paid.currency ?? currency,
          });
        }
      );

      const received = Effect.fn("CancelSubscription.received")(
        function* received(cancellation: CancellationReceived) {
          if (!enabled) {
            return yield* new BillingOff();
          }

          const { workspaceId } = cancellation;

          const current = (yield* currentSubscription(workspaceId)).pipe(
            Option.filter(({ stripeSubscriptionId }) =>
              Option.match(cancellation.stripeSubscriptionId, {
                onNone: () => true,
                onSome: (named) => named === stripeSubscriptionId,
              })
            )
          );

          if (Option.isNone(current)) {
            return yield* new NothingToCancel();
          }

          const subscription = current.value;
          const now = yield* DateTime.now;
          const id = subscription.stripeSubscriptionId;

          const effect = yield* Effect.fromResult(
            cancellationEffect(subscription, cancellation, now)
          );

          const refunded = yield* carryOut(subscription, effect);

          const done: ReceivedCancellation = {
            endsAt: effect.endsAt,
            plan: subscription.plan,
            refunded,
            stripeSubscriptionId: id,
          };

          yield* notices.tell({
            key: `subscription:${id}:cancelled`,
            notice: {
              _tag: "SubscriptionCancelled",
              endsAt: done.endsAt,
              plan: done.plan,
            },
            workspaceId,
          });

          yield* Effect.logInfo("Cancelled a subscription").pipe(
            Effect.annotateLogs({ plan: subscription.plan, workspaceId })
          );

          return done;
        },
        Effect.provide(context)
      );

      const cancel = Effect.fn("CancelSubscription.cancel")(function* cancel(
        actor: Actor,
        desiredAt: Option.Option<DateTime.Utc> = Option.none()
      ) {
        yield* Effect.fromResult(authorize(actor, "billing:manage"));

        const userId = yield* Effect.fromResult(inPerson(actor));
        const { workspaceId } = actor;
        const receivedAt = yield* DateTime.now;

        const done = yield* received({
          desiredAt,
          receivedAt,
          stripeSubscriptionId: Option.none(),
          workspaceId,
        });

        // The proof of what was asked, and when.
        yield* requests.save(
          new ContractRequest({
            acknowledgedAt: Option.none(),
            acknowledgement: "none",
            channel: "session",
            contract: Option.none(),
            effectiveAt: Option.some(done.endsAt),
            email: Option.none(),
            id: yield* newId(ContractRequestIdSchema),
            kind: "cancellation",
            locale: "en",
            name: Option.none(),
            receivedAt,
            refunded: done.refunded,
            refusal: Option.none(),
            settledAt: Option.some(receivedAt),
            status: "applied",
            stripeSubscriptionId: Option.some(done.stripeSubscriptionId),
            userId: Option.some(userId),
            workspaceId: Option.some(workspaceId),
          })
        );

        const cancellation: Cancellation = {
          endsAt: done.endsAt,
          plan: done.plan,
        };

        return cancellation;
      }, Effect.provide(context));

      return CancelSubscription.of({ cancel, received });
    })
  );
}
