import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import type { Money } from "#billing/domain/billing-notice.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A payment a subscription's latest paid invoice took. */
export interface PeriodPayment {
  readonly paid: Money;
  /** Stripe's payment, which a refund names. */
  readonly paymentIntentId: string;
}

/** Why a subscription is ended at once. */
export type EndReason = "orderedDuringTrial" | "trialCancelled" | "withdrawn";

/**
 * What billing asks Stripe of a workspace's subscription, besides
 * checkout: ending it, refunding a consumer, and whether its customer buys
 * as a business. Each call names the workspace, for its errors.
 */
export class StripeContracts extends Context.Service<
  StripeContracts,
  {
    /** Sets the subscription to end when its period does. */
    readonly cancelAtPeriodEnd: (
      workspaceId: WorkspaceId,
      subscriptionId: string
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
    /** What the subscription's latest paid invoice took, if any. */
    readonly latestPayment: (
      workspaceId: WorkspaceId,
      subscriptionId: string
    ) => Effect.Effect<Option.Option<PeriodPayment>, StripeUnreachable>;
    /** Refunds part of a payment, once per subscription. */
    readonly refund: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      payment: PeriodPayment,
      amount: number
    ) => Effect.Effect<void, StripeUnreachable>;
  }
>()("peal-server/billing/application/StripeContracts") {}
