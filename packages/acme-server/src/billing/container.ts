import { Layer } from "effect";

import { BillingOverview } from "#billing/application/billing-overview.ts";
import { RecordSubscription } from "#billing/application/record-subscription.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ConfiguredBillingModeLive } from "#billing/infrastructure/configured-billing-mode.ts";
import { ContextWorkspaceUsageLive } from "#billing/infrastructure/context-workspace-usage.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";

/**
 * The billing context's use cases for the other contexts: what each
 * workspace's plan allows (WorkspaceEntitlements), and the subscriptions
 * Stripe's webhook reports (RecordSubscription). Billing is on when the
 * server has a Stripe key, read when it starts. Needs the database (Drizzle
 * and SqlClient), migrated.
 */
export const BillingLive = Layer.mergeAll(
  WorkspaceEntitlements.layer,
  RecordSubscription.layer
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
