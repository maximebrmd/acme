import { Effect, Layer, Option } from "effect";

import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { PlatformAuthorizer } from "#channels/application/platform-authorizer.ts";
import type { Platform } from "#channels/domain/platform.ts";
import {
  publicFetch,
  publicHttpClient,
} from "#shared/infrastructure/platforms/public-http.ts";

import { blueskyAuthorizer } from "./bluesky/bluesky-authorizer.ts";
import { ChannelPlatforms } from "./channel-platform-settings.ts";
import { MastodonApps } from "./mastodon/mastodon-apps.ts";
import { mastodonAuthorizer } from "./mastodon/mastodon-authorizer.ts";

/**
 * Every platform this server connects, from its settings: Mastodon always,
 * Bluesky when it has a client to run. Needs an HttpClient, the outbound
 * guard, the database and the TokenCipher.
 */
export const PlatformAuthorizersLive = Layer.effect(
  PlatformAuthorizers,
  Effect.gen(function* PlatformAuthorizersLive() {
    const settings = yield* ChannelPlatforms;
    const http = yield* publicHttpClient;
    const fetch = yield* publicFetch;

    const mastodon = yield* mastodonAuthorizer({
      http,
      publicUrl: settings.publicUrl,
    });

    const bluesky = Option.isSome(settings.bluesky)
      ? Option.some(yield* blueskyAuthorizer(settings.bluesky.value, fetch))
      : Option.none<PlatformAuthorizer>();

    const byPlatform: ReadonlyMap<Platform, PlatformAuthorizer> = new Map([
      [mastodon.platform, mastodon],
      ...Option.toArray(bluesky).map(
        (authorizer) => [authorizer.platform, authorizer] as const
      ),
    ]);

    const unconfigured: ReadonlySet<Platform> = new Set(
      Option.isNone(bluesky) ? ["bluesky"] : []
    );

    return PlatformAuthorizers.of({
      for: (platform) => Option.fromUndefinedOr(byPlatform.get(platform)),
      unconfigured,
    });
  })
).pipe(Layer.provide(MastodonApps.layer));
