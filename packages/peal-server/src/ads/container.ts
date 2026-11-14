import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { AdConnections } from "#ads/application/ad-connections.ts";
import { AdOversight } from "#ads/application/ad-oversight.ts";
import { AdReports } from "#ads/application/ad-reports.ts";
import { BoostFollowUp } from "#ads/application/boost-follow-up.ts";
import { BoostOperations } from "#ads/application/boost-operations.ts";
import { Boosts } from "#ads/application/boosts.ts";
import { AdAllowance } from "#ads/application/ports/ad-allowance.ts";
import { PurgeAdData } from "#ads/application/purge-ad-data.ts";
import { SpendAuthorizations } from "#ads/application/spend-authorizations.ts";
import { SyncAccount } from "#ads/application/sync-account.ts";
import { SyncAdAccounts } from "#ads/application/sync-ad-accounts.ts";
import { AdGateLive } from "#ads/infrastructure/ad-gate.ts";
import { AdNetworksLive } from "#ads/infrastructure/ad-networks-live.ts";
import { AnalyticsOrganicCounts } from "#ads/infrastructure/analytics-organic-counts.ts";
import { CipherGrantSecrets } from "#ads/infrastructure/cipher-grant-secrets.ts";
import { DrizzleAccountStore } from "#ads/infrastructure/drizzle-account-store.ts";
import { DrizzleActiveAdMonths } from "#ads/infrastructure/drizzle-active-ad-months.ts";
import { DrizzleAdRecords } from "#ads/infrastructure/drizzle-ad-records.ts";
import { DrizzleBoostStore } from "#ads/infrastructure/drizzle-boost-store.ts";
import { DrizzleGrantStore } from "#ads/infrastructure/drizzle-grant-store.ts";
import { DrizzleReadModel } from "#ads/infrastructure/drizzle-read-model.ts";
import { PublishedPromotablePosts } from "#ads/infrastructure/published-promotable-posts.ts";
import { ToldAdNotices } from "#ads/infrastructure/told-ad-notices.ts";
import { WorkflowBoostJobs } from "#ads/infrastructure/workflow-boost-jobs.ts";
import { PlaceBoostV1Live } from "#ads/infrastructure/workflows/place-boost.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

/**
 * The ads context's use cases on `adapters`, which provide its ports: the
 * ad networks, the stores, the grants' secrets, the published posts, the
 * organic counts, the notices and the boosts' jobs; and on `gate`, which
 * runs a sync or a boost's requests one at a time per account (`GatedAds`
 * on the cluster, `DirectAds` without it) and is built on the operations
 * it runs. No plan limits ad accounts unless the adapters bring an
 * AdAllowance. Needs a TransactionRunner and Ids.
 */
export const adsWith = <ROut, E, R, GOut, GE, GR>(
  adapters: Layer.Layer<ROut, E, R>,
  gate: Layer.Layer<GOut, GE, GR>
) =>
  Layer.mergeAll(
    AdConnections.layer,
    SpendAuthorizations.layer,
    AdReports.layer,
    AdOversight.layer,
    Boosts.layer,
    SyncAdAccounts.layer,
    PurgeAdData.layer
  ).pipe(
    Layer.provideMerge(gate),
    Layer.provideMerge(
      Layer.mergeAll(BoostOperations.layer, SyncAccount.layer).pipe(
        Layer.provideMerge(BoostFollowUp.layer)
      )
    ),
    Layer.provideMerge(adapters),
    Layer.provide(AdAllowance.layerUnmetered)
  );

// The ad networks are the operator's choice, never a member's: called
// through the outbound guard all the same, which needs Dns.
const NetworksLive = AdNetworksLive.pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer)
);

const AdaptersLive = Layer.mergeAll(
  DrizzleActiveAdMonths,
  DrizzleGrantStore,
  DrizzleAccountStore,
  DrizzleBoostStore,
  DrizzleReadModel,
  CipherGrantSecrets,
  NetworksLive,
  PublishedPromotablePosts,
  AnalyticsOrganicCounts,
  ToldAdNotices,
  WorkflowBoostJobs
);

/**
 * The ads context as the server runs it, on `gate`: accounts, boosts and
 * what is read of the networks in Postgres, tokens on the channels
 * context's TokenCipher, Meta's Marketing API through the outbound guard,
 * the published posts publishing lists, the organic counts analytics
 * keeps, notices and webhook events through their contexts, and boosts
 * placed by PlaceBoostV1; with AdRecords, for the workspace context's
 * exports and erasures. Needs the database, migrated, a TransactionRunner,
 * Ids, the workflow engine, Dns, and the channels, publishing, analytics,
 * notifications and webhooks contexts, which the composition root
 * provides.
 */
export const adsLive = <GOut, GE, GR>(gate: Layer.Layer<GOut, GE, GR>) =>
  Layer.merge(adsWith(AdaptersLive, gate), DrizzleAdRecords);

export { DirectAds } from "#ads/infrastructure/direct-ads.ts";

export { GatedAds } from "#ads/infrastructure/ad-gate.ts";

/** What Meta's callbacks about a Facebook user reach in the ads context. */
export { AdsPlatformUserGrants } from "#ads/infrastructure/ads-platform-user-grants.ts";

// The ads endpoints. They need the use cases adsLive provides, and the
// Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export { AdsHandlers as AdsApiLive } from "#ads/api/ads.ts";

/**
 * Registers the accounts' gates and the workflow that places boosts. Needs
 * adsLive.
 */
export const AdsWorkersLive = Layer.merge(AdGateLive, PlaceBoostV1Live);

/** The hourly sync, the end of boosts and the daily retention. */
export { AdsCronsLive } from "#ads/infrastructure/crons.ts";

/**
 * Whether boosts show a published post, for publishing to ask before it
 * deletes the post from its platform. Needs the database alone.
 */
export { DrizzlePostBoosts as PostBoostsLive } from "#ads/infrastructure/drizzle-post-boosts.ts";
