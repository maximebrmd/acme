import { Effect, Layer, Option } from "effect";
import type { Redacted } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import type { MetricsRequest } from "#analytics/application/metrics-reader.ts";
import { isCounted } from "#analytics/domain/counted-platforms.ts";
import { blueskyMetrics } from "#analytics/infrastructure/platforms/bluesky/bluesky-metrics.ts";
import {
  databaseDown,
  needsReconnect,
  unusable,
} from "#analytics/infrastructure/platforms/channel-refusals.ts";
import { instagramMetrics } from "#analytics/infrastructure/platforms/instagram/instagram-metrics.ts";
import { linkedinMetrics } from "#analytics/infrastructure/platforms/linkedin/linkedin-metrics.ts";
import { mastodonMetrics } from "#analytics/infrastructure/platforms/mastodon/mastodon-metrics.ts";
import { pinterestMetrics } from "#analytics/infrastructure/platforms/pinterest/pinterest-metrics.ts";
import { tiktokMetrics } from "#analytics/infrastructure/platforms/tiktok/tiktok-metrics.ts";
import { xMetrics } from "#analytics/infrastructure/platforms/x/x-metrics.ts";
import { youtubeMetrics } from "#analytics/infrastructure/platforms/youtube/youtube-metrics.ts";
import { ChannelAccess } from "#channels/application/channel-access.ts";
import { linkedinVersionConfig } from "#shared/infrastructure/platforms/linkedin-version.ts";
import { metaAppConfig } from "#shared/infrastructure/platforms/meta-apps.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { pinterestHostsConfig } from "#shared/infrastructure/platforms/pinterest-api.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { tiktokHosts } from "#shared/infrastructure/platforms/tiktok-api.ts";
import { xAnalyticsConfig } from "#shared/infrastructure/platforms/x-analytics.ts";

/** Where the platforms' counts are read. */
export interface MetricsReaderSettings {
  /** Bluesky's public AppView. */
  readonly blueskyAppView: URL;
  /** LinkedIn's API. */
  readonly linkedinApi: URL;
  /** The version of LinkedIn's API calls name. */
  readonly linkedinVersion: string;
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
  /**
   * The secret of Meta's main app, which signs the proof of Instagram
   * accounts reached through Facebook Login.
   */
  readonly metaAppSecret: Option.Option<Redacted.Redacted>;
  /** Where Meta's services are, for Instagram. */
  readonly metaHosts: MetaHosts;
  /** Pinterest's API: its Sandbox's when the server is set to it. */
  readonly pinterestApi: URL;
  /** TikTok's API. */
  readonly tiktokApi: URL;
  /** X's API. */
  readonly xApi: URL;
  /** Whether the operator turned X reads, which X bills, on. */
  readonly xReads: boolean;
  /** The YouTube Data API. */
  readonly youtubeApi: URL;
}

/**
 * The platforms Peal reads counts on (`countedPlatforms`), each channel
 * found through the channels context (ChannelAccess), which says who it
 * posts as, what it allowed, and whether it still works. Every request
 * goes through the public HTTP client, so the outbound guard checks the
 * servers users chose. Needs an HttpClient, the OutboundGuard, Mac, and
 * PaidReads for the platform that bills reads.
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

      const tiktok = yield* tiktokMetrics({ api: settings.tiktokApi, http });

      const instagram = yield* instagramMetrics({
        hosts: settings.metaHosts,
        http,
        metaAppSecret: settings.metaAppSecret,
      });

      const linkedin = yield* linkedinMetrics({
        api: settings.linkedinApi,
        http,
        version: settings.linkedinVersion,
      });

      const youtube = yield* youtubeMetrics({
        api: settings.youtubeApi,
        http,
      });

      const pinterest = yield* pinterestMetrics({
        api: settings.pinterestApi,
        http,
      });

      const x = yield* xMetrics({
        api: settings.xApi,
        enabled: settings.xReads,
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

        if (!isCounted(account.platform, { x: settings.xReads })) {
          return yield* new ChannelUnreadable({ reason: "unsupported" });
        }

        if (account.platform === "mastodon") {
          return yield* mastodon.read(account, request.posts);
        }

        if (account.platform === "tiktok") {
          return yield* tiktok.read(account, request.posts);
        }

        if (account.platform === "instagram") {
          return yield* instagram.read(account, request.posts);
        }

        if (account.platform === "linkedin") {
          return yield* linkedin.read(account, request.posts);
        }

        if (account.platform === "youtube") {
          return yield* youtube.read(account, request.posts);
        }

        if (account.platform === "x") {
          return yield* x.read(account, request);
        }

        if (account.platform === "pinterest") {
          return yield* pinterest.read(account, request.posts);
        }

        return yield* bluesky.read(request.posts);
      });

      return MetricsReader.of({ read });
    })
  );

/**
 * The platforms as production reaches them, with Meta's app secret,
 * LinkedIn's API version and whether Pinterest's calls go to its Sandbox
 * read when the server starts. Needs ChannelAccess and Dns, which the
 * composition root provides.
 */
export const PlatformMetricsReaderLive = Layer.unwrap(
  Effect.gen(function* PlatformMetricsReaderLive() {
    const meta = yield* metaAppConfig;
    const linkedinVersion = yield* linkedinVersionConfig;
    const pinterest = yield* pinterestHostsConfig;

    return platformMetricsReaderWith({
      blueskyAppView: new URL("https://public.api.bsky.app"),
      linkedinApi: new URL("https://api.linkedin.com"),
      linkedinVersion,
      mastodonScheme: "https:",
      metaAppSecret: meta.pipe(Option.map(({ appSecret }) => appSecret)),
      metaHosts,
      pinterestApi: pinterest.api,
      tiktokApi: tiktokHosts.api,
      xApi: new URL("https://api.x.com"),
      xReads: yield* xAnalyticsConfig,
      youtubeApi: new URL("https://www.googleapis.com"),
    });
  })
).pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(
    Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
  )
);
