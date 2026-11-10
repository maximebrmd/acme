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
  readonly paid: Money;
  readonly periodEnd: Option.Option<DateTime.Utc>;
  readonly periodStart: Option.Option<DateTime.Utc>;
}

/** What goes back to the consumer of one paid invoice, in its currency. */
export interface InvoiceCredit {
  readonly amount: number;
  readonly invoiceId: string;
}

/** Why a subscription is ended at once. */
export type EndReason =
  // A cancellation applied after the period it was received in had ended.
  | "cancelledLate"
  | "duplicateTrial"
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
      at: DateTime.Utc
    ) => Effect.Effect<void, StripeUnreachable>;
    /** Sets the subscription to end when its period does. */
    readonly cancelAtPeriodEnd: (
      workspaceId: WorkspaceId,
      subscriptionId: string
    ) => Effect.Effect<void, StripeUnreachable>;
    /**
     * Refunds the consumer through a credit note on each invoice, so the
     * invoice and the tax Stripe reports match the refund, once per
     * subscription and invoice.
     */
    readonly credit: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      credits: readonly InvoiceCredit[]
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
    /** The subscription's paid invoices that took something, newest first. */
    readonly paidInvoices: (
      workspaceId: WorkspaceId,
      subscriptionId: string
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
