import { Effect, Layer, Option } from "effect";
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
import { MastodonApps } from "#channels/infrastructure/platforms/mastodon/mastodon-apps.ts";
import { mastodonAuthorizer } from "#channels/infrastructure/platforms/mastodon/mastodon-authorizer.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
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
 * keyring, and the authorizers given.
 */
export const connectChannelWith = <E, R>(
  authorizers: Layer.Layer<PlatformAuthorizers, E, R>
) =>
  ConnectChannel.layer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        DrizzleChannelRepository,
        DrizzleConnectAttempts,
        DrizzleConnectChoices,
        SqlChannelLocks,
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
