import { Duration, Effect, Layer, Option } from "effect";
import type { Redacted } from "effect";

import { PlatformClients } from "#publishing/application/platform-client.ts";
import type { PlatformClient } from "#publishing/application/platform-client.ts";
import type { StepTiming } from "#publishing/application/publication-steps.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { metaAppConfig } from "#shared/infrastructure/platforms/meta-apps.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import { pinterestHostsConfig } from "#shared/infrastructure/platforms/pinterest-api.ts";
import {
  publicHttpClient,
  publicHttpClientWith,
} from "#shared/infrastructure/platforms/public-http.ts";
import { tiktokHosts } from "#shared/infrastructure/platforms/tiktok-api.ts";

import { blueskyClient } from "./bluesky/bluesky-client.ts";
import { googleBusinessClient } from "./google-business/google-business-client.ts";
import { linkedinClient } from "./linkedin/linkedin-client.ts";
import { linkedinVersionConfig } from "./linkedin/linkedin-version.ts";
import { mastodonClient } from "./mastodon/mastodon-client.ts";
import { facebookClient } from "./meta/facebook-client.ts";
import { instagramClient } from "./meta/instagram-client.ts";
import { threadsClient } from "./meta/threads-client.ts";
import { pinterestClient } from "./pinterest/pinterest-client.ts";
import { tiktokClient } from "./tiktok/tiktok-client.ts";
import { tiktokMediaUrlConfig } from "./tiktok/tiktok-settings.ts";
import { xClient } from "./x/x-client.ts";
import { youtubeClient } from "./youtube/youtube-client.ts";
import { youtubeDailyUploadsConfig } from "./youtube/youtube-settings.ts";

/** Where the platforms are, and how long their steps wait. */
export interface PlatformClientSettings {
  /** The My Business API, which makes and lists local posts. */
  readonly googleBusinessApi: URL;
  /** LinkedIn's API, and the uploads its answers point to. */
  readonly linkedinApi: URL;
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
  /**
   * The secret of Meta's main app, which signs the `appsecret_proof` of
   * Facebook and Instagram calls; none when the server has no Meta app.
   */
  readonly metaAppSecret: Option.Option<Redacted.Redacted>;
  /** Where Meta's services are. */
  readonly metaHosts: MetaHosts;
  /** Pinterest's API: its Sandbox's when the server is set to it. */
  readonly pinterestApi: URL;
  /** TikTok's API, which takes media uploads too. */
  readonly tiktokApi: URL;
  /**
   * The URL prefix verified for the app at TikTok under which the media
   * store serves files, which TikTok then pulls; none when there is none.
   */
  readonly tiktokPullFrom: Option.Option<URL>;
  readonly timing?: StepTiming;
  /** Bluesky's video processing service. */
  readonly videoService: URL;
  /** X's API, which takes media uploads too. */
  readonly xApi: URL;
  /** The YouTube Data API, uploads included. */
  readonly youtubeApi: URL;
  /** The units of YouTube's Video Uploads bucket the server spends a day. */
  readonly youtubeDailyUploads: number;
}

// An upload of a large video on a slow line.
const uploadTimeout = Duration.minutes(10);

/**
 * The platforms Peal publishes to: Mastodon, Bluesky, LinkedIn, X, Threads,
 * Instagram, Facebook Pages, TikTok, YouTube, Pinterest and Google Business
 * Profile. Every request goes through
 * the public HTTP client, so the outbound guard checks the servers users
 * chose. Needs an HttpClient, the OutboundGuard, SecureRandom and Digest
 * (for DPoP proofs), Mac (for Meta's proofs), PlatformCredentials,
 * MediaForPublishing, PublicationProgress (for TikTok's steps), and
 * UploadSessions and PlatformQuota (YouTube's uploads are journaled and
 * counted against the day's quota). Reads LINKEDIN_API_VERSION when it is
 * built.
 */
export const platformClientsWith = (settings: PlatformClientSettings) =>
  Layer.effect(
    PlatformClients,
    Effect.gen(function* PlatformClientsLive() {
      const api = yield* publicHttpClient;
      const uploads = yield* publicHttpClientWith({ timeout: uploadTimeout });

      const timing =
        settings.timing === undefined ? {} : { timing: settings.timing };

      const clients: readonly PlatformClient[] = [
        yield* mastodonClient({
          api,
          scheme: settings.mastodonScheme,
          uploads,
          ...timing,
        }),
        yield* blueskyClient({
          api,
          uploads,
          videoService: settings.videoService,
          ...timing,
        }),
        yield* linkedinClient({
          api,
          apiUrl: settings.linkedinApi,
          uploads,
          version: yield* linkedinVersionConfig,
          ...timing,
        }),
        yield* xClient({ api, apiUrl: settings.xApi, uploads, ...timing }),
        yield* threadsClient({ api, hosts: settings.metaHosts, ...timing }),
        yield* instagramClient({
          api,
          appSecret: settings.metaAppSecret,
          hosts: settings.metaHosts,
          ...timing,
        }),
        yield* facebookClient({
          api,
          appSecret: settings.metaAppSecret,
          hosts: settings.metaHosts,
          uploads,
          ...timing,
        }),
        yield* tiktokClient({
          api,
          apiUrl: settings.tiktokApi,
          pullFrom: settings.tiktokPullFrom,
          uploads,
          ...timing,
        }),
        yield* youtubeClient({
          api,
          apiUrl: settings.youtubeApi,
          dailyUploads: settings.youtubeDailyUploads,
          uploads,
          ...timing,
        }),
        yield* pinterestClient({
          api,
          apiUrl: settings.pinterestApi,
          ...timing,
        }),
        yield* googleBusinessClient({
          api,
          apiUrl: settings.googleBusinessApi,
          ...timing,
        }),
      ];

      const byPlatform: ReadonlyMap<Platform, PlatformClient> = new Map(
        clients.map((client) => [client.platform, client])
      );

      return PlatformClients.of({
        for: (platform) => Option.fromUndefinedOr(byPlatform.get(platform)),
      });
    })
  );

/**
 * The platforms, as production reaches them, with Meta's app secret,
 * TikTok's verified media prefix and whether Pinterest's calls go to its
 * Sandbox read when the server starts. Channels
 * connected while Meta's app was set keep publishing without its proof if
 * it is unset later.
 */
export const PlatformClientsLive = Layer.unwrap(
  Effect.gen(function* PlatformClientsLive() {
    const meta = yield* metaAppConfig;
    const tiktokPullFrom = yield* tiktokMediaUrlConfig;
    const youtubeDailyUploads = yield* youtubeDailyUploadsConfig;
    const pinterest = yield* pinterestHostsConfig;

    return platformClientsWith({
      googleBusinessApi: new URL("https://mybusiness.googleapis.com"),
      linkedinApi: new URL("https://api.linkedin.com"),
      mastodonScheme: "https:",
      metaAppSecret: meta.pipe(Option.map(({ appSecret }) => appSecret)),
      metaHosts,
      pinterestApi: pinterest.api,
      tiktokApi: tiktokHosts.api,
      tiktokPullFrom,
      videoService: new URL("https://video.bsky.app"),
      xApi: new URL("https://api.x.com"),
      youtubeApi: new URL("https://www.googleapis.com"),
      youtubeDailyUploads,
    });
  })
);
