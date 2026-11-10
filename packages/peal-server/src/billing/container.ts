import { Effect, Layer } from "effect";

import { BillingOverview } from "#billing/application/billing-overview.ts";
import { BillingRecords } from "#billing/application/billing-records.ts";
import { CancelSubscription } from "#billing/application/cancel-subscription.ts";
import { CheckoutOrders } from "#billing/application/checkout-orders.ts";
import { ConfirmContractRequest } from "#billing/application/confirm-contract-request.ts";
import { ContractRequestDesk } from "#billing/application/contract-request-desk.ts";
import { MeteredPosts } from "#billing/application/metered-posts.ts";
import { PlaceOrder } from "#billing/application/place-order.ts";
import { UsageAtCheckout } from "#billing/application/ports/usage-at-checkout.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { PurgeContractRecords } from "#billing/application/purge-contract-records.ts";
import { ReceiveContractRequest } from "#billing/application/receive-contract-request.ts";
import { RecordSubscription } from "#billing/application/record-subscription.ts";
import { ReduceWorkspace } from "#billing/application/reduce-workspace.ts";
import { SendBillingReminders } from "#billing/application/send-billing-reminders.ts";
import { SettleContractRequest } from "#billing/application/settle-contract-request.ts";
import { Withdraw } from "#billing/application/withdraw.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { WorkspaceStanding } from "#billing/application/workspace-standing.ts";
import { AuditedRequestReviewLive } from "#billing/infrastructure/audited-request-review.ts";
import { billingReminders } from "#billing/infrastructure/billing-reminders-cron.ts";
import { ConfiguredBillingModeLive } from "#billing/infrastructure/configured-billing-mode.ts";
import { ContextMemberAddressesLive } from "#billing/infrastructure/context-member-addresses.ts";
import { ContextWorkspaceHoldingsLive } from "#billing/infrastructure/context-workspace-holdings.ts";
import { ContextWorkspaceUsageLive } from "#billing/infrastructure/context-workspace-usage.ts";
import { contractRequests } from "#billing/infrastructure/contract-requests-cron.ts";
import { contractRetention } from "#billing/infrastructure/contract-retention-cron.ts";
import { DrizzleContractRecordsLive } from "#billing/infrastructure/drizzle-contract-records.ts";
import { DrizzleContractRequestsLive } from "#billing/infrastructure/drizzle-contract-requests.ts";
import { DrizzleMeteredPostLedgerLive } from "#billing/infrastructure/drizzle-metered-post-ledger.ts";
import { DrizzleOrdersLive } from "#billing/infrastructure/drizzle-orders.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { DrizzleTrialsLive } from "#billing/infrastructure/drizzle-trials.ts";
import { DrizzleWithdrawalsLive } from "#billing/infrastructure/drizzle-withdrawals.ts";
import { EmailedRequestMailLive } from "#billing/infrastructure/emailed-request-mail.ts";
import { KeyedContractReferencesLive } from "#billing/infrastructure/keyed-contract-references.ts";
import { NotifiedBillingNoticesLive } from "#billing/infrastructure/notified-billing-notices.ts";
import { PartnerPlanHoldersLive } from "#billing/infrastructure/partner-plan-holders.ts";
import { PlanUpgradePathsLive } from "#billing/infrastructure/plan-upgrade-paths.ts";
import { RandomRequestTokensLive } from "#billing/infrastructure/random-request-tokens.ts";
import { StripeContractsLive } from "#billing/infrastructure/stripe-contracts-live.ts";
import { WorkspaceContractHoldersLive } from "#billing/infrastructure/workspace-contract-holders.ts";
import { KeyedPseudonymsLive } from "#shared/infrastructure/keyed-pseudonyms.ts";

const RecordsLive = Layer.mergeAll(
  DrizzleContractRecordsLive,
  DrizzleContractRequestsLive,
  KeyedContractReferencesLive,
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
 * (BillingRecords), which refuse one Stripe may still bill, and the way
 * out of a limit every surface tells (UpgradePaths). Recording a
 * subscription calls Stripe too, to keep trials from charging and to end
 * a trial a paid plan replaces. Billing is on
 * when the server has a Stripe key, read when it starts. Needs the database
 * (Drizzle and SqlClient), migrated, and, from the workspace context, the
 * Checkouts the sign-in service's Stripe plugin keeps and PartnerOwnership,
 * which says whose plan a partner's workspace is on: the composition root
 * brings both.
 */
export const BillingLive = Layer.mergeAll(
  WorkspaceEntitlements.layerShared,
  RecordSubscription.layer,
  CheckoutOrders.layer,
  BillingRecords.layer,
  MeteredPosts.layer,
  PurgeContractRecords.layer,
  PlanUpgradePathsLive.pipe(Layer.provide(WorkspaceEntitlements.layerShared))
).pipe(
  Layer.provide(
    Layer.mergeAll(
      RecordsLive,
      StripeContractsLive,
      KeyedPseudonymsLive,
      UsageAtCheckout.layer,
      PartnerPlanHoldersLive
    )
  )
);

// Hands the checkout the counts of what each workspace holds, once the
// contexts that count are built (see UsageAtCheckout).
const UsageAtCheckoutBound = Layer.effectDiscard(
  Effect.gen(function* bindUsage() {
    const atCheckout = yield* UsageAtCheckout;

    yield* atCheckout.bind(yield* WorkspaceUsage);
  })
).pipe(Layer.provide(UsageAtCheckout.layer));

/**
 * The billing page's use cases: a workspace's plan and what it uses of
 * it, counted by the channels, publishing, media, workspace and assistant
 * contexts; where it stands against that plan, and choosing what stays
 * when it is over it, through the channels and workspace contexts;
 * ordering, cancelling and withdrawing, which call Stripe and
 * tell members through the notifications context; and the daily
 * reminders. The composition root provides those contexts, Ids and the
 * TransactionRunner, with BillingLive.
 */
export const BillingOverviewLive = Layer.mergeAll(
  BillingOverview.layer,
  ReduceWorkspace.layer.pipe(
    Layer.provideMerge(WorkspaceStanding.layer),
    Layer.provide(ContextWorkspaceHoldingsLive)
  ),
  PlaceOrder.layer,
  CancelSubscription.layer,
  Withdraw.layer,
  SendBillingReminders.layer,
  UsageAtCheckoutBound
).pipe(
  Layer.provide(
    Layer.mergeAll(
      RecordsLive,
      DrizzleWithdrawalsLive,
      StripeContractsLive,
      NotifiedBillingNoticesLive,
      ContextWorkspaceUsageLive,
      ContextMemberAddressesLive,
      KeyedPseudonymsLive
    )
  )
);

// Cancelling and withdrawing, which the functions below apply requests
// with.
const EndingsLive = Layer.mergeAll(
  CancelSubscription.layer,
  Withdraw.layer
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
 * The cancel and withdraw functions anyone reaches without signing in,
 * the link sent to a request's address, the requests that wait for staff,
 * and the sweep that takes up what the mail or Stripe could not take. The
 * composition root provides the notifications context (Notify and
 * SendAuthEmail), the workspace context's AccountLookup, the staff
 * context's ContractRequestAudit, Ids and the TransactionRunner.
 */
export const ContractRequestsLive = Layer.mergeAll(
  ReceiveContractRequest.layer,
  ConfirmContractRequest.layer,
  ContractRequestDesk.layer
).pipe(
  Layer.provide(SettleContractRequest.layer),
  Layer.provide(EndingsLive),
  Layer.provide(
    Layer.mergeAll(
      RecordsLive,
      WorkspaceContractHoldersLive,
      RandomRequestTokensLive,
      EmailedRequestMailLive,
      AuditedRequestReviewLive
    )
  ),
  // Whether the server bills, which the functions' settings answer.
  Layer.provideMerge(ConfiguredBillingModeLive)
);

/**
 * The billing context's crons: the hourly confirmations and reminders, and
 * the daily purge of erased workspaces' contract records.
 */
export const BillingCronsLive = Layer.mergeAll(
  billingReminders,
  contractRequests,
  contractRetention
);

// The billing endpoints. They need the use cases BillingOverviewLive
// provides, and the Authentication and WorkspaceAccess middleware of the
// workspace context, which the composition root brings.
export { BillingHandlers as BillingApiLive } from "#billing/api/billing.ts";

export { BillingActionsHandlers as BillingActionsApiLive } from "#billing/api/billing-actions.ts";

// The check of Stripe's prices a server that bills makes when it starts.
export { StripePricesCheckedLive } from "#billing/infrastructure/stripe-prices-checked.ts";

// The staff console's requests. They need ContractRequestsLive, and the
// StaffAccess middleware of the workspace context.
export { ContractRequestsDeskHandlers as ContractRequestsDeskApiLive } from "#billing/api/contract-requests-desk.ts";
