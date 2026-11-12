import { Cron, Duration, Effect, Layer } from "effect";
import { ClusterCron } from "effect/cluster";

import { ConnectChannel } from "#channels/application/connect-channel.ts";
import { ForgetTokenOwners } from "#channels/application/forget-token-owners.ts";
import { PurgeConnectLinks } from "#channels/application/purge-connect-links.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { WarnChannelsNeedingReconnect } from "#channels/application/warn-channels-needing-reconnect.ts";

// How long a refresh run may take: it stops with time to spare before the
// next one, ten minutes after it, and says what it left.
const sweepBudget = Duration.minutes(8);

/**
 * Every ten minutes: refreshes the tokens due (each platform's policy says
 * when: how long before expiry, or, for those renewed as they are used, how
 * long unused), and forgets connection attempts nobody completed. A run
 * more than half an hour late is skipped: the next one does its work.
 */
export const TokenRefreshCron = ClusterCron.make({
  cron: Cron.parseUnsafe("*/10 * * * *", "UTC"),
  execute: Effect.gen(function* refreshTokens() {
    const report = yield* RefreshChannelTokens.use((refresh) =>
      refresh.sweep({ budget: sweepBudget })
    );

    if (report.due > 0 || report.left > 0) {
      yield* Effect.logInfo("Refreshed channel tokens", report);
    }

    yield* ConnectChannel.use((connect) => connect.purgeExpired);
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("The token refresh run failed", cause)
    )
  ),
  name: "channels.token-refresh",
  skipIfOlderThan: Duration.minutes(30),
});

/**
 * Every day at 08:00 UTC: warns workspaces of tokens that cannot be renewed
 * and are about to expire, marks those that did, and sends any reconnect
 * notice that could not be sent before.
 */
export const ReconnectWarningsCron = ClusterCron.make({
  cron: Cron.parseUnsafe("0 8 * * *", "UTC"),
  execute: WarnChannelsNeedingReconnect.use((warnings) => warnings.run).pipe(
    Effect.tap((report) => Effect.logInfo("Warned about channels", report))
  ),
  name: "channels.reconnect-warnings",
  skipIfOlderThan: Duration.hours(12),
});

/**
 * Every day at 04:31 UTC: forgets the connect links over for a month. A
 * failed run is logged and the next day's catches up.
 */
export const ConnectLinkRetentionCron = ClusterCron.make({
  cron: Cron.parseUnsafe("31 4 * * *", "UTC"),
  execute: PurgeConnectLinks.use((purging) => purging.run).pipe(
    Effect.tap((links) =>
      Effect.logInfo("Purged connect links past their retention").pipe(
        Effect.annotateLogs({ links })
      )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Purging connect links failed", cause)
    )
  ),
  name: "channels.connect-link-retention",
  skipIfOlderThan: Duration.hours(12),
});

/**
 * Every day at 04:29 UTC: where the inbox does not read LinkedIn, forgets
 * the members LinkedIn pages' tokens are theirs (`ForgetTokenOwners`). A
 * failed run is logged and the next day's catches up.
 */
export const TokenOwnersCron = ClusterCron.make({
  cron: Cron.parseUnsafe("29 4 * * *", "UTC"),
  execute: ForgetTokenOwners.use((forget) => forget.run).pipe(
    Effect.tap((channels) =>
      channels > 0
        ? Effect.logInfo(
            "Forgot the members LinkedIn pages' tokens are theirs"
          ).pipe(Effect.annotateLogs({ channels }))
        : Effect.void
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Forgetting LinkedIn pages' token owners failed", cause)
    )
  ),
  name: "channels.token-owners",
  skipIfOlderThan: Duration.hours(12),
});

/** The channels context's crons. */
export const ChannelsCronsLive = Layer.mergeAll(
  TokenRefreshCron,
  ReconnectWarningsCron,
  ConnectLinkRetentionCron,
  TokenOwnersCron
);
