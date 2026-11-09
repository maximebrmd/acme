import { JoseKey } from "@atproto/oauth-client-node";
import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Option, Redacted } from "effect";
import { Base64Url } from "effect/encoding";
import { Dns } from "effect/net";

import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { OAuthClientDocuments } from "#channels/application/oauth-client-documents.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import { TokenCipher } from "#channels/application/token-cipher.ts";
import { ChannelsLive } from "#channels/container.ts";
import { Notify } from "#notifications/application/notify.ts";
import { UnmeteredTest } from "#test/billing/support.ts";
import {
  actorIn,
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  syntheticKeyring,
} from "#test/channels/support.ts";

// What the context needs from the rest of the server: names to resolve,
// notices to send, which nothing here sends, and plans, which limit nothing.
const Neighbours = Layer.mergeAll(
  Dns.layerStatic({}),
  Layer.succeed(
    Notify,
    Notify.of({ notify: () => Effect.void, resolve: () => Effect.void })
  ),
  UnmeteredTest
);

// The channels context as the server builds it, with these settings. A blank
// keyring stands for an unset one, whatever the environment says.
const channelsWithSettings = (settings: Record<string, string>) =>
  ChannelsLive.pipe(
    Layer.provide(
      ConfigProvider.layerAdd(ConfigProvider.fromUnknown(settings), {
        asPrimary: true,
      })
    ),
    Layer.provide(Neighbours),
    Layer.provideMerge(DatabaseTest)
  );

// No app on LinkedIn or X, whatever the environment says.
const withoutApps = {
  LINKEDIN_CLIENT_ID: "",
  LINKEDIN_CLIENT_SECRET: "",
  X_CLIENT_ID: "",
  X_CLIENT_SECRET: "",
};

const channelsWith = (keys: string) =>
  channelsWithSettings({
    ...withoutApps,
    ACME_TOKEN_KEYS: keys,
    BLUESKY_CLIENT_KEYS: "",
  });

// A Bluesky client key, as `bun nx run acme-server:bluesky-key` prints it.
const blueskyKeyEntry = Effect.promise(async () => {
  const key = await JoseKey.generate(["ES256"], "client-1");

  return `client-1:${Base64Url.encode(JSON.stringify(key.privateJwk))}`;
});

const accessToken = Redacted.make("synthetic-access-token-0123456789");

const refreshToken = Redacted.make("synthetic-refresh-token-9876543210");

layer(channelsWith(""))("the channels context without token keys", (it) => {
  it.effect("starts, and lists channels", () =>
    Effect.gen(function* lists() {
      const workspaceId = yield* freshWorkspace;

      const channels = yield* ListChannels.use((useCase) =>
        useCase.list(actorIn(workspaceId, ["channel:read"]))
      );

      assert.deepStrictEqual(channels, []);
    })
  );

  it.effect("stores no token until keys are set", () =>
    Effect.gen(function* refuses() {
      const channel = yield* freshChannel(yield* freshWorkspace);

      const error = yield* Effect.flip(
        TokenCipher.use((cipher) => cipher.encrypt(accessToken, channel.id))
      );

      assert.strictEqual(error._tag, "MissingTokenKey");
    })
  );
});

layer(channelsWith(syntheticKeyring))(
  "the channels context with token keys",
  (it) => {
    it.effect("stores tokens the cipher encrypted for the channel", () =>
      Effect.gen(function* stores() {
        const cipher = yield* TokenCipher;
        const channels = yield* ChannelRepository;
        const channel = yield* freshChannel(yield* freshWorkspace);

        yield* channels.insert(
          channel,
          new ChannelCredentials({
            accessToken: yield* cipher.encrypt(accessToken, channel.id),
            refreshToken: Option.some(
              yield* cipher.encrypt(refreshToken, channel.id)
            ),
          })
        );

        const stored = yield* channels.credentials(channel.id);

        assert.isTrue(Option.isSome(stored));

        const credentials = Option.getOrThrow(stored);

        assert.isTrue(credentials.accessToken.startsWith("test-key."));

        const decrypted = yield* Effect.all({
          access: cipher.decrypt(credentials.accessToken, channel.id),
          refresh: cipher.decrypt(
            Option.getOrThrow(credentials.refreshToken),
            channel.id
          ),
        });

        assert.strictEqual(
          Redacted.value(decrypted.access),
          Redacted.value(accessToken)
        );
        assert.strictEqual(
          Redacted.value(decrypted.refresh),
          Redacted.value(refreshToken)
        );
      })
    );
  }
);

layer(channelsWith(""))("the channels context on a local server", (it) => {
  it.effect(
    "connects Bluesky as a development client, publishing nothing",
    () =>
      Effect.gen(function* loopback() {
        const authorizers = yield* PlatformAuthorizers;
        const documents = yield* OAuthClientDocuments;

        assert.isTrue(Option.isSome(authorizers.for("bluesky")));
        assert.isTrue(Option.isSome(authorizers.for("mastodon")));
        assert.isTrue(Option.isNone(authorizers.for("linkedin")));
        assert.isTrue(Option.isNone(authorizers.for("x")));
        // Nor Meta's platforms, without Meta's app.
        assert.deepStrictEqual([...authorizers.unconfigured].toSorted(), [
          "facebook",
          "instagram",
          "linkedin",
          "threads",
          "x",
        ]);
        assert.isTrue(Option.isNone(documents.bluesky));
      })
  );
});

layer(DatabaseTest)("the channels context's LinkedIn and X settings", (it) => {
  it.effect("connect LinkedIn and X once their apps are set", () =>
    Effect.gen(function* configured() {
      const authorizers = yield* PlatformAuthorizers.pipe(
        Effect.provide(
          channelsWithSettings({
            BLUESKY_CLIENT_KEYS: "",
            LINKEDIN_CLIENT_ID: "77synthetic",
            LINKEDIN_CLIENT_SECRET: "synthetic-linkedin-secret",
            X_CLIENT_ID: "c3ludGhldGlj",
            X_CLIENT_SECRET: "synthetic-x-secret",
          })
        )
      );

      assert.strictEqual(
        Option.getOrThrow(authorizers.for("linkedin")).platform,
        "linkedin"
      );
      assert.strictEqual(Option.getOrThrow(authorizers.for("x")).platform, "x");
      assert.isFalse(authorizers.unconfigured.has("linkedin"));
      assert.isFalse(authorizers.unconfigured.has("x"));
    }).pipe(Effect.scoped)
  );

  it.effect("refuse to start with half of an app", () =>
    Effect.gen(function* refuses() {
      for (const [platform, settings] of [
        ["linkedin", { ...withoutApps, LINKEDIN_CLIENT_ID: "77synthetic" }],
        ["x", { ...withoutApps, X_CLIENT_SECRET: "synthetic-x-secret" }],
      ] as const) {
        const failure = yield* Layer.build(
          channelsWithSettings({ ...settings, BLUESKY_CLIENT_KEYS: "" })
        ).pipe(Effect.scoped, Effect.flip);

        assert.strictEqual(failure._tag, "InvalidPlatformClient");
        assert(failure._tag === "InvalidPlatformClient");
        assert.strictEqual(failure.platform, platform);
        assert.notInclude(failure.message, "synthetic");
      }
    })
  );
});

layer(DatabaseTest)("the channels context's Bluesky settings", (it) => {
  it.effect("publish a confidential client for keys on an HTTPS server", () =>
    Effect.gen(function* confidential() {
      const entry = yield* blueskyKeyEntry;

      const documents = yield* OAuthClientDocuments.pipe(
        Effect.provide(
          channelsWithSettings({
            BLUESKY_CLIENT_KEYS: entry,
            PUBLIC_URL: "https://acme.example",
          })
        )
      );

      const published = Option.getOrThrow(documents.bluesky);

      assert.strictEqual(
        published.metadata.client_id,
        "https://acme.example/api/channels/oauth/bluesky/client-metadata.json"
      );
      assert.deepStrictEqual(published.metadata.redirect_uris, [
        "https://acme.example/connect/bluesky/callback",
      ]);
      assert.deepStrictEqual(
        published.jwks.keys.map(({ kid, kty }) => ({ kid, kty })),
        [{ kid: "client-1", kty: "EC" }]
      );
      // Public halves only.
      assert.notInclude(JSON.stringify(published.jwks), '"d"');
    }).pipe(Effect.scoped)
  );

  it.effect("refuse to start with keys the client cannot use", () =>
    Effect.gen(function* refuses() {
      const entry = yield* blueskyKeyEntry;

      for (const settings of [
        { BLUESKY_CLIENT_KEYS: entry, PUBLIC_URL: "http://acme.example" },
        {
          BLUESKY_CLIENT_KEYS: "client-1:not-a-key",
          PUBLIC_URL: "https://acme.example",
        },
        {
          BLUESKY_CLIENT_KEYS: "no separator",
          PUBLIC_URL: "https://acme.example",
        },
      ]) {
        const failure = yield* Layer.build(channelsWithSettings(settings)).pipe(
          Effect.scoped,
          Effect.flip
        );

        assert.strictEqual(failure._tag, "InvalidBlueskySettings");
      }
    })
  );
});
