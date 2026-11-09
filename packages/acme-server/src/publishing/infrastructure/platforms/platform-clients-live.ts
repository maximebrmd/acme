import { Duration, Effect, Layer, Option } from "effect";

import { PlatformClients } from "#publishing/application/platform-client.ts";
import type { PlatformClient } from "#publishing/application/platform-client.ts";
import type { StepTiming } from "#publishing/application/publication-steps.ts";
import type { Platform } from "#shared/domain/platform.ts";
import {
  publicHttpClient,
  publicHttpClientWith,
} from "#shared/infrastructure/platforms/public-http.ts";

import { blueskyClient } from "./bluesky/bluesky-client.ts";
import { linkedinClient } from "./linkedin/linkedin-client.ts";
import { linkedinVersionConfig } from "./linkedin/linkedin-version.ts";
import { mastodonClient } from "./mastodon/mastodon-client.ts";
import { xClient } from "./x/x-client.ts";

/** Where the platforms are, and how long their steps wait. */
export interface PlatformClientSettings {
  /** LinkedIn's API, and the uploads its answers point to. */
  readonly linkedinApi: URL;
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
  readonly timing?: StepTiming;
  /** Bluesky's video processing service. */
  readonly videoService: URL;
  /** X's API, which takes media uploads too. */
  readonly xApi: URL;
}

// An upload of a large video on a slow line.
const uploadTimeout = Duration.minutes(10);

/**
 * The platforms Acme publishes to: Mastodon, Bluesky, LinkedIn and X. Every
 * request goes through the public HTTP client, so the outbound guard checks
 * the servers users chose. Needs an HttpClient, the OutboundGuard,
 * SecureRandom and Digest (for DPoP proofs), PlatformCredentials and
 * MediaForPublishing. Reads LINKEDIN_API_VERSION when it is built.
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
      ];

      const byPlatform: ReadonlyMap<Platform, PlatformClient> = new Map(
        clients.map((client) => [client.platform, client])
      );

      return PlatformClients.of({
        for: (platform) => Option.fromUndefinedOr(byPlatform.get(platform)),
      });
    })
  );

/** The platforms, as production reaches them. */
export const PlatformClientsLive = platformClientsWith({
  linkedinApi: new URL("https://api.linkedin.com"),
  mastodonScheme: "https:",
  videoService: new URL("https://video.bsky.app"),
  xApi: new URL("https://api.x.com"),
});
