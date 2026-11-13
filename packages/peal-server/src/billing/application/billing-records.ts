import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import { entitlementsOf } from "#billing/domain/entitlements.ts";
import {
  billsAt,
  stillBills,
  SubscriptionStatusSchema,
} from "#billing/domain/subscription.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  BillingRecord,
  ContractsRecord,
} from "#shared/application/personal-data.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { BillingAccounts } from "./billing-accounts.ts";
import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { Checkouts } from "./ports/checkouts.ts";
import { ContractRecords } from "./ports/contract-records.ts";
import { ContractReferences } from "./ports/contract-references.ts";
import { ContractRequests } from "./ports/contract-requests.ts";
import { MeteredPostLedger } from "./ports/metered-post-ledger.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { UsageLedger } from "./ports/usage-ledger.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";
import { WorkspaceStillBilled } from "./workspace-still-billed.ts";
import type { BilledSubscription } from "./workspace-still-billed.ts";

const decodeStatus = Schema.decodeUnknownOption(SubscriptionStatusSchema);

// A status the plugin holds that Stripe does not name is taken as one that
// may bill: refusing a deletion can be tried again, a bill cannot be undone.
const mayBill = (status: string): boolean =>
  Option.match(decodeStatus(status), { onNone: () => true, onSome: billsAt });

// One that Stripe holds and no record describes yet.
const undescribed: BilledSubscription = {
  paidUntil: Option.none(),
  plan: Option.none(),
};

// What may still bill, for the person deleting: each subscription billing
// recorded, or, for a checkout completed before Stripe's events, one that
// nothing describes yet.
const describe = ({
  billed,
  checkedOut,
}: {
  readonly billed: readonly Subscription[];
  readonly checkedOut: boolean;
}): readonly BilledSubscription[] => {
  const described = billed.map((subscription): BilledSubscription => ({
    paidUntil: subscription.currentPeriodEnd,
    plan: Option.some(subscription.plan),
  }));

  return described.length === 0 && checkedOut ? [undescribed] : described;
};

/** How an erasure treats a subscription Stripe may still bill. */
export interface ErasureOptions {
  /**
   * Cancel it at Stripe, at once, as the person deleting the workspace
   * agreed to; otherwise the erasure is refused.
   */
  readonly cancelSubscriptions: boolean;
}

/** What settling a workspace's billing did at Stripe. */
export interface ErasedBilling {
  /** The subscriptions cancelled at Stripe, none unless asked to. */
  readonly subscriptionsCancelled: number;
}

const refuseBilled: ErasureOptions = { cancelSubscriptions: false };

/**
 * What billing keeps of a workspace as a whole, for the workspace context
 * when a workspace's data is exported or erased: its plan, the state of
 * its subscriptions, its counts of metered posts and its usage ledger,
 * never a card, an
 * invoice or Stripe's ids, which stay with Stripe.
 *
 * Erasing takes two steps. Stripe's side goes first, outside the erasure's
 * transaction, as it cannot be rolled back (`settleWorkspace`): Stripe may
 * still bill the workspace through a subscription Stripe's events reported
 * that `stillBills`, one a checkout started that the Stripe plugin holds in
 * such a status, since its events may not have come yet, or one Stripe
 * holds that no event told of, as a checkout completed just before would
 * leave. Unless told to cancel them, settling is refused while one of those
 * may bill (`billedBy` lists them). Either way the workspace's Checkout
 * Sessions still open are expired at Stripe, so a checkout left open in
 * another tab cannot complete for a workspace that is gone; told to, it
 * then cancels every subscription that may bill, at once, without
 * proration or a final invoice, each once however often it is retried.
 * Then the erasure, in the caller's transaction (`eraseWorkspace`), asks
 * Stripe again and is refused while anything still bills, as a checkout
 * completed in between would, and deletes billing's records. A failure
 * after settling leaves the workspace on the free plan, to be deleted
 * again. The Stripe customer and its invoices stay with Stripe, as
 * accounting law keeps invoices. Stripe not answering refuses either step.
 * On a server that does not bill, a workspace has no plan, and erasing it
 * is never refused.
 */
export class BillingRecords extends Context.Service<
  BillingRecords,
  {
    /**
     * The workspace's plan, every subscription it has had, how many posts
     * it made each month on platforms that bill per post, and its usage
     * ledger.
     */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<BillingRecord, DatabaseError>;
    /**
     * The subscriptions billing's records and the Stripe plugin's say may
     * still bill the workspace, described for the person deleting it; one
     * only the plugin holds has no plan or end yet. None on a server that
     * does not bill.
     */
    readonly billedBy: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly BilledSubscription[], DatabaseError>;
    /**
     * Stripe's side of erasing the workspace, before the erasure's
     * transaction: refused while Stripe may still bill it unless `options`
     * says to cancel, then expires its open checkouts and, told to,
     * cancels what may bill. Cannot be undone.
     */
    readonly settleWorkspace: (
      workspaceId: WorkspaceId,
      options?: ErasureOptions
    ) => Effect.Effect<
      ErasedBilling,
      DatabaseError | StripeUnreachable | WorkspaceStillBilled
    >;
    /**
     * Deletes the workspace's subscriptions and counts, in the caller's
     * transaction, once Stripe says none may still bill it: settle it first.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<
      void,
      DatabaseError | StripeUnreachable | WorkspaceStillBilled
    >;
    /** The orders and withdrawals the user made, in any workspace. */
    readonly exportUser: (
      userId: UserId
    ) => Effect.Effect<ContractsRecord, DatabaseError>;
    /**
     * Leaves billing's records without the user, in the caller's
     * transaction, as their account closes: the orders and withdrawals
     * they made, the trial they started, which stays the workspace's, and
     * by `pseudonym`, their email address's, for `trialMemory`.
     */
    readonly forgetUser: (
      userId: UserId,
      pseudonym: string
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/BillingRecords") {
  static readonly layer = Layer.effect(
    BillingRecords,
    Effect.gen(function* BillingRecordsLive() {
      const { enabled } = yield* BillingMode;
      const subscriptions = yield* Subscriptions;
      const checkouts = yield* Checkouts;
      const metered = yield* MeteredPostLedger;
      const usage = yield* UsageLedger;
      const contracts = yield* ContractRecords;
      const requests = yield* ContractRequests;
      const references = yield* ContractReferences;
      const accounts = yield* BillingAccounts;
      const accountStore = yield* BillingAccountStore;

      const exportUser = Effect.fn("BillingRecords.exportUser")(
        function* exportUser(userId: UserId) {
          const made = yield* contracts.ofUser(userId);
          const asked = yield* requests.ofUser(userId);
          const paid = yield* accountStore.paidBy(userId);

          const held = yield* accountStore.workspacesOfEach(
            paid.map(({ id }) => id)
          );

          const offers = yield* accountStore.transfersFor(userId);

          const required = yield* accountStore.requiresPayment(
            userId,
            Option.none()
          );

          const record: ContractsRecord = {
            billingAccounts: {
              accounts: paid.map((account) => ({
                billingWorkspaceId: account.holder,
                createdAt: account.createdAt,
                id: account.id,
                standalone: account.standalone,
                workspaceIds: held.get(account.id) ?? [],
              })),
              paymentMethodRequired: required,
              transferOffers: offers.map((offer) => ({
                expiresAt: offer.expiresAt,
                offeredAt: offer.offeredAt,
                offeredBy: offer.offeredBy,
                toUserId: offer.toUserId,
                workspaceId: offer.workspaceId,
              })),
            },
            orders: made.orders.map((order) => ({
              consentVersion: order.consentVersion,
              createdAt: order.createdAt,
              interval: order.interval,
              plan: order.plan,
              trial: order.trial,
              usedAt: Option.getOrNull(order.usedAt),
              workspaceId: Option.getOrNull(order.workspaceId),
            })),
            requests: asked.map((request) => ({
              channel: request.channel,
              contract: Option.getOrNull(request.contract),
              desiredAt: Option.getOrNull(request.desiredAt),
              effectiveAt: Option.getOrNull(request.effectiveAt),
              email: Option.getOrNull(request.email),
              kind: request.kind,
              name: Option.getOrNull(request.name),
              receivedAt: request.receivedAt,
              refunded: Option.getOrNull(request.refunded),
              refusal: Option.getOrNull(request.refusal),
              status: request.status,
              workspaceId: Option.getOrNull(request.workspaceId),
            })),
            withdrawals: made.withdrawals.map((withdrawal) => ({
              refunded: withdrawal.refunded,
              requestedAt: withdrawal.requestedAt,
              workspaceId: Option.getOrNull(withdrawal.workspaceId),
            })),
          };

          return record;
        }
      );

      const exportWorkspace = Effect.fn("BillingRecords.exportWorkspace")(
        function* exportWorkspace(workspaceId: WorkspaceId) {
          const held = yield* subscriptions.ofWorkspace(workspaceId);
          const counted = yield* metered.ofWorkspace(workspaceId);
          const used = yield* usage.allOf(workspaceId);

          const record: BillingRecord = {
            meteredPosts: counted.map((count) => ({
              month: count.month,
              platform: count.platform,
              posts: count.posts,
              postsWithLinks: count.postsWithLinks,
            })),
            plan: enabled ? Option.getOrNull(entitlementsOf(held).plan) : null,
            subscriptions: held.map((subscription) => ({
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              currentPeriodEnd: Option.getOrNull(subscription.currentPeriodEnd),
              plan: subscription.plan,
              status: subscription.status,
            })),
            usage: used.map((entry) => ({
              day: DateTime.formatIsoDateUtc(entry.day),
              dimension: entry.dimension,
              meter: entry.meter,
              quantity: entry.quantity,
            })),
          };

          return record;
        }
      );

      // What billing's records say still bills, and whether a checkout the
      // plugin holds may.
      const billedOf = Effect.fn("BillingRecords.billedOf")(function* billedOf(
        workspaceId: WorkspaceId
      ) {
        const held = yield* subscriptions.ofWorkspace(workspaceId);
        const started = yield* checkouts.statuses(workspaceId);

        return {
          billed: held.filter((subscription) => stillBills(subscription)),
          checkedOut: started.some(mayBill),
        };
      });

      const billedBy = Effect.fn("BillingRecords.billedBy")(function* billedBy(
        workspaceId: WorkspaceId
      ) {
        if (!enabled) {
          const none: readonly BilledSubscription[] = [];

          return none;
        }

        return describe(yield* billedOf(workspaceId));
      });

      const settleWorkspace = Effect.fn("BillingRecords.settleWorkspace")(
        function* settleWorkspace(
          workspaceId: WorkspaceId,
          options: ErasureOptions = refuseBilled
        ) {
          const settled: ErasedBilling = { subscriptionsCancelled: 0 };

          // A server that does not bill never refuses, nor calls Stripe.
          if (!enabled) {
            return settled;
          }

          const found = yield* billedOf(workspaceId);
          const described = describe(found);

          const refused = new WorkspaceStillBilled({
            subscriptions: described,
            workspaceId,
          });

          if (!options.cancelSubscriptions && described.length > 0) {
            return yield* refused;
          }

          // None can complete now: whatever completed before started a
          // subscription that Stripe holds, its events or not.
          yield* checkouts.expireOpen(workspaceId);

          if (!options.cancelSubscriptions) {
            if ((yield* checkouts.atStripe(workspaceId)).some(mayBill)) {
              return yield* new WorkspaceStillBilled({
                subscriptions: [undescribed],
                workspaceId,
              });
            }

            return settled;
          }

          const subscriptionsCancelled = yield* checkouts.cancelBilled(
            workspaceId,
            {
              known: found.billed.map(
                ({ stripeSubscriptionId }) => stripeSubscriptionId
              ),
              mayBill,
            }
          );

          const cancelled: ErasedBilling = { subscriptionsCancelled };

          return cancelled;
        }
      );

      const eraseWorkspace = Effect.fn("BillingRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId: WorkspaceId) {
          // Stripe decides: billing's records wait for the events of what
          // settling cancelled.
          if (
            enabled &&
            (yield* checkouts.atStripe(workspaceId)).some(mayBill)
          ) {
            yield* new WorkspaceStillBilled({
              subscriptions: [undescribed],
              workspaceId,
            });
          }

          yield* subscriptions.eraseWorkspace(workspaceId);
          yield* metered.eraseWorkspace(workspaceId);
          yield* usage.eraseWorkspace(workspaceId);
          // Its requests stay without it, as its orders do; its contract
          // numbers find nothing more.
          yield* requests.eraseWorkspace(workspaceId);
          yield* references.eraseWorkspace(workspaceId);
          // Its billing account: another of its workspaces bills from now,
          // or the account goes with its last workspace.
          yield* accounts.eraseWorkspace(workspaceId);
        }
      );

      return BillingRecords.of({
        billedBy,
        eraseWorkspace,
        exportUser,
        exportWorkspace,
        forgetUser: (userId, pseudonym) =>
          subscriptions.forgetUser(userId, pseudonym).pipe(
            Effect.andThen(requests.forgetUser(userId)),
            // The accounts they paid for: the workspaces left go to their
            // oldest owner left.
            Effect.andThen(accounts.forgetPayer(userId, pseudonym))
          ),
        settleWorkspace,
      });
    })
  );
}
