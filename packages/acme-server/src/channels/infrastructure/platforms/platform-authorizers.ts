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
import {
  linkedinAuthorizer,
  linkedinEndpoints,
} from "./linkedin/linkedin-authorizer.ts";
import { MastodonApps } from "./mastodon/mastodon-apps.ts";
import { mastodonAuthorizer } from "./mastodon/mastodon-authorizer.ts";
import { xAuthorizer, xEndpoints } from "./x/x-authorizer.ts";

/**
 * Every platform this server connects, from its settings: Mastodon always,
 * Bluesky when it has a client to run, LinkedIn and X when the operator
 * registered an app there. Needs an HttpClient, the outbound guard, the
 * database, the TokenCipher, SecureRandom and Digest.
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

    const linkedin = Option.isSome(settings.linkedin)
      ? Option.some(
          yield* linkedinAuthorizer({
            client: settings.linkedin.value,
            endpoints: linkedinEndpoints,
            http,
            publicUrl: settings.publicUrl,
          })
        )
      : Option.none<PlatformAuthorizer>();

    const x = Option.isSome(settings.x)
      ? Option.some(
          yield* xAuthorizer({
            client: settings.x.value,
            endpoints: xEndpoints,
            http,
            publicUrl: settings.publicUrl,
          })
        )
      : Option.none<PlatformAuthorizer>();

    // Each platform that needs a setting, and whether this server has it.
    const configurable: readonly (readonly [
      Platform,
      Option.Option<PlatformAuthorizer>,
    ])[] = [
      ["bluesky", bluesky],
      ["linkedin", linkedin],
      ["x", x],
    ];

    const byPlatform: ReadonlyMap<Platform, PlatformAuthorizer> = new Map([
      [mastodon.platform, mastodon],
      ...configurable.flatMap(([, authorizer]) =>
        Option.toArray(authorizer).map(
          (found) => [found.platform, found] as const
        )
      ),
    ]);

    const unconfigured: ReadonlySet<Platform> = new Set(
      configurable.flatMap(([platform, authorizer]) =>
        Option.isNone(authorizer) ? [platform] : []
      )
    );

    return PlatformAuthorizers.of({
      for: (platform) => Option.fromUndefinedOr(byPlatform.get(platform)),
      unconfigured,
    });
  })
).pipe(Layer.provide(MastodonApps.layer));
