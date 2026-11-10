import { Layer } from "effect";

import { AdConnections } from "#ads/application/ad-connections.ts";
import { AdReports } from "#ads/application/ad-reports.ts";
import { BoostFollowUp } from "#ads/application/boost-follow-up.ts";
import { BoostOperations } from "#ads/application/boost-operations.ts";
import { Boosts } from "#ads/application/boosts.ts";
import { AdAllowance } from "#ads/application/ports/ad-allowance.ts";
import { PurgeAdData } from "#ads/application/purge-ad-data.ts";
import { SpendAuthorizations } from "#ads/application/spend-authorizations.ts";
import { SyncAccount } from "#ads/application/sync-account.ts";
import { SyncAdAccounts } from "#ads/application/sync-ad-accounts.ts";

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
