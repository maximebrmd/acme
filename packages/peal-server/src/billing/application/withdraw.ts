import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { Money } from "#billing/domain/billing-notice.ts";
import { BillingOff } from "#billing/domain/billing-off.ts";
import {
  ContractRequest,
  ContractRequestIdSchema,
} from "#billing/domain/contract-request.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { currency } from "#billing/domain/prices.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import { WithdrawalUnavailable } from "#billing/domain/withdrawal-unavailable.ts";
import { mayWithdraw, refundOf } from "#billing/domain/withdrawal.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { currentSubscription } from "./current-subscription.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { BillingNotices } from "./ports/billing-notices.ts";
import { ContractRequests } from "./ports/contract-requests.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import type { InvoiceCredit, PaidInvoice } from "./ports/stripe-contracts.ts";
import type { Subscriptions } from "./ports/subscriptions.ts";
import { Withdrawals } from "./ports/withdrawals.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** What withdrawing would do now, for the member to confirm. */
export interface WithdrawalPreview {
  /** Until when the member may withdraw. */
  readonly endsAt: DateTime.Utc;
  readonly plan: PaidPlan;
  /** What would be refunded now. */
  readonly refund: Money;
  readonly startedAt: DateTime.Utc;
}

/** What withdrawing did. */
export interface WithdrawalDone {
  readonly plan: PaidPlan;
  readonly refunded: Money;
  readonly withdrawnAt: DateTime.Utc;
}

/**
 * What applying a withdrawal received earlier did, and the subscription it
 * ended.
 */
export interface ReceivedWithdrawal extends WithdrawalDone {
  readonly stripeSubscriptionId: string;
}

/** A withdrawal that came some time ago, to apply now. */
export interface WithdrawalReceived {
  /** When it came: the day that counts, for the 14 days and the refund. */
  readonly receivedAt: DateTime.Utc;
  /** The subscription it named, when it named one. */
  readonly stripeSubscriptionId: Option.Option<string>;
  /** The member who sent it, or the account its address signs in to. */
  readonly userId: Option.Option<UserId>;
  readonly workspaceId: WorkspaceId;
}

type ReceivedFailure =
  | BillingOff
  | DatabaseError
  | StripeUnreachable
  | WithdrawalUnavailable;

type WithdrawalFailure = ReceivedFailure | MissingPermission | PersonRequired;

// What goes back of each paid invoice at `at`: the part of the period it
// paid for not supplied yet, that period read from its lines, or else the
// subscription's current one. Without either, all of it goes back.
const creditsAt = (
  invoices: readonly PaidInvoice[],
  subscription: Subscription,
  at: DateTime.Utc
): readonly InvoiceCredit[] =>
  invoices.map((invoice) => {
    const period = Option.all({
      end: invoice.periodEnd,
      start: invoice.periodStart,
    }).pipe(
      Option.orElse(() =>
        Option.all({
          end: subscription.currentPeriodEnd,
          start: subscription.currentPeriodStart,
        })
      )
    );

    return {
      amount: Option.match(period, {
        onNone: () => invoice.paid.amount,
        onSome: ({ end, start }) =>
          refundOf({ end, paid: invoice.paid.amount, start }, at),
      }),
      invoiceId: invoice.invoiceId,
    };
  });

const totalOf = (
  invoices: readonly PaidInvoice[],
  credits: readonly InvoiceCredit[]
): Money => ({
  amount: credits.reduce((sum, { amount }) => sum + amount, 0),
  currency: invoices[0]?.paid.currency ?? currency,
});

/**
 * A consumer's withdrawal from the workspace's subscription within 14
 * days of the contract (EU Consumer Rights Directive art. 9 and 11a; Code
 * de la consommation L221-18 and following), in two steps: what it would
 * do (`preview`), then doing it (`confirm`). It ends the subscription at
 * once and refunds, through a credit note on each invoice paid since the
 * contract started, what each paid for the part of its period not supplied
 * yet, to the second, within the 14 days the law gives. A subscription
 * already cancelled can still be withdrawn from. A customer who gave a VAT number
 * Stripe verified buys as a business and cannot. `preview` and `confirm`
 * are the member's, in person, with billing:manage, the withdrawal recorded
 * as a request received and applied then; `received` applies one that came
 * earlier, from the form anyone reaches, as of the moment it came: the 14
 * days and the refund count from then (Directive 2011/83/EU art. 11a(5)).
 */
export class Withdraw extends Context.Service<
  Withdraw,
  {
    readonly preview: (
      actor: Actor
    ) => Effect.Effect<WithdrawalPreview, WithdrawalFailure>;
    readonly confirm: (
      actor: Actor
    ) => Effect.Effect<WithdrawalDone, WithdrawalFailure>;
    readonly received: (
      withdrawal: WithdrawalReceived
    ) => Effect.Effect<ReceivedWithdrawal, ReceivedFailure>;
  }
>()("peal-server/billing/application/Withdraw") {
  static readonly layer = Layer.effect(
    Withdraw,
    Effect.gen(function* WithdrawLive() {
      const { enabled } = yield* BillingMode;
      const stripe = yield* StripeContracts;
      const withdrawals = yield* Withdrawals;
      const notices = yield* BillingNotices;
      const requests = yield* ContractRequests;
      const context = yield* Effect.context<Ids | Subscriptions>();

      // The subscription that may be withdrawn from at `at`, with what it
      // took and what goes back.
      const withdrawableAt = Effect.fn("Withdraw.withdrawableAt")(
        function* withdrawableAt(
          workspaceId: WorkspaceId,
          at: DateTime.Utc,
          named: Option.Option<string>
        ) {
          if (!enabled) {
            return yield* new BillingOff();
          }

          const current = (yield* currentSubscription(workspaceId)).pipe(
            Option.filter(({ stripeSubscriptionId }) =>
              Option.match(named, {
                onNone: () => true,
                onSome: (id) => id === stripeSubscriptionId,
              })
            )
          );

          if (Option.isNone(current)) {
            return yield* new WithdrawalUnavailable({
              reason: "notSubscribed",
            });
          }

          const subscription: Subscription = current.value;

          const endsAt = yield* Effect.fromResult(
            mayWithdraw(subscription, at)
          );

          if (
            yield* stripe.isBusiness(workspaceId, subscription.stripeCustomerId)
          ) {
            return yield* new WithdrawalUnavailable({ reason: "business" });
          }

          // Every payment since the contract started, a change of plan's
          // included, each less the part of its period already supplied.
          const invoices: readonly PaidInvoice[] =
            subscription.status === "trialing"
              ? []
              : yield* stripe.paidInvoices(
                  workspaceId,
                  subscription.stripeSubscriptionId
                );

          const refund = totalOf(
            invoices,
            creditsAt(invoices, subscription, at)
          );

          return { endsAt, invoices, now: at, refund, subscription };
        },
        Effect.provide(context)
      );

      // The member in person, with billing:manage.
      const member = Effect.fn("Withdraw.member")(function* member(
        actor: Actor
      ) {
        yield* Effect.fromResult(authorize(actor, "billing:manage"));

        return yield* Effect.fromResult(inPerson(actor));
      });

      const preview = Effect.fn("Withdraw.preview")(function* preview(
        actor: Actor
      ) {
        yield* member(actor);

        const found = yield* withdrawableAt(
          actor.workspaceId,
          yield* DateTime.now,
          Option.none()
        );

        const shown: WithdrawalPreview = {
          endsAt: found.endsAt,
          plan: found.subscription.plan,
          refund: found.refund,
          startedAt: Option.getOrElse(
            found.subscription.startedAt,
            () => found.now
          ),
        };

        return shown;
      });

      const received = Effect.fn("Withdraw.received")(function* received(
        withdrawal: WithdrawalReceived
      ) {
        const { workspaceId } = withdrawal;

        const found = yield* withdrawableAt(
          workspaceId,
          withdrawal.receivedAt,
          withdrawal.stripeSubscriptionId
        );

        const { subscription } = found;
        const id = subscription.stripeSubscriptionId;

        // Recorded first: a withdrawal tried again refunds what the first
        // try computed, under the same idempotency key.
        const recorded = yield* withdrawals.record({
          refunded: found.refund,
          requestedAt: found.now,
          stripeSubscriptionId: id,
          userId: withdrawal.userId,
          workspaceId,
        });

        // Computed at the time recorded: tried again, each invoice gets the
        // same credit, under the same key.
        if (recorded.refunded.amount > 0) {
          yield* stripe.credit(
            workspaceId,
            id,
            creditsAt(found.invoices, subscription, recorded.requestedAt)
          );
        }

        yield* stripe.endNow(workspaceId, id, "withdrawn");

        const done: ReceivedWithdrawal = {
          plan: subscription.plan,
          refunded: recorded.refunded,
          stripeSubscriptionId: id,
          withdrawnAt: recorded.requestedAt,
        };

        yield* notices.tell({
          key: `subscription:${id}:withdrawn`,
          notice: {
            _tag: "SubscriptionWithdrawn",
            plan: done.plan,
            refunded: done.refunded,
            withdrawnAt: done.withdrawnAt,
          },
          workspaceId,
        });

        yield* Effect.logInfo("A consumer withdrew from a subscription").pipe(
          Effect.annotateLogs({
            plan: subscription.plan,
            refunded: recorded.refunded.amount,
            workspaceId,
          })
        );

        return done;
      });

      const confirm = Effect.fn("Withdraw.confirm")(function* confirm(
        actor: Actor
      ) {
        const userId = yield* member(actor);
        const { workspaceId } = actor;
        const receivedAt = yield* DateTime.now;

        const done = yield* received({
          receivedAt,
          stripeSubscriptionId: Option.none(),
          userId: Option.some(userId),
          workspaceId,
        });

        // The proof of what was asked, and when: tried again, the same
        // withdrawal is recorded as asked again.
        yield* requests.save(
          new ContractRequest({
            acknowledgedAt: Option.none(),
            acknowledgement: "none",
            channel: "session",
            contract: Option.none(),
            effectiveAt: Option.some(done.withdrawnAt),
            email: Option.none(),
            id: yield* newId(ContractRequestIdSchema),
            kind: "withdrawal",
            locale: "en",
            name: Option.none(),
            receivedAt,
            refunded: Option.some(done.refunded),
            refusal: Option.none(),
            settledAt: Option.some(receivedAt),
            status: "applied",
            stripeSubscriptionId: Option.some(done.stripeSubscriptionId),
            userId: Option.some(userId),
            workspaceId: Option.some(workspaceId),
          })
        );

        const withdrawn: WithdrawalDone = {
          plan: done.plan,
          refunded: done.refunded,
          withdrawnAt: done.withdrawnAt,
        };

        return withdrawn;
      }, Effect.provide(context));

      return Withdraw.of({ confirm, preview, received });
    })
  );
}
