import { Effect, Layer } from "effect";

import { AccountDays } from "#billing/application/account-days.ts";
import { AccountViews } from "#billing/application/account-views.ts";
import { BillingAccountDesk } from "#billing/application/billing-account-desk.ts";
import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { BillingOverview } from "#billing/application/billing-overview.ts";
import { BillingRecords } from "#billing/application/billing-records.ts";
import { CancelSubscription } from "#billing/application/cancel-subscription.ts";
import { CheckoutOrders } from "#billing/application/checkout-orders.ts";
import { ConfirmContractRequest } from "#billing/application/confirm-contract-request.ts";
import { ContractRequestDesk } from "#billing/application/contract-request-desk.ts";
import { GraceWarningLive } from "#billing/application/grace-warning.ts";
import { MeteredPosts } from "#billing/application/metered-posts.ts";
import { PlaceOrder } from "#billing/application/place-order.ts";
import { UsageAtCheckout } from "#billing/application/ports/usage-at-checkout.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { PurgeContractRecords } from "#billing/application/purge-contract-records.ts";
import { ReceiveContractRequest } from "#billing/application/receive-contract-request.ts";
import { ReceiveMeterErrors } from "#billing/application/receive-meter-errors.ts";
import { RecordSubscription } from "#billing/application/record-subscription.ts";
import { RecordedUsage } from "#billing/application/recorded-usage.ts";
import { ReduceWorkspace } from "#billing/application/reduce-workspace.ts";
import { ReportUsage } from "#billing/application/report-usage.ts";
import { SendBillingReminders } from "#billing/application/send-billing-reminders.ts";
import { SettleContractRequest } from "#billing/application/settle-contract-request.ts";
import { SnapshotUsage } from "#billing/application/snapshot-usage.ts";
import { SpendCeilings } from "#billing/application/spend-ceilings.ts";
import { StartAccountDays } from "#billing/application/start-account-days.ts";
import { TransferWorkspace } from "#billing/application/transfer-workspace.ts";
import { UsageReports } from "#billing/application/usage-reports.ts";
import { Withdraw } from "#billing/application/withdraw.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { WorkspaceStanding } from "#billing/application/workspace-standing.ts";
import { XPassThrough } from "#billing/application/x-pass-through.ts";
import { AccountPlanHoldersLive } from "#billing/infrastructure/account-plan-holders.ts";
import { AccountPlanPoolsLive } from "#billing/infrastructure/account-plan-pools.ts";
import { AuditedAccountDeskLive } from "#billing/infrastructure/audited-account-desk.ts";
import { AuditedRequestReviewLive } from "#billing/infrastructure/audited-request-review.ts";
import { billingReminders } from "#billing/infrastructure/billing-reminders-cron.ts";
import { ConfiguredBillingModeLive } from "#billing/infrastructure/configured-billing-mode.ts";
import { ContextAccountChannelsLive } from "#billing/infrastructure/context-account-channels.ts";
import { ContextMemberAddressesLive } from "#billing/infrastructure/context-member-addresses.ts";
import { ContextUsageStatesLive } from "#billing/infrastructure/context-usage-states.ts";
import { ContextWorkspaceHoldingsLive } from "#billing/infrastructure/context-workspace-holdings.ts";
import { ContextWorkspaceUsageLive } from "#billing/infrastructure/context-workspace-usage.ts";
import { contractRequests } from "#billing/infrastructure/contract-requests-cron.ts";
import { contractRetention } from "#billing/infrastructure/contract-retention-cron.ts";
import { DrizzleAccountDayStoreLive } from "#billing/infrastructure/drizzle-account-day-store.ts";
import { DrizzleBillingAccountStoreLive } from "#billing/infrastructure/drizzle-billing-account-store.ts";
import { DrizzleContractRecordsLive } from "#billing/infrastructure/drizzle-contract-records.ts";
import { DrizzleContractRequestsLive } from "#billing/infrastructure/drizzle-contract-requests.ts";
import { DrizzleMeterUsageStoreLive } from "#billing/infrastructure/drizzle-meter-usage-store.ts";
import { DrizzleMeteredPostLedgerLive } from "#billing/infrastructure/drizzle-metered-post-ledger.ts";
import { DrizzleOrdersLive } from "#billing/infrastructure/drizzle-orders.ts";
import { DrizzleStripeEventLedgerLive } from "#billing/infrastructure/drizzle-stripe-event-ledger.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { DrizzleTrialsLive } from "#billing/infrastructure/drizzle-trials.ts";
import { DrizzleUsageLedgerLive } from "#billing/infrastructure/drizzle-usage-ledger.ts";
import { DrizzleWithdrawalsLive } from "#billing/infrastructure/drizzle-withdrawals.ts";
import { EmailedRequestMailLive } from "#billing/infrastructure/emailed-request-mail.ts";
import { KeyedContractReferencesLive } from "#billing/infrastructure/keyed-contract-references.ts";
import { MeteredUsageLive } from "#billing/infrastructure/metered-usage-live.ts";
import { NotifiedBillingNoticesLive } from "#billing/infrastructure/notified-billing-notices.ts";
import { PlanUpgradePathsLive } from "#billing/infrastructure/plan-upgrade-paths.ts";
import { RandomRequestTokensLive } from "#billing/infrastructure/random-request-tokens.ts";
import { StripeContractsLive } from "#billing/infrastructure/stripe-contracts-live.ts";
import { StripeMeterErrorEventsLive } from "#billing/infrastructure/stripe-meter-error-events.ts";
import { StripeUsageBillingLive } from "#billing/infrastructure/stripe-usage-billing.ts";
import { usageReporting } from "#billing/infrastructure/usage-report-cron.ts";
import { usageSnapshot } from "#billing/infrastructure/usage-snapshot-cron.ts";
import { WorkspaceAccountPayersLive } from "#billing/infrastructure/workspace-account-payers.ts";
import { WorkspaceContractHoldersLive } from "#billing/infrastructure/workspace-contract-holders.ts";
import { WorkspacePartnerTenancyLive } from "#billing/infrastructure/workspace-partner-tenancy.ts";
import { KeyedPseudonymsLive } from "#shared/infrastructure/keyed-pseudonyms.ts";

const RecordsLive = Layer.mergeAll(
  DrizzleContractRecordsLive,
  DrizzleContractRequestsLive,
  KeyedContractReferencesLive,
  DrizzleSubscriptionsLive,
  DrizzleOrdersLive,
  DrizzleTrialsLive,
  DrizzleMeteredPostLedgerLive,
  DrizzleUsageLedgerLive,
  DrizzleAccountDayStoreLive,
  DrizzleMeterUsageStoreLive,
  ConfiguredBillingModeLive
);

// Who pays for each workspace: its billing account, which the workspace
// context's PartnerOwnership and WorkspaceOwners decide.
const AccountStoresLive = Layer.mergeAll(
  DrizzleBillingAccountStoreLive,
  WorkspaceAccountPayersLive,
  DrizzleSubscriptionsLive
);

const AccountsLive = BillingAccounts.layer.pipe(
  Layer.provide(Layer.merge(AccountStoresLive, KeyedPseudonymsLive))
);

// Starting each billing account's day, and raising one's after a
// subscription or a move, from the channels the channels context counts.
const StartDaysLive = StartAccountDays.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      ContextAccountChannelsLive,
      DrizzleBillingAccountStoreLive,
      ConfiguredBillingModeLive
    )
  )
);

// What a workspace's billing page and standing say of its account, and
// handing a workspace to another payer, which counts the channels the
// channels context holds.
const AccountActionsLive = Layer.mergeAll(
  AccountViews.layer,
  TransferWorkspace.layer
).pipe(
  Layer.provide(
    Layer.mergeAll(
      AccountsLive,
      AccountStoresLive,
      ContextAccountChannelsLive,
      StartDaysLive
    )
  )
);

// Whose plan each workspace is on: its billing account's billing workspace.
const HoldersLive = AccountPlanHoldersLive.pipe(
  Layer.provide(Layer.merge(AccountsLive, ConfiguredBillingModeLive))
);

// Each billing account's accounts by day, and the outbox to Stripe they
// are reported through, which the channels context counts in.
const AccountDaysLive = AccountDays.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      DrizzleAccountDayStoreLive,
      HoldersLive,
      DrizzleSubscriptionsLive,
      StripeUsageBillingLive,
      ConfiguredBillingModeLive
    )
  )
);

/**
 * The billing context's use cases for the other contexts: what each
 * workspace's plan allows (WorkspaceEntitlements), the subscriptions
 * Stripe's webhook reports (RecordSubscription), the orders a checkout
 * needs (CheckoutOrders), the posts each workspace makes on platforms that
 * bill per post, which publishing reports (MeteredPosts), the usage
 * ledger's counts of what happens, each post that went out among them
 * (RecordedUsage), and what billing
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
  AccountPlanPoolsLive,
  RecordSubscription.layer,
  CheckoutOrders.layer,
  BillingRecords.layer,
  MeteredPosts.layer,
  RecordedUsage.layer,
  PurgeContractRecords.layer,
  PlanUpgradePathsLive.pipe(
    Layer.provide(WorkspaceEntitlements.layerShared),
    Layer.provide(HoldersLive)
  )
).pipe(
  Layer.provide(
    Layer.mergeAll(
      RecordsLive,
      StripeContractsLive,
      StripeUsageBillingLive,
      KeyedPseudonymsLive,
      UsageAtCheckout.layer,
      HoldersLive,
      DrizzleBillingAccountStoreLive,
      WorkspaceAccountPayersLive
    )
  ),
  // The billing accounts, which the other contexts read too, whether the
  // server bills, which the channels context's allowance asks before
  // counting across a billing account, and the account-days it counts in.
  Layer.provideMerge(
    Layer.mergeAll(AccountsLive, ConfiguredBillingModeLive, AccountDaysLive)
  )
);

/**
 * The meters every context claims through (`MeteredUsage`): each billing
 * account's units by month, its allowances and ceilings, the usage
 * ledger's counters, the outbox to Stripe, and the notice to its billing
 * managers when a meter pauses a free account. On a server that does not
 * bill, nothing is counted or refused. The composition root provides the
 * notifications context's Notify, PartnerOwnership and WorkspaceOwners
 * (whose plan a workspace is on), Ids and the TransactionRunner.
 */
export const BillingMetersLive = MeteredUsageLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      RecordsLive,
      HoldersLive,
      StripeUsageBillingLive,
      NotifiedBillingNoticesLive
    )
  )
);

/**
 * Whether each workspace reads X at X's rates on a server that bills
 * (`XPassThrough`), for the analytics context's readers. Needs the database.
 */
export const BillingXPassThroughLive = XPassThrough.layer.pipe(
  Layer.provide(RecordsLive)
);

// Hands the checkout the counts of what each workspace holds, once the
// contexts that count are built (see UsageAtCheckout).
const UsageAtCheckoutBound = Layer.effectDiscard(
  Effect.gen(function* bindUsage() {
    const atCheckout = yield* UsageAtCheckout;

    yield* atCheckout.bind(yield* WorkspaceUsage);
  })
).pipe(Layer.provide(UsageAtCheckout.layer));

// Gives the account-days the count of a holder's pool, once the channels
// context is built, so a subscription recorded mid-day reports the pool.
const PoolBound = Layer.effectDiscard(
  Effect.gen(function* bindPool() {
    const days = yield* AccountDays;
    const start = yield* StartAccountDays;

    yield* days.bindPool(start.pooledOf);
  })
).pipe(Layer.provide(StartDaysLive));

/**
 * The billing page's use cases: a workspace's plan and what it uses of
 * it, counted by the channels, publishing, media, workspace and assistant
 * contexts; where it stands against that plan, and choosing what stays
 * when it is over it, through the channels and workspace contexts;
 * ordering, cancelling and withdrawing, which call Stripe and
 * tell members through the notifications context; the daily
 * reminders; and every workspace's usage, day by day, which those
 * contexts count too: its daily snapshot and its report, which says whose
 * plan a partner's workspace is on (the workspace context's
 * PartnerOwnership), and a partner's per customer, from the workspaces the
 * workspace context's PartnerTenants says it holds. The composition root
 * provides those contexts, PartnerTenants, Ids and the TransactionRunner,
 * with BillingLive.
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
  ReportUsage.layer,
  SpendCeilings.layer,
  XPassThrough.layer,
  // Stripe's reports of meter events it took and could not count.
  ReceiveMeterErrors.layer.pipe(
    Layer.provide(
      Layer.merge(StripeMeterErrorEventsLive, DrizzleStripeEventLedgerLive)
    )
  ),
  // Today's account-days start with the snapshot and every hour.
  SnapshotUsage.layer.pipe(Layer.provideMerge(StartDaysLive)),
  PoolBound,
  UsageReports.layer,
  UsageAtCheckoutBound,
  AccountActionsLive,
  // The start's warning about a free tier over its accounts, without a
  // grace: read through the standing, once built.
  GraceWarningLive.pipe(Layer.provide(WorkspaceStanding.layer))
).pipe(
  Layer.provide(
    Layer.mergeAll(
      RecordsLive,
      ContextUsageStatesLive,
      HoldersLive,
      AccountsLive,
      DrizzleBillingAccountStoreLive,
      WorkspaceAccountPayersLive,
      DrizzleWithdrawalsLive,
      StripeContractsLive,
      StripeUsageBillingLive,
      NotifiedBillingNoticesLive,
      ContextWorkspaceUsageLive.pipe(Layer.provide(ConfiguredBillingModeLive)),
      ContextMemberAddressesLive,
      ContextAccountChannelsLive,
      KeyedPseudonymsLive,
      WorkspacePartnerTenancyLive
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
 * What staff do about one free tier per person: the platform accounts
 * under several free billing accounts, merging accounts and requiring a
 * payment method. The composition root provides the channels context's
 * SharedPlatformAccounts and ChannelUsage, the workspace context's
 * PartnerOwnership and WorkspaceOwners, the staff context's
 * BillingAccountAudit, Ids and the TransactionRunner.
 */
export const BillingAccountsDeskLive = BillingAccountDesk.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      AccountsLive,
      AccountStoresLive,
      KeyedPseudonymsLive,
      ContextAccountChannelsLive,
      AuditedAccountDeskLive,
      StartDaysLive
    )
  )
);

/**
 * The billing context's crons: the hourly confirmations and reminders, the
 * daily purge of erased workspaces' contract records, the daily snapshot
 * of every workspace's usage, and, on a server that bills only, the
 * reporter of usage to Stripe and its daily step.
 */
export const BillingCronsLive = Layer.mergeAll(
  billingReminders,
  contractRequests,
  contractRetention,
  usageSnapshot,
  usageReporting
);

// The billing endpoints. They need the use cases BillingOverviewLive
// provides, and the Authentication and WorkspaceAccess middleware of the
// workspace context, which the composition root brings.
export { BillingHandlers as BillingApiLive } from "#billing/api/billing.ts";

export { BillingActionsHandlers as BillingActionsApiLive } from "#billing/api/billing-actions.ts";

export {
  UsageHandlers as UsageApiLive,
  PartnerUsageHandlers as PartnerUsageApiLive,
} from "#billing/api/usage.ts";

// The check of Stripe's prices a server that bills makes when it starts.
export { StripePricesCheckedLive } from "#billing/infrastructure/stripe-prices-checked.ts";

// The staff console's requests. They need ContractRequestsLive, and the
// StaffAccess middleware of the workspace context.
export { ContractRequestsDeskHandlers as ContractRequestsDeskApiLive } from "#billing/api/contract-requests-desk.ts";

// The staff console's billing accounts. They need BillingAccountsDeskLive,
// and the StaffAccess middleware of the workspace context.
export { BillingAccountsDeskHandlers as BillingAccountsDeskApiLive } from "#billing/api/billing-accounts-desk.ts";
