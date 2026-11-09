import { Context, Effect, Layer, Option, Redacted } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type { ConnectOutcome } from "#channels/application/connect-channel.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { PlatformAuthorizer } from "#channels/application/platform-authorizer.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleConnectAttempts } from "#channels/infrastructure/drizzle-connect-attempts.ts";
import { DrizzleConnectChoices } from "#channels/infrastructure/drizzle-connect-choices.ts";
import { PlanChannelAllowanceLive } from "#channels/infrastructure/plan-channel-allowance.ts";
import { linkedinAuthorizer } from "#channels/infrastructure/platforms/linkedin/linkedin-authorizer.ts";
import type { LinkedInEndpoints } from "#channels/infrastructure/platforms/linkedin/linkedin-authorizer.ts";
import { MastodonApps } from "#channels/infrastructure/platforms/mastodon/mastodon-apps.ts";
import { mastodonAuthorizer } from "#channels/infrastructure/platforms/mastodon/mastodon-authorizer.ts";
import { xAuthorizer } from "#channels/infrastructure/platforms/x/x-authorizer.ts";
import type { XEndpoints } from "#channels/infrastructure/platforms/x/x-authorizer.ts";
import { youtubeAuthorizer } from "#channels/infrastructure/platforms/youtube/youtube-authorizer.ts";
import type { YouTubeEndpoints } from "#channels/infrastructure/platforms/youtube/youtube-authorizer.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { UnmeteredTest } from "#test/billing/support.ts";
import { googleClient } from "#test/channels/fakes/fake-google.ts";
import { linkedinClient } from "#test/channels/fakes/fake-linkedin.ts";
import { xClient } from "#test/channels/fakes/fake-x.ts";
import {
  DatabaseTest,
  OpenOutboundGuard,
  TokenCipherTest,
} from "#test/channels/support.ts";

/** The web app's origin the tests run under. */
export const testPublicUrl = "https://acme.test";

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
): PlatformAuthorizers["Service"] => {
  const byPlatform = new Map<Platform, PlatformAuthorizer>(
    authorizers.map((authorizer) => [authorizer.platform, authorizer])
  );

  return PlatformAuthorizers.of({
    for: (platform) => Option.fromUndefinedOr(byPlatform.get(platform)),
    unconfigured: new Set(),
  });
};

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
  entitlements: typeof UnmeteredTest = UnmeteredTest
) =>
  ConnectChannel.layer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        DrizzleChannelRepository,
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

/** The YouTube authorizer with the synthetic Google client, on the fake. */
export const youtubeAuthorizerOn = (endpoints: YouTubeEndpoints) =>
  publicHttpClient.pipe(
    Effect.flatMap((http) =>
      youtubeAuthorizer({
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
export const ConnectAdaptersTest = Layer.mergeAll(
  DrizzleChannelRepository,
  DrizzleConnectAttempts,
  DrizzleConnectChoices,
  SqlChannelLocks,
  PlanChannelAllowanceLive.pipe(Layer.provide(UnmeteredTest))
).pipe(Layer.provideMerge(TokenCipherTest), Layer.provideMerge(DatabaseTest));

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
