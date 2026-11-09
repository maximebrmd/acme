import { Effect, Layer, Option } from "effect";

import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { PlatformAuthorizer } from "#channels/application/platform-authorizer.ts";
import type { Platform } from "#channels/domain/platform.ts";
import type { MetaApp } from "#shared/infrastructure/platforms/meta-apps.ts";
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
import { facebookAuthorizer } from "./meta/facebook-authorizer.ts";
import { instagramAuthorizer } from "./meta/instagram-authorizer.ts";
import { threadsAuthorizer } from "./meta/threads-authorizer.ts";
import { xAuthorizer, xEndpoints } from "./x/x-authorizer.ts";

/**
 * Every platform this server connects, from its settings: Mastodon always,
 * Bluesky when it has a client to run, LinkedIn and X when the operator
 * registered an app there, Facebook Pages and Instagram with Meta's app,
 * Threads with its credentials. Needs an HttpClient, the outbound guard, the
 * database, the TokenCipher, SecureRandom, Digest and Mac.
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

    const metaOptions = (app: MetaApp) => ({
      app,
      hosts: settings.metaHosts,
      http,
      publicUrl: settings.publicUrl,
    });

    const meta = Option.isSome(settings.meta)
      ? [
          yield* facebookAuthorizer(metaOptions(settings.meta.value)),
          yield* instagramAuthorizer(metaOptions(settings.meta.value)),
        ]
      : [];

    const threads = Option.isSome(settings.threads)
      ? [yield* threadsAuthorizer(metaOptions(settings.threads.value))]
      : [];

    const configured = [
      mastodon,
      ...Option.toArray(bluesky),
      ...Option.toArray(linkedin),
      ...Option.toArray(x),
      ...meta,
      ...threads,
    ];

    const byPlatform: ReadonlyMap<Platform, PlatformAuthorizer> = new Map(
      configured.map((authorizer) => [authorizer.platform, authorizer])
    );

    // Platforms Acme supports, which this server lacks the settings for.
    const unconfigured: ReadonlySet<Platform> = new Set(
      (
        [
          "bluesky",
          "linkedin",
          "x",
          "facebook",
          "instagram",
          "threads",
        ] as const
      ).filter((platform) => !byPlatform.has(platform))
    );

    return PlatformAuthorizers.of({
      for: (platform) => Option.fromUndefinedOr(byPlatform.get(platform)),
      unconfigured,
    });
  })
).pipe(Layer.provide(MastodonApps.layer));
