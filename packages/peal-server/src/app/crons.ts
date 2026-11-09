import { Layer } from "effect";

import { AnalyticsCronsLive } from "#analytics/container.ts";
import { ChannelsCronsLive } from "#channels/container.ts";
import { LegalCronsLive } from "#legal/container.ts";
import { ClusterRetentionCron } from "#shared/infrastructure/cluster-retention.ts";
import { StaffCronsLive } from "#staff/container.ts";

/**
 * Every ClusterCron the server runs. Each cron's name is part of the stored
 * state (its runs are persisted messages for `ClusterCron/<name>`), so a
 * renamed cron starts a new chain and leaves the old one's runs to be retried
 * with warnings: keep names once released.
 */
export const CronsLive = Layer.mergeAll(
  ClusterRetentionCron,
  ChannelsCronsLive,
  AnalyticsCronsLive,
  StaffCronsLive,
  LegalCronsLive
);
