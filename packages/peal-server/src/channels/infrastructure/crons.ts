import { Cron, Duration, Effect, Layer } from "effect";
import { ClusterCron } from "effect/cluster";

import { ConnectChannel } from "#channels/application/connect-channel.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { WarnChannelsNeedingReconnect } from "#channels/application/warn-channels-needing-reconnect.ts";

/**
 * Every ten minutes: refreshes the tokens due (each platform's policy says
 * when: how long before expiry, or, for those renewed as they are used, how
 * long unused), and forgets connection attempts nobody completed. A run
 * more than half an hour late is skipped: the next one does its work.
 */
export const TokenRefreshCron = ClusterCron.make({
  cron: Cron.parseUnsafe("*/10 * * * *", "UTC"),
  execute: Effect.gen(function* refreshTokens() {
    const report = yield* RefreshChannelTokens.use((refresh) => refresh.sweep);

    if (report.due > 0) {
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

/** The channels context's crons. */
export const ChannelsCronsLive = Layer.mergeAll(
  TokenRefreshCron,
  ReconnectWarningsCron
);
