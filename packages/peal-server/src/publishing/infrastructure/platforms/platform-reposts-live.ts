import { Effect, Layer, Option } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { PlatformReposts } from "#publishing/application/platform-reposts.ts";
import type { RepostClient } from "#publishing/application/platform-reposts.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";

import { blueskyRepost } from "./bluesky/bluesky-repost.ts";
import { mastodonRepost } from "./mastodon/mastodon-repost.ts";

/** A platform where Peal reposts nothing. */
export const notReposting = "notReposting";

/**
 * One entry per platform, or the registry does not compile: its repost
 * client, or `notReposting` where `followUpSupport` says the repost is not
 * available (a test keeps them equal).
 */
type Registry = {
  readonly [P in Platform]: RepostClient | typeof notReposting;
};

/** Where the platforms that repost are. */
export interface RepostSettings {
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
}

/**
 * The registry of repost clients, from the public HTTP client. Needs
 * PlatformCredentials, SecureRandom and Digest (Bluesky's proofs).
 */
export const repostRegistryWith = Effect.fn("PlatformReposts.registry")(
  function* repostRegistryWith(settings: RepostSettings) {
    const api = yield* publicHttpClient;

    const registry: Registry = {
      bluesky: yield* blueskyRepost({ api }),
      facebook: notReposting,
      googleBusiness: notReposting,
      instagram: notReposting,
      linkedin: notReposting,
      mastodon: yield* mastodonRepost({ api, scheme: settings.mastodonScheme }),
      pinterest: notReposting,
      threads: notReposting,
      tiktok: notReposting,
      x: notReposting,
      youtube: notReposting,
    };

    return registry;
  }
);

/** PlatformReposts over the registry. */
export const platformRepostsWith = (settings: RepostSettings) =>
  Layer.effect(
    PlatformReposts,
    Effect.gen(function* PlatformRepostsLive() {
      const registry = yield* repostRegistryWith(settings);

      return PlatformReposts.of({
        for: (platform) => {
          const client = registry[platform];

          return client === notReposting ? Option.none() : Option.some(client);
        },
      });
    })
  );

/** The platforms as production reaches them. Needs PlatformCredentials and Dns. */
export const PlatformRepostsLive = platformRepostsWith({
  mastodonScheme: "https:",
}).pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(
    Layer.mergeAll(FetchHttpClient.layer, Digest.layerWebCrypto).pipe(
      Layer.provideMerge(SecureRandom.layerWebCrypto)
    )
  )
);
