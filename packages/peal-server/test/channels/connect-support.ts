import { Context, Effect, Layer, Redacted } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";
import { SqlClient } from "effect/sql";

import type { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type { ConnectOutcome } from "#channels/application/connect-channel.ts";
import { ConnectSite } from "#channels/application/connect-site.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { PlatformAuthorizer } from "#channels/application/platform-authorizer.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleConnectAttempts } from "#channels/infrastructure/drizzle-connect-attempts.ts";
import { DrizzleConnectChoices } from "#channels/infrastructure/drizzle-connect-choices.ts";
import { PlanChannelAllowanceLive } from "#channels/infrastructure/plan-channel-allowance.ts";
import { googleBusinessAuthorizer } from "#channels/infrastructure/platforms/google-business/google-business-authorizer.ts";
import type { GoogleBusinessEndpoints } from "#channels/infrastructure/platforms/google-business/google-business-authorizer.ts";
import { linkedinAuthorizer } from "#channels/infrastructure/platforms/linkedin/linkedin-authorizer.ts";
import type { LinkedInEndpoints } from "#channels/infrastructure/platforms/linkedin/linkedin-authorizer.ts";
import { linkedinPagesAuthorizer } from "#channels/infrastructure/platforms/linkedin/linkedin-pages-authorizer.ts";
import { MastodonApps } from "#channels/infrastructure/platforms/mastodon/mastodon-apps.ts";
import { mastodonAuthorizer } from "#channels/infrastructure/platforms/mastodon/mastodon-authorizer.ts";
import { pinterestAuthorizer } from "#channels/infrastructure/platforms/pinterest/pinterest-authorizer.ts";
import { registryOf } from "#channels/infrastructure/platforms/platform-authorizers.ts";
import { tiktokAuthorizer } from "#channels/infrastructure/platforms/tiktok/tiktok-authorizer.ts";
import { WordPressSiteVerifierLive } from "#channels/infrastructure/platforms/wordpress/wordpress-site-verifier.ts";
import { xAuthorizer } from "#channels/infrastructure/platforms/x/x-authorizer.ts";
import type { XEndpoints } from "#channels/infrastructure/platforms/x/x-authorizer.ts";
import { youtubeAuthorizer } from "#channels/infrastructure/platforms/youtube/youtube-authorizer.ts";
import type { YouTubeEndpoints } from "#channels/infrastructure/platforms/youtube/youtube-authorizer.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import type { PinterestHosts } from "#shared/infrastructure/platforms/pinterest-api.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import type { TikTokHosts } from "#shared/infrastructure/platforms/tiktok-api.ts";
import { UnmeteredTest } from "#test/billing/support.ts";
import { googleClient } from "#test/channels/fakes/fake-google.ts";
import {
  linkedinClient,
  linkedinFakeVersion,
  linkedinPagesClient,
} from "#test/channels/fakes/fake-linkedin.ts";
import { fakeMastodon } from "#test/channels/fakes/fake-mastodon.ts";
import type { FakeMastodonOptions } from "#test/channels/fakes/fake-mastodon.ts";
import { pinterestClient } from "#test/channels/fakes/fake-pinterest.ts";
import { tiktokClient } from "#test/channels/fakes/fake-tiktok.ts";
import { xClient } from "#test/channels/fakes/fake-x.ts";
import {
  DatabaseTest,
  OpenOutboundGuard,
  TokenCipherTest,
} from "#test/channels/support.ts";

/**
 * A fake Mastodon instance (`fakeMastodon`) for tests that connect accounts
 * on it. Peal keeps the app it registers on an instance for good, by the
 * instance's origin; a fake's origin is a loopback port, which the system
 * hands to another fake in a later run. So the app goes with the instance:
 * forgotten when its scope closes, and before it starts, should a run that
 * stopped midway have left one. Kept, the next fake on that port would be
 * asked to exchange a code for an app it never registered, and refuse.
 */
export const mastodonInstance = Effect.fnUntraced(function* mastodonInstance(
  options: FakeMastodonOptions = {}
) {
  const sql = yield* SqlClient.SqlClient;
  const instance = yield* fakeMastodon(options);

  const forgetApp =
    sql`DELETE FROM channels.mastodon_apps WHERE instance = ${new URL(instance.url).origin}`.pipe(
      Effect.orDie
    );

  yield* forgetApp;
  yield* Effect.addFinalizer(() => forgetApp);

  return instance;
});

/** The web app's origin the tests run under. */
export const testPublicUrl = "https://peal.test";

/**
 * The channel a completed connection made, for platforms whose sign-in
 * reaches one account: a test expecting it fails on a choice.
 */
export const connectedChannel = (outcome: ConnectOutcome) =>
  outcome._tag === "connected"
    ? Effect.succeed(outcome.channel)
    : Effect.die(new Error("The connection offered a choice of accounts"));

/** A registry of the authorizers given, as the server builds it. */
export const authorizersOf = (
  ...authorizers: readonly PlatformAuthorizer[]
): PlatformAuthorizers["Service"] => registryOf(authorizers);

/**
 * The Mastodon authorizer as the server runs it, over HTTP through the
 * public client, with the outbound guard the caller provides.
 */
export const MastodonAuthorizersTest = Layer.effect(
  PlatformAuthorizers,
  Effect.gen(function* MastodonAuthorizersTest() {
    const http = yield* publicHttpClient;

    return authorizersOf(
      yield* mastodonAuthorizer({ http, publicUrl: testPublicUrl })
    );
  })
).pipe(
  Layer.provide(MastodonApps.layer),
  Layer.provide(
    Layer.mergeAll(
      FetchHttpClient.layer,
      SecureRandom.layerWebCrypto,
      Digest.layerWebCrypto
    )
  )
);

/**
 * ConnectChannel with the real adapters on the test database, the synthetic
 * keyring, and the authorizers given, on a server whose plans are
 * `entitlements` (none, by default: nothing is limited).
 */
export const connectChannelWith = <E, R>(
  authorizers: Layer.Layer<PlatformAuthorizers, E, R>,
  entitlements: Layer.Layer<WorkspaceEntitlements> = UnmeteredTest
) =>
  ConnectChannel.layer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        DrizzleChannelRepository,
        ChannelEvents.none,
        DrizzleConnectAttempts,
        DrizzleConnectChoices,
        SqlChannelLocks,
        PlanChannelAllowanceLive.pipe(Layer.provide(entitlements)),
        authorizers
      )
    ),
    Layer.provideMerge(TokenCipherTest),
    Layer.provideMerge(DatabaseTest)
  );

/** ConnectChannel with Mastodon, whose requests all go through. */
export const MastodonConnectTest = connectChannelWith(
  MastodonAuthorizersTest.pipe(Layer.provide(OpenOutboundGuard))
);

/**
 * What the authorizers of platforms on hosts of their own need, against
 * fakes on loopback: HTTP through the public client with an open guard,
 * randomness and digests.
 */
export const AuthorizerServicesTest = Layer.mergeAll(
  FetchHttpClient.layer,
  OpenOutboundGuard,
  SecureRandom.layerWebCrypto,
  Digest.layerWebCrypto
);

/** The LinkedIn authorizer with the synthetic app, on the fake's hosts. */
export const linkedinAuthorizerOn = (endpoints: LinkedInEndpoints) =>
  publicHttpClient.pipe(
    Effect.flatMap((http) =>
      linkedinAuthorizer({
        client: {
          clientId: linkedinClient.clientId,
          clientSecret: Redacted.make(linkedinClient.clientSecret),
        },
        endpoints,
        http,
        publicUrl: testPublicUrl,
      })
    ),
    Effect.provide(AuthorizerServicesTest)
  );

/**
 * The LinkedIn pages authorizer with the synthetic Community Management
 * app, on the fake's hosts, in the API version given.
 */
export const linkedinPagesAuthorizerOn = (
  endpoints: LinkedInEndpoints,
  version: string = linkedinFakeVersion,
  inbox: InboxPlatforms = new Set()
) =>
  publicHttpClient.pipe(
    Effect.flatMap((http) =>
      linkedinPagesAuthorizer({
        client: {
          clientId: linkedinPagesClient.clientId,
          clientSecret: Redacted.make(linkedinPagesClient.clientSecret),
        },
        endpoints,
        http,
        inbox,
        publicUrl: testPublicUrl,
        version,
      })
    ),
    Effect.provide(AuthorizerServicesTest)
  );

/** The X authorizer with the synthetic app, on the fake's hosts. */
export const xAuthorizerOn = (endpoints: XEndpoints) =>
  publicHttpClient.pipe(
    Effect.flatMap((http) =>
      xAuthorizer({
        client: {
          clientId: xClient.clientId,
          clientSecret: Redacted.make(xClient.clientSecret),
        },
        endpoints,
        http,
        publicUrl: testPublicUrl,
      })
    ),
    Effect.provide(AuthorizerServicesTest)
  );

/**
 * The YouTube authorizer with the synthetic Google client, on the fake,
 * for a server whose inbox reads `inbox`'s optional platforms.
 */
export const youtubeAuthorizerOn = (
  endpoints: YouTubeEndpoints,
  inbox: InboxPlatforms = new Set()
) =>
  publicHttpClient.pipe(
    Effect.flatMap((http) =>
      youtubeAuthorizer({
        client: {
          clientId: googleClient.clientId,
          clientSecret: Redacted.make(googleClient.clientSecret),
        },
        endpoints,
        http,
        inbox,
        publicUrl: testPublicUrl,
      })
    ),
    Effect.provide(AuthorizerServicesTest)
  );

/**
 * The Google Business Profile authorizer with the synthetic Google client,
 * on the fake.
 */
export const googleBusinessAuthorizerOn = (
  endpoints: GoogleBusinessEndpoints
) =>
  publicHttpClient.pipe(
    Effect.flatMap((http) =>
      googleBusinessAuthorizer({
        client: {
          clientId: googleClient.clientId,
          clientSecret: Redacted.make(googleClient.clientSecret),
        },
        endpoints,
        http,
        publicUrl: testPublicUrl,
      })
    ),
    Effect.provide(AuthorizerServicesTest)
  );

/**
 * ConnectChannel's adapters on the test database, with the synthetic
 * keyring, plans that limit nothing, and no authorizer: a test builds the
 * use case with its own (`connectChannelOver`), for a fake it started.
 */
export const connectAdaptersOn = (entitlements: typeof UnmeteredTest) =>
  Layer.mergeAll(
    DrizzleChannelRepository,
    ChannelEvents.none,
    DrizzleConnectAttempts,
    DrizzleConnectChoices,
    SqlChannelLocks,
    PlanChannelAllowanceLive.pipe(Layer.provide(entitlements))
  ).pipe(Layer.provideMerge(TokenCipherTest), Layer.provideMerge(DatabaseTest));

export const ConnectAdaptersTest = connectAdaptersOn(UnmeteredTest);

/** ConnectChannel with these authorizers, over the adapters in context. */
export const connectChannelOver = (
  ...authorizers: readonly PlatformAuthorizer[]
) =>
  Layer.build(
    ConnectChannel.layer.pipe(
      Layer.provide(
        Layer.succeed(PlatformAuthorizers, authorizersOf(...authorizers))
      )
    )
  ).pipe(Effect.map(Context.get(ConnectChannel)));

/** The TikTok authorizer with the synthetic app, on the fake's hosts. */
export const tiktokAuthorizerOn = (hosts: TikTokHosts) =>
  publicHttpClient.pipe(
    Effect.flatMap((http) =>
      tiktokAuthorizer({
        client: {
          clientId: tiktokClient.clientKey,
          clientSecret: Redacted.make(tiktokClient.clientSecret),
        },
        hosts,
        http,
        publicUrl: testPublicUrl,
      })
    ),
    Effect.provide(AuthorizerServicesTest)
  );

/** The Pinterest authorizer with the synthetic app, on the fake's hosts. */
export const pinterestAuthorizerOn = (hosts: PinterestHosts) =>
  publicHttpClient.pipe(
    Effect.flatMap((http) =>
      pinterestAuthorizer({
        client: {
          clientId: pinterestClient.appId,
          clientSecret: Redacted.make(pinterestClient.appSecret),
        },
        hosts,
        http,
        publicUrl: testPublicUrl,
      })
    ),
    Effect.provide(AuthorizerServicesTest)
  );

/**
 * ConnectSite with the WordPress verifier, whose requests all go through:
 * over the adapters a `connectChannelWith` layer gives.
 */
export const WordPressSitesTest = ConnectSite.layer.pipe(
  Layer.provide(
    WordPressSiteVerifierLive.pipe(
      Layer.provide(Layer.mergeAll(FetchHttpClient.layer, OpenOutboundGuard))
    )
  )
);
