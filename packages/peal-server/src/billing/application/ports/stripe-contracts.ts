import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import type { Money } from "#billing/domain/billing-notice.ts";
import type { InvoiceLine } from "#billing/domain/cancellation-effect.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * An invoice of the subscription that was paid: what it took, taxes
 * included, and the period it paid for, from its lines.
 */
export interface PaidInvoice {
  readonly invoiceId: string;
  /** Its lines: what each charged before tax, and from when. */
  readonly lines: readonly InvoiceLine[];
  /**
   * Its lines with the period each paid for, as Stripe gives them: a
   * renewal may also carry an earlier period's prorations. None from a
   * stand-in that lists no periods.
   */
  readonly linePeriods?: readonly {
    readonly amount: number;
    readonly end: DateTime.Utc;
    readonly start: DateTime.Utc;
  }[];
  readonly paid: Money;
  readonly periodEnd: Option.Option<DateTime.Utc>;
  readonly periodStart: Option.Option<DateTime.Utc>;
}

/** What goes back to the consumer of one paid invoice, in its currency. */
export interface InvoiceCredit {
  readonly amount: number;
  readonly invoiceId: string;
}

/**
 * What was credited of one invoice: what was asked, and what Stripe still
 * let go back of it (what it took, less the credit notes and refunds made
 * since), never more.
 */
export interface InvoiceCredited {
  readonly asked: number;
  readonly credited: number;
  readonly currency: string;
  readonly invoiceId: string;
}

/**
 * Why money goes back: a consumer's withdrawal, once per subscription; the
 * renewals a cancellation received before them should have stopped, once
 * per request; or the unused time of a legacy plan ended as it moved to
 * per-account pricing, once per subscription.
 */
export type CreditReason =
  | { readonly _tag: "lateCancellation"; readonly requestKey: string }
  | { readonly _tag: "movedToRateCard" }
  | { readonly _tag: "retirement" }
  | { readonly _tag: "withdrawal" };

/** Why a subscription is ended at once. */
export type EndReason =
  // A cancellation applied after the period it was received in had ended.
  | "cancelledLate"
  | "duplicateTrial"
  // A second per-account subscription of one billing account.
  | "duplicateSubscription"
  // A legacy plan ended as per-account pricing started, its unused time
  // credited.
  | "movedToRateCard"
  | "orderedDuringTrial"
  | "trialCancelled"
  | "withdrawn";

/**
 * What billing asks Stripe of a workspace's subscription, besides
 * checkout: ending it, refunding a consumer, what it charges, and whether
 * its customer buys as a business. Each call names the workspace, for its
 * errors.
 */
export class StripeContracts extends Context.Service<
  StripeContracts,
  {
    /**
     * Sets the subscription to end at `at`, after the period paid for: it
     * renews until then, and Stripe charges its last period only up to
     * `at`.
     */
    readonly cancelAt: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      at: DateTime.Utc,
      requestKey: string
    ) => Effect.Effect<void, StripeUnreachable>;
    /**
     * Sets the subscription to end when its period does. `requestKey`
     * names the request that asks, in Stripe's idempotency key: the same
     * request asked again changes nothing more, and another one, as after
     * the cancellation was undone, is carried out.
     */
    readonly cancelAtPeriodEnd: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      requestKey: string
    ) => Effect.Effect<void, StripeUnreachable>;
    /**
     * Refunds the customer through a credit note on each invoice, so the
     * invoice and the tax Stripe reports match the refund: once per
     * invoice for `reason` (a withdrawal's subscription, a cancellation's
     * request), however long after it is asked again, as each note
     * carries its key and one found is not made again. Each is capped at
     * what is still refundable of its invoice: what it took, less the
     * credit notes made since and the refunds made outside them.
     */
    readonly credit: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      credits: readonly InvoiceCredit[],
      reason: CreditReason
    ) => Effect.Effect<readonly InvoiceCredited[], StripeUnreachable>;
    /**
     * Sets a retired legacy plan to end at `at`: within the period paid
     * for without proration (its unused part is credited by a credit note
     * once it ends), in a later one charging the period it renews into
     * only up to `at` (`prorate`), as Stripe does there anyway. Asked again
     * for the same day, the same request.
     */
    readonly retireAt: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      at: DateTime.Utc,
      prorate: boolean
    ) => Effect.Effect<void, StripeUnreachable>;
    /**
     * Sets a trial to end, cancelled, when its trial does, so it never
     * turns into a charge, even once a payment method was added. A
     * subscription Stripe no longer has, or no longer lets change, is left
     * as it is.
     */
    readonly endAtTrialEnd: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      trialEnd: DateTime.Utc
    ) => Effect.Effect<void, StripeUnreachable>;
    /**
     * Ends the subscription now and invoices the usage it has not billed
     * yet, to this moment, without proration: how per-account pricing,
     * billed for the month past, ends at once. Asked twice, Stripe ends it
     * once.
     */
    readonly endAndInvoice: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      reason: EndReason
    ) => Effect.Effect<void, StripeUnreachable>;
    /**
     * Ends the subscription now, without proration or final invoice. Asked
     * twice, Stripe ends it once.
     */
    readonly endNow: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      reason: EndReason
    ) => Effect.Effect<void, StripeUnreachable>;
    /**
     * Whether the customer gave a VAT number Stripe verified: a business,
     * which has no right to withdraw.
     */
    readonly isBusiness: (
      workspaceId: WorkspaceId,
      customerId: string
    ) => Effect.Effect<boolean, StripeUnreachable>;
    /**
     * The subscription's paid invoices that took something, newest first;
     * with `settledByCredit`, also those settled from the customer's credit
     * balance (paid, a total above nothing, no charge), which count as a
     * first paid invoice but refund nothing.
     */
    readonly paidInvoices: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      options?: { readonly settledByCredit?: boolean }
    ) => Effect.Effect<readonly PaidInvoice[], StripeUnreachable>;
    /**
     * What the subscription's next invoice will take, taxes included, if
     * Stripe can say.
     */
    readonly upcomingTotal: (
      workspaceId: WorkspaceId,
      subscriptionId: string
    ) => Effect.Effect<Option.Option<Money>, StripeUnreachable>;
  }
>()("peal-server/billing/application/StripeContracts") {}
