import { Layer } from "effect";

import { BillingOverview } from "#billing/application/billing-overview.ts";
import { BillingRecords } from "#billing/application/billing-records.ts";
import { CancelSubscription } from "#billing/application/cancel-subscription.ts";
import { CheckoutOrders } from "#billing/application/checkout-orders.ts";
import { MeteredPosts } from "#billing/application/metered-posts.ts";
import { PlaceOrder } from "#billing/application/place-order.ts";
import { PurgeContractRecords } from "#billing/application/purge-contract-records.ts";
import { RecordSubscription } from "#billing/application/record-subscription.ts";
import { SendBillingReminders } from "#billing/application/send-billing-reminders.ts";
import { Withdraw } from "#billing/application/withdraw.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { billingReminders } from "#billing/infrastructure/billing-reminders-cron.ts";
import { ConfiguredBillingModeLive } from "#billing/infrastructure/configured-billing-mode.ts";
import { ContextWorkspaceUsageLive } from "#billing/infrastructure/context-workspace-usage.ts";
import { contractRetention } from "#billing/infrastructure/contract-retention-cron.ts";
import { DrizzleContractRecordsLive } from "#billing/infrastructure/drizzle-contract-records.ts";
import { DrizzleMeteredPostLedgerLive } from "#billing/infrastructure/drizzle-metered-post-ledger.ts";
import { DrizzleOrdersLive } from "#billing/infrastructure/drizzle-orders.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { DrizzleTrialsLive } from "#billing/infrastructure/drizzle-trials.ts";
import { DrizzleWithdrawalsLive } from "#billing/infrastructure/drizzle-withdrawals.ts";
import { NotifiedBillingNoticesLive } from "#billing/infrastructure/notified-billing-notices.ts";
import { StripeContractsLive } from "#billing/infrastructure/stripe-contracts-live.ts";
import { KeyedPseudonymsLive } from "#shared/infrastructure/keyed-pseudonyms.ts";

const RecordsLive = Layer.mergeAll(
  DrizzleContractRecordsLive,
  DrizzleSubscriptionsLive,
  DrizzleOrdersLive,
  DrizzleTrialsLive,
  DrizzleMeteredPostLedgerLive,
  ConfiguredBillingModeLive
);

/**
 * The billing context's use cases for the other contexts: what each
 * workspace's plan allows (WorkspaceEntitlements), the subscriptions
 * Stripe's webhook reports (RecordSubscription), the orders a checkout
 * needs (CheckoutOrders), the posts each workspace makes on platforms that
 * bill per post, which publishing reports (MeteredPosts), and what billing
 * keeps of a workspace, for the workspace context's exports and erasures
 * (BillingRecords), which refuse one Stripe may still bill. Recording a
 * subscription calls Stripe too, to keep trials from charging and to end
 * a trial a paid plan replaces. Billing is on
 * when the server has a Stripe key, read when it starts. Needs the database
 * (Drizzle and SqlClient), migrated, and the Checkouts the sign-in
 * service's Stripe plugin keeps, which the composition root brings from the
 * workspace context.
 */
export const BillingLive = Layer.mergeAll(
  WorkspaceEntitlements.layer,
  RecordSubscription.layer,
  CheckoutOrders.layer,
  BillingRecords.layer,
  MeteredPosts.layer,
  PurgeContractRecords.layer
).pipe(
  Layer.provide(
    Layer.mergeAll(RecordsLive, StripeContractsLive, KeyedPseudonymsLive)
  )
);

/**
 * The billing page's use cases: a workspace's plan and what it uses of
 * it, counted by the channels, publishing, media, workspace and assistant
 * contexts; ordering, cancelling and withdrawing, which call Stripe and
 * tell members through the notifications context; and the daily
 * reminders. The composition root provides those contexts, Ids and the
 * TransactionRunner, with BillingLive.
 */
export const BillingOverviewLive = Layer.mergeAll(
  BillingOverview.layer.pipe(Layer.provide(ContextWorkspaceUsageLive)),
  PlaceOrder.layer,
  CancelSubscription.layer,
  Withdraw.layer,
  SendBillingReminders.layer
).pipe(
  Layer.provide(
    Layer.mergeAll(
      RecordsLive,
      DrizzleWithdrawalsLive,
      StripeContractsLive,
      NotifiedBillingNoticesLive
    )
  )
);

/**
 * The billing context's crons: the hourly confirmations and reminders, and
 * the daily purge of erased workspaces' contract records.
 */
export const BillingCronsLive = Layer.mergeAll(
  billingReminders,
  contractRetention
);

// The billing endpoints. They need the use cases BillingOverviewLive
// provides, and the Authentication and WorkspaceAccess middleware of the
// workspace context, which the composition root brings.
export { BillingHandlers as BillingApiLive } from "#billing/api/billing.ts";

export { BillingActionsHandlers as BillingActionsApiLive } from "#billing/api/billing-actions.ts";
