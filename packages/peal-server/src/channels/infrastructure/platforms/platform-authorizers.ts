import { Effect, Layer, Option, Schema } from "effect";

import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { PlatformAuthorizer } from "#channels/application/platform-authorizer.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import { hasConnections } from "#shared/domain/channel-connection.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import { InstagramConnectionSchema } from "#shared/domain/instagram-connection.ts";
import { LinkedInConnectionSchema } from "#shared/domain/linkedin-connection.ts";
import type { MetaApp } from "#shared/infrastructure/platforms/meta-apps.ts";
import {
  publicFetch,
  publicHttpClient,
} from "#shared/infrastructure/platforms/public-http.ts";

import { blueskyAuthorizer } from "./bluesky/bluesky-authorizer.ts";
import { ChannelPlatforms } from "./channel-platform-settings.ts";
import {
  googleBusinessAuthorizer,
  googleBusinessEndpoints,
} from "./google-business/google-business-authorizer.ts";
import {
  linkedinAuthorizer,
  linkedinEndpoints,
} from "./linkedin/linkedin-authorizer.ts";
import { linkedinPagesAuthorizer } from "./linkedin/linkedin-pages-authorizer.ts";
import { MastodonApps } from "./mastodon/mastodon-apps.ts";
import { mastodonAuthorizer } from "./mastodon/mastodon-authorizer.ts";
import { facebookAuthorizer } from "./meta/facebook-authorizer.ts";
import { instagramAuthorizer } from "./meta/instagram-authorizer.ts";
import { instagramLoginAuthorizer } from "./meta/instagram-login-authorizer.ts";
import { threadsAuthorizer } from "./meta/threads-authorizer.ts";
import { pinterestAuthorizer } from "./pinterest/pinterest-authorizer.ts";
import { tiktokAuthorizer } from "./tiktok/tiktok-authorizer.ts";
import { xAuthorizer, xEndpoints } from "./x/x-authorizer.ts";
import {
  youtubeAuthorizer,
  youtubeEndpoints,
} from "./youtube/youtube-authorizer.ts";

/**
 * The registry of the authorizers given, in the order given: a platform's
 * first one connects its new accounts, so for Instagram the first way in
 * listed is the one the server prefers.
 */
export const registryOf = (
  configured: readonly PlatformAuthorizer[],
  unconfigured: ReadonlySet<Platform> = new Set()
): PlatformAuthorizers["Service"] => {
  // Each platform's first authorizer, which connects new accounts.
  const byPlatform = new Map<Platform, PlatformAuthorizer>();

  for (const authorizer of configured) {
    if (!byPlatform.has(authorizer.platform)) {
      byPlatform.set(authorizer.platform, authorizer);
    }
  }

  // The ways in the server has for a platform, in the order given.
  const connectionsOf = <A extends ChannelConnection>(
    platform: Platform,
    is: (connection: ChannelConnection) => connection is A
  ): readonly A[] =>
    configured.flatMap((authorizer) =>
      authorizer.platform === platform &&
      authorizer.connection !== undefined &&
      is(authorizer.connection)
        ? [authorizer.connection]
        : []
    );

  const forPlatform = (
    platform: Platform,
    connection: Option.Option<ChannelConnection> = Option.none()
  ): Option.Option<PlatformAuthorizer> =>
    Option.isSome(connection) && hasConnections(platform)
      ? Option.fromUndefinedOr(
          configured.find(
            (authorizer) =>
              authorizer.platform === platform &&
              authorizer.connection === connection.value
          )
        )
      : Option.fromUndefinedOr(byPlatform.get(platform));

  return PlatformAuthorizers.of({
    every: (platform) =>
      configured.filter((authorizer) => authorizer.platform === platform),
    for: forPlatform,
    instagramConnections: connectionsOf(
      "instagram",
      Schema.is(InstagramConnectionSchema)
    ),
    linkedinConnections: connectionsOf(
      "linkedin",
      Schema.is(LinkedInConnectionSchema)
    ),
    unconfigured,
  });
};

/**
 * Every platform this server connects, from its settings: Mastodon always,
 * Bluesky when it has a client to run, LinkedIn and X when the operator
 * registered an app there, LinkedIn pages with a second app that has the
 * Community Management API, Facebook Pages and Instagram with Meta's app,
 * Instagram through Instagram Login with the app's Instagram credentials
 * (preferred to Facebook Login when both are set), Threads with its
 * credentials, TikTok with its client key and secret, YouTube with a Google
 * OAuth client, Pinterest with its app's id and secret, Google Business
 * Profile with a Google OAuth client of its own. Needs an HttpClient, the outbound guard, the
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

    // Pages after profiles: without a way in named, LinkedIn connects the
    // member's profile when the server has the app for it.
    const linkedinPages = Option.isSome(settings.linkedinPages)
      ? Option.some(
          yield* linkedinPagesAuthorizer({
            client: settings.linkedinPages.value,
            endpoints: linkedinEndpoints,
            http,
            publicUrl: settings.publicUrl,
            version: settings.linkedinVersion,
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

    const youtube = Option.isSome(settings.youtube)
      ? Option.some(
          yield* youtubeAuthorizer({
            client: settings.youtube.value,
            endpoints: youtubeEndpoints,
            http,
            publicUrl: settings.publicUrl,
          })
        )
      : Option.none<PlatformAuthorizer>();

    const googleBusiness = Option.isSome(settings.googleBusiness)
      ? Option.some(
          yield* googleBusinessAuthorizer({
            client: settings.googleBusiness.value,
            endpoints: googleBusinessEndpoints,
            http,
            publicUrl: settings.publicUrl,
          })
        )
      : Option.none<PlatformAuthorizer>();

    // Where the inbox reads Facebook's or Instagram's comments, their
    // sign-ins ask for its permissions too, as optional.
    const inbox = yield* CurrentInboxPlatforms;

    const metaOptions = (app: MetaApp) => ({
      app,
      hosts: settings.metaHosts,
      http,
      inbox,
      publicUrl: settings.publicUrl,
    });

    const meta = Option.isSome(settings.meta)
      ? [
          yield* facebookAuthorizer(metaOptions(settings.meta.value)),
          yield* instagramAuthorizer(metaOptions(settings.meta.value)),
        ]
      : [];

    // Instagram Login first: the way in the server prefers.
    const instagramLogin = Option.isSome(settings.instagram)
      ? [yield* instagramLoginAuthorizer(metaOptions(settings.instagram.value))]
      : [];

    const threads = Option.isSome(settings.threads)
      ? [yield* threadsAuthorizer(metaOptions(settings.threads.value))]
      : [];

    const tiktok = Option.isSome(settings.tiktok)
      ? [
          yield* tiktokAuthorizer({
            client: settings.tiktok.value,
            hosts: settings.tiktokHosts,
            http,
            publicUrl: settings.publicUrl,
          }),
        ]
      : [];

    const pinterest = Option.isSome(settings.pinterest)
      ? [
          yield* pinterestAuthorizer({
            client: settings.pinterest.value,
            hosts: settings.pinterestHosts,
            http,
            publicUrl: settings.publicUrl,
          }),
        ]
      : [];

    const configured = [
      mastodon,
      ...Option.toArray(bluesky),
      ...Option.toArray(linkedin),
      ...Option.toArray(linkedinPages),
      ...Option.toArray(x),
      ...instagramLogin,
      ...meta,
      ...threads,
      ...tiktok,
      ...Option.toArray(youtube),
      ...pinterest,
      ...Option.toArray(googleBusiness),
    ];

    // Platforms Peal supports, which this server lacks the settings for.
    const unconfigured: ReadonlySet<Platform> = new Set(
      (
        [
          "bluesky",
          "linkedin",
          "x",
          "facebook",
          "instagram",
          "threads",
          "tiktok",
          "youtube",
          "pinterest",
          "googleBusiness",
        ] as const
      ).filter(
        (platform) =>
          !configured.some((authorizer) => authorizer.platform === platform)
      )
    );

    return registryOf(configured, unconfigured);
  })
).pipe(Layer.provide(MastodonApps.layer));
