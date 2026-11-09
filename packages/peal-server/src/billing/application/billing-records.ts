import { Context, Effect, Layer, Option, Schema } from "effect";

import { entitlementsOf } from "#billing/domain/entitlements.ts";
import {
  billsAt,
  stillBills,
  SubscriptionStatusSchema,
} from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { BillingRecord } from "#shared/application/personal-data.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { Checkouts } from "./ports/checkouts.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";
import { WorkspaceStillBilled } from "./workspace-still-billed.ts";

const decodeStatus = Schema.decodeUnknownOption(SubscriptionStatusSchema);

// A status the plugin holds that Stripe does not name is taken as one that
// may bill: refusing a deletion can be tried again, a bill cannot be undone.
const mayBill = (status: string): boolean =>
  Option.match(decodeStatus(status), { onNone: () => true, onSome: billsAt });

/** How an erasure treats a subscription Stripe may still bill. */
export interface ErasureOptions {
  /**
   * Cancel it at Stripe, at once, as the person deleting the workspace
   * agreed to; otherwise the erasure is refused.
   */
  readonly cancelSubscriptions: boolean;
}

/** What erasing a workspace did at Stripe. */
export interface ErasedBilling {
  /** The subscriptions cancelled at Stripe, none unless asked to. */
  readonly subscriptionsCancelled: number;
}

const refuseBilled: ErasureOptions = { cancelSubscriptions: false };

/**
 * What billing keeps of a workspace as a whole, for the workspace context
 * when a workspace's data is exported or erased: its plan and the state of
 * its subscriptions, never a card, an invoice or Stripe's ids, which stay
 * with Stripe. Erasing runs in the caller's transaction, if any. Stripe may
 * still bill the workspace through a subscription Stripe's events reported
 * that `stillBills`, one a checkout started that the Stripe plugin holds in
 * such a status, since its events may not have come yet, or one Stripe
 * holds that no event told of, as a checkout completed just before would
 * leave. Unless told to cancel them, the erasure is refused, before
 * anything is deleted, while one of those may bill. Either way the
 * workspace's Checkout Sessions still open are expired at Stripe, so a
 * checkout left open in another tab cannot complete for a workspace that is
 * gone; told to, it then cancels every subscription that may bill, at
 * once, without proration or a final invoice. The Stripe customer and its
 * invoices stay with Stripe, as accounting law keeps invoices. Stripe not
 * answering refuses the erasure. On a server that does not bill, a
 * workspace has no plan, and erasing it is never refused.
 */
export class BillingRecords extends Context.Service<
  BillingRecords,
  {
    /** The workspace's plan and every subscription it has had. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<BillingRecord, DatabaseError>;
    /**
     * Deletes the workspace's subscriptions, once none may bill it, after
     * cancelling those that may when `options` says to.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId,
      options?: ErasureOptions
    ) => Effect.Effect<
      ErasedBilling,
      DatabaseError | StripeUnreachable | WorkspaceStillBilled
    >;
  }
>()("peal-server/billing/application/BillingRecords") {
  static readonly layer = Layer.effect(
    BillingRecords,
    Effect.gen(function* BillingRecordsLive() {
      const { enabled } = yield* BillingMode;
      const subscriptions = yield* Subscriptions;
      const checkouts = yield* Checkouts;

      const exportWorkspace = Effect.fn("BillingRecords.exportWorkspace")(
        function* exportWorkspace(workspaceId: WorkspaceId) {
          const held = yield* subscriptions.ofWorkspace(workspaceId);

          const record: BillingRecord = {
            plan: enabled ? Option.getOrNull(entitlementsOf(held).plan) : null,
            subscriptions: held.map((subscription) => ({
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              currentPeriodEnd: Option.getOrNull(subscription.currentPeriodEnd),
              plan: subscription.plan,
              status: subscription.status,
            })),
          };

          return record;
        }
      );

      const eraseWorkspace = Effect.fn("BillingRecords.eraseWorkspace")(
        function* eraseWorkspace(
          workspaceId: WorkspaceId,
          options: ErasureOptions = refuseBilled
        ) {
          let subscriptionsCancelled = 0;

          // A server that does not bill never refuses, nor calls Stripe.
          if (enabled) {
            const held = yield* subscriptions.ofWorkspace(workspaceId);
            const started = yield* checkouts.statuses(workspaceId);

            const billed = held.filter((subscription) =>
              stillBills(subscription)
            );

            const refused = new WorkspaceStillBilled({
              paidUntil: Option.fromUndefinedOr(billed[0]).pipe(
                Option.flatMap(({ currentPeriodEnd }) => currentPeriodEnd)
              ),
              plan: Option.fromUndefinedOr(billed[0]?.plan),
              workspaceId,
            });

            if (
              !options.cancelSubscriptions &&
              (billed.length > 0 || started.some(mayBill))
            ) {
              return yield* refused;
            }

            // None can complete now: whatever completed before started a
            // subscription that Stripe holds, its events or not.
            yield* checkouts.expireOpen(workspaceId);

            if (options.cancelSubscriptions) {
              subscriptionsCancelled = yield* checkouts.cancelBilled(
                workspaceId,
                {
                  known: billed.map(
                    ({ stripeSubscriptionId }) => stripeSubscriptionId
                  ),
                  mayBill,
                }
              );
            } else if ((yield* checkouts.atStripe(workspaceId)).some(mayBill)) {
              return yield* refused;
            }
          }

          yield* subscriptions.eraseWorkspace(workspaceId);

          const erased: ErasedBilling = { subscriptionsCancelled };

          return erased;
        }
      );

      return BillingRecords.of({ eraseWorkspace, exportWorkspace });
    })
  );
}
