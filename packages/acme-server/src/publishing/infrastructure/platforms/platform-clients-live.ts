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
import { mastodonClient } from "./mastodon/mastodon-client.ts";

/** Where the platforms are, and how long their steps wait. */
export interface PlatformClientSettings {
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
  readonly timing?: StepTiming;
  /** Bluesky's video processing service. */
  readonly videoService: URL;
}

// An upload of a large video on a slow line.
const uploadTimeout = Duration.minutes(10);

/**
 * The platforms Acme publishes to: Mastodon and Bluesky. Every request goes
 * through the public HTTP client, so the outbound guard checks the servers
 * users chose. Needs an HttpClient, the OutboundGuard, SecureRandom and
 * Digest (for DPoP proofs), PlatformCredentials and MediaForPublishing.
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
  mastodonScheme: "https:",
  videoService: new URL("https://video.bsky.app"),
});
