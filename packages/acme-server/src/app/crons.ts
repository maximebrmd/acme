import { Layer } from "effect";

import { ChannelsCronsLive } from "#channels/container.ts";
import { ClusterRetentionCron } from "#shared/infrastructure/cluster-retention.ts";

/**
 * Every ClusterCron the server runs. Each cron's name is part of the stored
 * state (its runs are persisted messages for `ClusterCron/<name>`), so a
 * renamed cron starts a new chain and leaves the old one's runs to be retried
 * with warnings: keep names once released.
 */
export const CronsLive = Layer.mergeAll(
  ClusterRetentionCron,
  ChannelsCronsLive
);
