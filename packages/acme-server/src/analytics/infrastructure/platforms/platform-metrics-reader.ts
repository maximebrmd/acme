import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import type { MetricsRequest } from "#analytics/application/metrics-reader.ts";
import { blueskyMetrics } from "#analytics/infrastructure/platforms/bluesky/bluesky-metrics.ts";
import {
  databaseDown,
  needsReconnect,
  unusable,
} from "#analytics/infrastructure/platforms/channel-refusals.ts";
import { mastodonMetrics } from "#analytics/infrastructure/platforms/mastodon/mastodon-metrics.ts";
import { youtubeMetrics } from "#analytics/infrastructure/platforms/youtube/youtube-metrics.ts";
import { ChannelAccess } from "#channels/application/channel-access.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";

/** Where the platforms' counts are read. */
export interface MetricsReaderSettings {
  /** Bluesky's public AppView. */
  readonly blueskyAppView: URL;
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
  /** The YouTube Data API. */
  readonly youtubeApi: URL;
}

/**
 * The platforms Acme reads counts on, Mastodon, Bluesky and YouTube, each channel
 * found through the channels context (ChannelAccess), which says who it
 * posts as, what it allowed, and whether it still works. Every request
 * goes through the public HTTP client, so the outbound guard checks the
 * servers users chose. Needs an HttpClient and the OutboundGuard.
 */
export const platformMetricsReaderWith = (settings: MetricsReaderSettings) =>
  Layer.effect(
    MetricsReader,
    Effect.gen(function* PlatformMetricsReader() {
      const access = yield* ChannelAccess;
      const http = yield* publicHttpClient;

      const mastodon = yield* mastodonMetrics({
        http,
        scheme: settings.mastodonScheme,
      });

      const bluesky = blueskyMetrics({
        appView: settings.blueskyAppView,
        http,
      });

      const youtube = yield* youtubeMetrics({
        api: settings.youtubeApi,
        http,
      });

      const read = Effect.fn("MetricsReader.read")(function* read(
        request: MetricsRequest
      ) {
        const account = yield* access.account(request.channelId).pipe(
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
            TokenExpired: needsReconnect,
          })
        );

        if (account.platform === "mastodon") {
          return yield* mastodon.read(account, request.posts);
        }

        if (account.platform === "youtube") {
          return yield* youtube.read(account, request.posts);
        }

        return account.platform === "bluesky"
          ? yield* bluesky.read(request.posts)
          : yield* new ChannelUnreadable({ reason: "unsupported" });
      });

      return MetricsReader.of({ read });
    })
  );

/**
 * The platforms as production reaches them. Needs ChannelAccess and Dns,
 * which the composition root provides.
 */
export const PlatformMetricsReaderLive = platformMetricsReaderWith({
  blueskyAppView: new URL("https://public.api.bsky.app"),
  mastodonScheme: "https:",
  youtubeApi: new URL("https://www.googleapis.com"),
}).pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer)
);
