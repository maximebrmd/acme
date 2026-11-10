import { Layer } from "effect";

import { ActivityCronsLive } from "#activity/container.ts";
import { AdsCronsLive } from "#ads/container.ts";
import { AnalyticsCronsLive } from "#analytics/container.ts";
import { BillingCronsLive } from "#billing/container.ts";
import { ChannelsCronsLive } from "#channels/container.ts";
import { EngagementCronsLive } from "#engagement/container.ts";
import { LegalCronsLive } from "#legal/container.ts";
import { PublishingCronsLive } from "#publishing/container.ts";
import { ReviewCronsLive } from "#review/container.ts";
import { ClusterRetentionCron } from "#shared/infrastructure/cluster-retention.ts";
import { StaffCronsLive } from "#staff/container.ts";
import { WebhooksCronsLive } from "#webhooks/container.ts";
import { WorkspaceCronsLive } from "#workspace/container.ts";

/**
 * Every ClusterCron the server runs. Each cron's name is part of the stored
 * state (its runs are persisted messages for `ClusterCron/<name>`), so a
 * renamed cron starts a new chain and leaves the old one's runs to be retried
 * with warnings: keep names once released.
 */
export const CronsLive = Layer.mergeAll(
  ClusterRetentionCron,
  ActivityCronsLive,
  AdsCronsLive,
  ChannelsCronsLive,
  PublishingCronsLive,
  AnalyticsCronsLive,
  EngagementCronsLive,
  StaffCronsLive,
  BillingCronsLive,
  LegalCronsLive,
  ReviewCronsLive,
  WebhooksCronsLive,
  WorkspaceCronsLive
);
