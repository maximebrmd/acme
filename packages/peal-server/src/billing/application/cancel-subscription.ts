import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import type { Money } from "#billing/domain/billing-notice.ts";
import { BillingOff } from "#billing/domain/billing-off.ts";
import {
  cancellationEffect,
  renewalRefund,
} from "#billing/domain/cancellation-effect.ts";
import type { CancellationEffect } from "#billing/domain/cancellation-effect.ts";
import {
  changed,
  ContractRequest,
  ContractRequestIdSchema,
} from "#billing/domain/contract-request.ts";
import type {
  ContractRequestId,
  RequestIntent,
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

import { refusedAsFailure } from "./credited.ts";
import { contractAt } from "./current-subscription.ts";
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
  /**
   * Keeps what was decided for it, before Stripe is asked anything: a try
   * that stops after Stripe is then taken up as decided.
   */
  readonly decided: (
    intent: RequestIntent
  ) => Effect.Effect<void, DatabaseError>;
  /** When its sender wants the contract to end, if they said. */
  readonly desiredAt: Option.Option<DateTime.Utc>;
  /** What an earlier try decided for it, if one got that far. */
  readonly intent: Option.Option<RequestIntent>;
  /** When it came: the day that counts. */
  readonly receivedAt: DateTime.Utc;
  /**
   * The request it is: it names what Stripe is asked, and what members are
   * told, so another request for the same contract is another.
   */
  readonly requestId: ContractRequestId;
  /** The subscription it named, when it named one. */
  readonly stripeSubscriptionId: Option.Option<string>;
  readonly workspaceId: WorkspaceId;
}

type ReceivedFailure =
  | BillingOff
  | DatabaseError
  | NothingToCancel
  | StripeUnreachable;

// What goes back of each invoice for the periods that started after
// `since`: the renewals a cancellation received before them should have
// stopped, and nothing an invoice also settled of earlier periods.
const renewalsSince = (invoices: readonly PaidInvoice[], since: DateTime.Utc) =>
  invoices.flatMap(({ invoiceId, lines, paid }) => {
    const amount = renewalRefund({ lines, paid: paid.amount }, since);

    return amount > 0 ? [{ amount, invoiceId }] : [];
  });

const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

// What was decided, as the request keeps it.
const intentOf = (decided: {
  readonly effect: CancellationEffect;
  readonly id: string;
  readonly plan: PaidPlan;
}): RequestIntent => ({
  effect: {
    endsAt: iso(decided.effect.endsAt),
    refundSince:
      decided.effect._tag === "now"
        ? decided.effect.refundSince.pipe(Option.map(iso), Option.getOrNull)
        : null,
    tag: decided.effect._tag,
  },
  plan: decided.plan,
  stripeSubscriptionId: decided.id,
});

// What a request kept of an earlier try, read back; none when it kept a
// withdrawal's, or an instant that does not read.
const decidedEffect = ({ effect, plan, stripeSubscriptionId }: RequestIntent) =>
  Option.fromNullOr(effect).pipe(
    Option.flatMap(({ endsAt, refundSince, tag }) =>
      Option.all({
        endsAt: DateTime.make(endsAt),
        since:
          refundSince === null
            ? Option.some(Option.none<DateTime.Utc>())
            : DateTime.make(refundSince).pipe(Option.map(Option.some)),
      }).pipe(
        Option.map(({ endsAt: at, since }): CancellationEffect =>
          tag === "now"
            ? { _tag: "now", endsAt: at, refundSince: since }
            : { _tag: tag, endsAt: at }
        )
      )
    ),
    Option.map((decided) => ({
      effect: decided,
      id: stripeSubscriptionId,
      plan,
    }))
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
          subscription: Pick<
            Subscription,
            "stripeSubscriptionId" | "workspaceId"
          >,
          effect: CancellationEffect,
          requestKey: string
        ) {
          const { stripeSubscriptionId: id, workspaceId } = subscription;

          if (effect._tag === "atPeriodEnd") {
            yield* stripe.cancelAtPeriodEnd(workspaceId, id, requestKey);

            return Option.none<Money>();
          }

          if (effect._tag === "onDate") {
            yield* stripe.cancelAt(workspaceId, id, effect.endsAt, requestKey);

            return Option.none<Money>();
          }

          if (Option.isNone(effect.refundSince)) {
            yield* stripe.endNow(workspaceId, id, "trialCancelled");

            return Option.none<Money>();
          }

          const invoices = yield* stripe.paidInvoices(workspaceId, id);
          const credits = renewalsSince(invoices, effect.refundSince.value);

          yield* stripe
            .credit(workspaceId, id, credits, {
              _tag: "lateCancellation",
              requestKey,
            })
            .pipe(Effect.flatMap(refusedAsFailure(workspaceId)));
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

          const { requestId, workspaceId } = cancellation;
          const now = yield* DateTime.now;

          // As decided by an earlier try, or decided now, and kept before
          // Stripe is asked.
          const { effect, id, plan } = yield* Option.match(
            cancellation.intent.pipe(Option.flatMap(decidedEffect)),
            {
              onNone: Effect.fnUntraced(function* decide() {
                const found = yield* contractAt(
                  workspaceId,
                  cancellation.stripeSubscriptionId,
                  cancellation.receivedAt
                );

                if (Option.isNone(found)) {
                  return yield* new NothingToCancel();
                }

                const { subscription } = found.value;

                const decided = {
                  effect: yield* Effect.fromResult(
                    cancellationEffect(subscription, cancellation, now)
                  ),
                  id: subscription.stripeSubscriptionId,
                  plan: subscription.plan,
                };

                yield* cancellation.decided(intentOf(decided));

                return decided;
              }),
              onSome: Effect.succeed,
            }
          );

          const refunded = yield* carryOut(
            { stripeSubscriptionId: id, workspaceId },
            effect,
            requestId
          );

          const done: ReceivedCancellation = {
            endsAt: effect.endsAt,
            plan,
            refunded,
            stripeSubscriptionId: id,
          };

          yield* notices.tell({
            key: `subscription:${id}:cancelled:${requestId}`,
            notice: {
              _tag: "SubscriptionCancelled",
              endsAt: done.endsAt,
              plan: done.plan,
            },
            workspaceId,
          });

          yield* Effect.logInfo("Cancelled a subscription").pipe(
            Effect.annotateLogs({ plan, workspaceId })
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

        // The proof of what was asked, and when, kept before anything is
        // asked of Stripe.
        const request = new ContractRequest({
          acknowledgedAt: Option.none(),
          acknowledgement: "none",
          channel: "session",
          contract: Option.none(),
          desiredAt,
          effectiveAt: Option.none(),
          email: Option.none(),
          id: yield* newId(ContractRequestIdSchema),
          kind: "cancellation",
          locale: "en",
          name: Option.none(),
          receivedAt,
          refunded: Option.none(),
          refusal: Option.none(),
          settledAt: Option.none(),
          status: "received",
          stripeSubscriptionId: Option.none(),
          userId: Option.some(userId),
          workspaceId: Option.some(workspaceId),
        });

        // The request as last kept.
        const kept = yield* Ref.make(request);

        const done = yield* received({
          decided: (intent) =>
            Ref.updateAndGet(kept, (before) =>
              changed(before, { intent: Option.some(intent) })
            ).pipe(Effect.flatMap(requests.save)),
          desiredAt,
          intent: Option.none(),
          receivedAt,
          requestId: request.id,
          stripeSubscriptionId: Option.none(),
          workspaceId,
        }).pipe(
          // Stripe did not take it: staff see it, and apply it as of now,
          // when it was asked.
          Effect.tapErrorTag("StripeUnreachable", () =>
            Ref.get(kept).pipe(
              Effect.flatMap((before) =>
                requests.save(changed(before, { status: "unmatched" }))
              ),
              Effect.ignore
            )
          )
        );

        yield* requests.save(
          changed(yield* Ref.get(kept), {
            effectiveAt: Option.some(done.endsAt),
            refunded: done.refunded,
            settledAt: Option.some(receivedAt),
            status: "applied",
            stripeSubscriptionId: Option.some(done.stripeSubscriptionId),
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
