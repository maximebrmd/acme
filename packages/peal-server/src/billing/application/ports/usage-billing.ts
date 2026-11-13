import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import type { CatalogueLine } from "#billing/domain/catalogue.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A meter event as it is sent: the outbox's report, stamped. */
export interface MeterEvent {
  readonly eventName: string;
  readonly identifier: string;
  readonly stripeCustomerId: string;
  readonly timestamp: DateTime.Utc;
  readonly value: number;
}

/**
 * What became of a meter event: taken, to be tried again on the next run
 * (Stripe did not answer, limited the rate or failed itself), or refused
 * for good, with Stripe's error code (never its message).
 */
export type ReportOutcome =
  | { readonly _tag: "sent" }
  | { readonly _tag: "retry" }
  | { readonly _tag: "refused"; readonly code: string };

/** What keeping a subscription's items changed. */
export interface ItemsKept {
  /** Lines of the catalogue the subscription had no item for. */
  readonly added: number;
  /** Items moved to the price that took their line's lookup key. */
  readonly replaced: number;
}

/**
 * Everything billing asks Stripe of usage: meter events, and the items
 * and threshold of a per-account subscription. Another usage platform
 * would replace its adapter only.
 */
export class UsageBilling extends Context.Service<
  UsageBilling,
  {
    /** Each catalogue line's meter event name at Stripe. */
    readonly eventNames: { readonly [L in CatalogueLine]: string };
    /** Sends one meter event, under its identifier. Never fails. */
    readonly report: (event: MeterEvent) => Effect.Effect<ReportOutcome>;
    /**
     * Gives the subscription one item per catalogue price: adds the
     * missing ones and moves an item whose price lost its lookup key to
     * the price that took it, without proration.
     */
    readonly ensureItems: (
      workspaceId: WorkspaceId,
      subscriptionId: string
    ) => Effect.Effect<ItemsKept, StripeUnreachable>;
    /**
     * Has the subscription invoiced as soon as its usage reaches `cents`,
     * its billing month unchanged, or never before its period ends (none).
     */
    readonly setThreshold: (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      cents: Option.Option<number>
    ) => Effect.Effect<void, StripeUnreachable>;
  }
>()("peal-server/billing/application/UsageBilling") {}
