import { Layer } from "effect";

import { BillingOverview } from "#billing/application/billing-overview.ts";
import { BillingRecords } from "#billing/application/billing-records.ts";
import { RecordSubscription } from "#billing/application/record-subscription.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ConfiguredBillingModeLive } from "#billing/infrastructure/configured-billing-mode.ts";
import { ContextWorkspaceUsageLive } from "#billing/infrastructure/context-workspace-usage.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";

/**
 * The billing context's use cases for the other contexts: what each
 * workspace's plan allows (WorkspaceEntitlements), the subscriptions
 * Stripe's webhook reports (RecordSubscription), and what billing keeps of
 * a workspace, for the workspace context's exports and erasures
 * (BillingRecords), which refuse one Stripe may still bill. Billing is on
 * when the server has a Stripe key, read when it starts. Needs the database
 * (Drizzle and SqlClient), migrated, and the Checkouts the sign-in
 * service's Stripe plugin keeps, which the composition root brings from the
 * workspace context.
 */
export const BillingLive = Layer.mergeAll(
  WorkspaceEntitlements.layer,
  RecordSubscription.layer,
  BillingRecords.layer
).pipe(
  Layer.provide(
    Layer.mergeAll(DrizzleSubscriptionsLive, ConfiguredBillingModeLive)
  )
);

/**
 * The billing page's use case: a workspace's plan and what it uses of it,
 * counted by the channels, publishing, workspace and assistant contexts,
 * which the composition root provides with BillingLive.
 */
export const BillingOverviewLive = BillingOverview.layer.pipe(
  Layer.provide(ContextWorkspaceUsageLive)
);

// The billing endpoint. It needs the use case BillingOverviewLive provides,
// and the Authentication and WorkspaceAccess middleware of the workspace
// context, which the composition root brings.
export { BillingHandlers as BillingApiLive } from "#billing/api/billing.ts";
