import type { InsightDay } from "./insight-day.ts";
import type { SyncedAdSet } from "./synced-ad-set.ts";
import type { SyncedAd } from "./synced-ad.ts";
import type { SyncedCampaign } from "./synced-campaign.ts";

/** Everything a sync read of one account. */
export interface AccountSnapshot {
  readonly adSets: readonly SyncedAdSet[];
  readonly ads: readonly SyncedAd[];
  readonly campaigns: readonly SyncedCampaign[];
  readonly insights: readonly InsightDay[];
}
