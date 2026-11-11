import { Effect, Layer, Option } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { LivePostClients } from "#publishing/application/live-post-clients.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import { unpublishBlocker } from "#publishing/domain/live-post-support.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { pinterestHostsConfig } from "#shared/infrastructure/platforms/pinterest-api.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";

import { blueskyLivePost } from "./bluesky/bluesky-live-post.ts";
import { googleBusinessLivePost } from "./google-business/google-business-live-post.ts";
import type { LivePostRemover } from "./live-post-remover.ts";
import { mastodonLivePost } from "./mastodon/mastodon-live-post.ts";
import { pinterestLivePost } from "./pinterest/pinterest-live-post.ts";
import { xLivePost } from "./x/x-live-post.ts";

/** Where the platforms that delete posts are. */
export interface LivePostSettings {
  readonly googleBusinessApi: URL;
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
  readonly pinterestApi: URL;
  readonly xApi: URL;
}

/** A platform where Peal deletes no post. */
export const notDeleting = "notDeleting";

/**
 * One entry per platform, or the registry does not compile: the remover
 * that deletes its posts, or `notDeleting`, where the platform has no call
 * or Peal lacks the permission (`#publishing/domain/live-post-support.ts`,
 * which a test keeps equal to this registry).
 */
type Registry = {
  readonly [P in Platform]: LivePostRemover | typeof notDeleting;
};

/** The code a deletion where Peal deletes nothing is refused with. */
export const notSupportedCode = "notSupported";

/**
 * The registry of removers, from the public HTTP client (the outbound
 * guard, 20 seconds at most). Needs PlatformCredentials, SecureRandom and
 * Digest (Bluesky's proofs).
 */
export const livePostRegistryWith = Effect.fn("LivePostClients.registry")(
  function* livePostRegistryWith(settings: LivePostSettings) {
    const api = yield* publicHttpClient;

    const registry: Registry = {
      bluesky: yield* blueskyLivePost({ api }),
      facebook: notDeleting,
      googleBusiness: googleBusinessLivePost({
        api,
        apiUrl: settings.googleBusinessApi,
      }),
      instagram: notDeleting,
      linkedin: notDeleting,
      mastodon: mastodonLivePost({ api, scheme: settings.mastodonScheme }),
      pinterest: pinterestLivePost({ api, apiUrl: settings.pinterestApi }),
      threads: notDeleting,
      tiktok: notDeleting,
      x: xLivePost({ api, apiUrl: settings.xApi }),
      youtube: notDeleting,
    };

    return registry;
  }
);

/**
 * LivePostClients on the platforms' own APIs, with the channel's token from
 * PlatformCredentials, renewed once when the platform refuses it. Each
 * call runs inside the channel's gate (`RemoveLivePost`). A platform where
 * Peal deletes nothing answers `notSupported`, and nothing is sent.
 */
export const livePostClientsWith = (settings: LivePostSettings) =>
  Layer.effect(
    LivePostClients,
    Effect.gen(function* LivePostClientsLive() {
      const credentials = yield* PlatformCredentials;
      const registry = yield* livePostRegistryWith(settings);

      return LivePostClients.of({
        remove: ({ channelId, platformPostId }) =>
          Effect.gen(function* remove() {
            const { platform } = yield* credentials.account(channelId);
            const remover = registry[platform];

            if (
              remover === notDeleting ||
              Option.isSome(unpublishBlocker(platform))
            ) {
              return yield* new BadRequest({ code: notSupportedCode });
            }

            return yield* credentials.withToken(channelId, (token) =>
              remover(token, platformPostId)
            );
          }),
      });
    })
  );

/**
 * The platforms as production reaches them, Pinterest's on its Sandbox
 * when the server is set to it. Needs PlatformCredentials and Dns.
 */
export const LivePostClientsLive = Layer.unwrap(
  pinterestHostsConfig.pipe(
    Effect.map((pinterest) =>
      livePostClientsWith({
        googleBusinessApi: new URL("https://mybusiness.googleapis.com"),
        mastodonScheme: "https:",
        pinterestApi: pinterest.api,
        xApi: new URL("https://api.x.com"),
      })
    )
  )
).pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(
    Layer.mergeAll(FetchHttpClient.layer, Digest.layerWebCrypto).pipe(
      Layer.provideMerge(SecureRandom.layerWebCrypto)
    )
  )
);
