import { JoseKey } from "@atproto/oauth-client-node";
import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Option, Redacted } from "effect";
import { Base64Url } from "effect/encoding";
import { Dns } from "effect/net";

import { DrizzleAnalyticsRecords } from "#analytics/infrastructure/drizzle-analytics-records.ts";
import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ConnectLinkJournal } from "#channels/application/connect-link-journal.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { OAuthClientDocuments } from "#channels/application/oauth-client-documents.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import { TokenCipher } from "#channels/application/token-cipher.ts";
import { ChannelsLive } from "#channels/container.ts";
import { platforms } from "#channels/domain/platform.ts";
import { platformRegistrations } from "#channels/infrastructure/platforms/platform-addresses.ts";
import type { PlatformRegistration } from "#channels/infrastructure/platforms/platform-addresses.ts";
import { Notify } from "#notifications/application/notify.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import { UnmeteredTest } from "#test/billing/support.ts";
import {
  actorIn,
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  syntheticKeyring,
} from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

// What the context needs from the rest of the server: names to resolve,
// notices to send, which nothing here sends, and plans, which limit nothing.
const Neighbours = Layer.mergeAll(
  Dns.layerStatic({}),
  Layer.succeed(
    Notify,
    Notify.of({ notify: () => Effect.void, resolve: () => Effect.void })
  ),
  Layer.succeed(
    WebhookEvents,
    WebhookEvents.of({ publish: () => Effect.void })
  ),
  UnmeteredTest,
  PartnerOwnership.layerNone,
  ConnectLinkJournal.none,
  DrizzleAnalyticsRecords.pipe(Layer.provide(DatabaseTest))
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
    Layer.provide(TransactionsTest),
    Layer.provideMerge(DatabaseTest)
  );

// No app on LinkedIn, X or TikTok, whatever the environment says.
const withoutApps = {
  GOOGLE_BUSINESS_CLIENT_ID: "",
  GOOGLE_BUSINESS_CLIENT_SECRET: "",
  LINKEDIN_CLIENT_ID: "",
  LINKEDIN_CLIENT_SECRET: "",
  LINKEDIN_PAGES_CLIENT_ID: "",
  LINKEDIN_PAGES_CLIENT_SECRET: "",
  PINTEREST_APP_ID: "",
  PINTEREST_APP_SECRET: "",
  TIKTOK_CLIENT_KEY: "",
  TIKTOK_CLIENT_SECRET: "",
  X_CLIENT_ID: "",
  X_CLIENT_SECRET: "",
  YOUTUBE_CLIENT_ID: "",
  YOUTUBE_CLIENT_SECRET: "",
};

const channelsWith = (keys: string) =>
  channelsWithSettings({
    ...withoutApps,
    BLUESKY_CLIENT_KEYS: "",
    PEAL_TOKEN_KEYS: keys,
  });

// A Bluesky client key, as `bun nx run peal-server:bluesky-key` prints it.
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
          "googleBusiness",
          "instagram",
          "linkedin",
          "pinterest",
          "threads",
          "tiktok",
          "x",
          "youtube",
        ]);
        assert.isTrue(Option.isNone(documents.bluesky));
      })
  );
});

layer(DatabaseTest)(
  "the channels context's LinkedIn, X, TikTok, Google and Pinterest settings",
  (it) => {
    it.effect(
      "connect LinkedIn, X, TikTok, YouTube, Pinterest and Google Business Profile once their apps are set",
      () =>
        Effect.gen(function* configured() {
          const authorizers = yield* PlatformAuthorizers.pipe(
            Effect.provide(
              channelsWithSettings({
                BLUESKY_CLIENT_KEYS: "",
                GOOGLE_BUSINESS_CLIENT_ID:
                  "synthetic-business.apps.googleusercontent.example",
                GOOGLE_BUSINESS_CLIENT_SECRET: "synthetic-business-secret",
                LINKEDIN_CLIENT_ID: "77synthetic",
                LINKEDIN_CLIENT_SECRET: "synthetic-linkedin-secret",
                PINTEREST_APP_ID: "1500000",
                PINTEREST_APP_SECRET: "synthetic-pinterest-secret",
                TIKTOK_CLIENT_KEY: "awsynthetic",
                TIKTOK_CLIENT_SECRET: "synthetic-tiktok-secret",
                X_CLIENT_ID: "c3ludGhldGlj",
                X_CLIENT_SECRET: "synthetic-x-secret",
                YOUTUBE_CLIENT_ID: "synthetic.apps.googleusercontent.example",
                YOUTUBE_CLIENT_SECRET: "synthetic-google-secret",
              })
            )
          );

          assert.strictEqual(
            Option.getOrThrow(authorizers.for("linkedin")).platform,
            "linkedin"
          );
          assert.strictEqual(
            Option.getOrThrow(authorizers.for("x")).platform,
            "x"
          );
          assert.strictEqual(
            Option.getOrThrow(authorizers.for("tiktok")).platform,
            "tiktok"
          );
          assert.strictEqual(
            Option.getOrThrow(authorizers.for("youtube")).platform,
            "youtube"
          );
          assert.strictEqual(
            Option.getOrThrow(authorizers.for("pinterest")).platform,
            "pinterest"
          );
          assert.isFalse(authorizers.unconfigured.has("pinterest"));
          assert.strictEqual(
            Option.getOrThrow(authorizers.for("googleBusiness")).platform,
            "googleBusiness"
          );
          assert.isFalse(authorizers.unconfigured.has("googleBusiness"));
          // The first app connects profiles, and no page.
          assert.deepStrictEqual(authorizers.linkedinConnections, [
            "linkedinProfile",
          ]);
          assert.isTrue(
            Option.isNone(
              authorizers.for("linkedin", Option.some("linkedinPage"))
            )
          );
          assert.isFalse(authorizers.unconfigured.has("linkedin"));
          assert.isFalse(authorizers.unconfigured.has("x"));
          assert.isFalse(authorizers.unconfigured.has("tiktok"));
          assert.isFalse(authorizers.unconfigured.has("youtube"));
        }).pipe(Effect.scoped)
    );

    it.effect(
      "connect LinkedIn pages with the second app, beside profiles or alone",
      () =>
        Effect.gen(function* pages() {
          const pagesApp = {
            LINKEDIN_PAGES_CLIENT_ID: "88synthetic-pages",
            LINKEDIN_PAGES_CLIENT_SECRET: "synthetic-linkedin-pages-secret",
          };

          const both = yield* PlatformAuthorizers.pipe(
            Effect.provide(
              channelsWithSettings({
                ...withoutApps,
                ...pagesApp,
                BLUESKY_CLIENT_KEYS: "",
                LINKEDIN_CLIENT_ID: "77synthetic",
                LINKEDIN_CLIENT_SECRET: "synthetic-linkedin-secret",
              })
            )
          );

          assert.deepStrictEqual(both.linkedinConnections, [
            "linkedinProfile",
            "linkedinPage",
          ]);
          // Without a way in named, the profile.
          assert.strictEqual(
            Option.getOrThrow(both.for("linkedin")).connection,
            "linkedinProfile"
          );
          assert.strictEqual(
            Option.getOrThrow(both.for("linkedin", Option.some("linkedinPage")))
              .connection,
            "linkedinPage"
          );

          const alone = yield* PlatformAuthorizers.pipe(
            Effect.provide(
              channelsWithSettings({
                ...withoutApps,
                ...pagesApp,
                BLUESKY_CLIENT_KEYS: "",
              })
            )
          );

          assert.deepStrictEqual(alone.linkedinConnections, ["linkedinPage"]);
          assert.strictEqual(
            Option.getOrThrow(alone.for("linkedin")).connection,
            "linkedinPage"
          );
          assert.isFalse(alone.unconfigured.has("linkedin"));
          // A profile connected before the first app was removed cannot
          // be reconnected through the pages app.
          assert.isTrue(
            Option.isNone(alone.for("linkedin", Option.some("linkedinProfile")))
          );
        }).pipe(Effect.scoped)
    );

    it.effect("refuse to start with half of an app", () =>
      Effect.gen(function* refuses() {
        for (const [platform, settings] of [
          ["linkedin", { ...withoutApps, LINKEDIN_CLIENT_ID: "77synthetic" }],
          [
            "linkedin",
            {
              ...withoutApps,
              LINKEDIN_PAGES_CLIENT_SECRET: "synthetic-linkedin-pages-secret",
            },
          ],
          ["x", { ...withoutApps, X_CLIENT_SECRET: "synthetic-x-secret" }],
          ["tiktok", { ...withoutApps, TIKTOK_CLIENT_KEY: "awsynthetic" }],
          [
            "youtube",
            {
              ...withoutApps,
              YOUTUBE_CLIENT_SECRET: "synthetic-google-secret",
            },
          ],
          [
            "pinterest",
            {
              ...withoutApps,
              PINTEREST_APP_SECRET: "synthetic-pinterest-secret",
            },
          ],
          [
            "googleBusiness",
            {
              ...withoutApps,
              GOOGLE_BUSINESS_CLIENT_ID:
                "synthetic-business.apps.googleusercontent.example",
            },
          ],
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
  }
);

layer(DatabaseTest)("the channels context's Bluesky settings", (it) => {
  it.effect("publish a confidential client for keys on an HTTPS server", () =>
    Effect.gen(function* confidential() {
      const entry = yield* blueskyKeyEntry;

      const documents = yield* OAuthClientDocuments.pipe(
        Effect.provide(
          channelsWithSettings({
            BLUESKY_CLIENT_KEYS: entry,
            PUBLIC_URL: "https://peal.example",
          })
        )
      );

      const published = Option.getOrThrow(documents.bluesky);

      assert.strictEqual(
        published.metadata.client_id,
        "https://peal.example/api/channels/oauth/bluesky/client-metadata.json"
      );
      assert.deepStrictEqual(published.metadata.redirect_uris, [
        "https://peal.example/connect/bluesky/callback",
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
        { BLUESKY_CLIENT_KEYS: entry, PUBLIC_URL: "http://peal.example" },
        {
          BLUESKY_CLIENT_KEYS: "client-1:not-a-key",
          PUBLIC_URL: "https://peal.example",
        },
        {
          BLUESKY_CLIENT_KEYS: "no separator",
          PUBLIC_URL: "https://peal.example",
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

// A value the server takes for a setting that holds an app's credentials:
// the Bluesky key, digits for Meta's app ids, any text for the rest.
const syntheticSetting = (name: string, blueskyKey: string) => {
  if (name === "BLUESKY_CLIENT_KEYS") {
    return blueskyKey;
  }

  return name.endsWith("_APP_ID")
    ? "1234567890123456"
    : `synthetic-${name.toLowerCase()}`;
};

// The way in a registration's app connects, on the platforms that have
// several.
const connections: Partial<
  Record<PlatformRegistration["id"], ChannelConnection>
> = {
  facebookLogin: "facebookLogin",
  instagramLogin: "instagramLogin",
  linkedin: "linkedinProfile",
  linkedinPages: "linkedinPage",
};

const connectionOf = (id: PlatformRegistration["id"]) =>
  Option.fromUndefinedOr(connections[id]);

// The address the sign-in asks the platform to send the member back to.
const redirectOf = (authorizationUrl: string) =>
  new URL(authorizationUrl).searchParams.get("redirect_uri");

layer(DatabaseTest)(
  "the channels context with every platform's app, and the addresses to register",
  (it) => {
    const publicUrl = "https://peal.example";
    const registrations = platformRegistrations(publicUrl);

    const registered = (platform: string) =>
      registrations.filter((registration) =>
        registration.platforms.some((listed) => listed === platform)
      );

    // The server with the settings the list names, and nothing more: a
    // setting it names wrongly leaves its platform without an app.
    const everyApp = Effect.gen(function* everyApp() {
      const entry = yield* blueskyKeyEntry;

      return channelsWithSettings({
        ...Object.fromEntries(
          registrations
            .flatMap(({ settings }) => settings)
            .map((name) => [name, syntheticSetting(name, entry)])
        ),
        PEAL_TOKEN_KEYS: syntheticKeyring,
        PUBLIC_URL: publicUrl,
      });
    });

    it.effect("list every platform this server can connect, and no other", () =>
      Effect.gen(function* lists() {
        const authorizers = yield* PlatformAuthorizers.pipe(
          Effect.provide(yield* everyApp)
        );

        // A platform that gains a sign-in gets its settings from the list
        // above, so it must be in the list to be connected here.
        assert.deepStrictEqual([...authorizers.unconfigured], []);

        for (const platform of platforms) {
          assert.strictEqual(
            registered(platform).length > 0,
            Option.isSome(authorizers.for(platform)),
            platform
          );
        }

        // Every way in of every platform has its app in the list.
        assert.deepStrictEqual(authorizers.linkedinConnections, [
          "linkedinProfile",
          "linkedinPage",
        ]);
        assert.deepStrictEqual(authorizers.instagramConnections, [
          "instagramLogin",
          "facebookLogin",
        ]);
      }).pipe(Effect.scoped)
    );

    it.effect("hold the redirect address each sign-in sends its platform", () =>
      Effect.gen(function* redirects() {
        const layers = yield* everyApp;

        const { authorizers, documents } = yield* Effect.all({
          authorizers: PlatformAuthorizers,
          documents: OAuthClientDocuments,
        }).pipe(Effect.provide(layers));

        const request = {
          handle: Option.none<string>(),
          instance: Option.none<string>(),
          reconnecting: Option.none(),
        };

        const sent: string[] = [];

        for (const registration of registrations) {
          // Mastodon and Bluesky take their redirect address from the
          // server itself, over the network: Bluesky's is read below, from
          // the client it publishes.
          const signIns =
            registration.registeredBy === "server"
              ? []
              : registration.platforms.map((platform) =>
                  authorizers.for(platform, connectionOf(registration.id))
                );

          const listed = registration.addresses
            .filter(({ calledBy }) => calledBy === "browser")
            .map(({ url }) => url);

          for (const signIn of signIns) {
            const pending = yield* Option.getOrThrow(signIn).begin(request);
            const redirect = redirectOf(pending.authorizationUrl);

            assert.isNotNull(redirect, registration.id);
            assert.include(listed, redirect, registration.id);
            sent.push(redirect ?? "");
          }

          // Nothing is listed that no sign-in sends. A registration that
          // connects no channel (the ad network's sign-in) is the ads
          // context's, whose own test compares its redirect.
          if (
            registration.registeredBy === "operator" &&
            registration.platforms.length > 0
          ) {
            assert.deepStrictEqual(
              listed.toSorted(),
              sent.slice(-signIns.length).toSorted(),
              registration.id
            );
          }
        }

        const bluesky = Option.getOrThrow(documents.bluesky).metadata;

        assert.deepStrictEqual(
          registered("bluesky").flatMap(({ addresses }) =>
            addresses.map(({ url }) => url)
          ),
          [bluesky.client_id, bluesky.jwks_uri, ...bluesky.redirect_uris]
        );
      }).pipe(Effect.scoped)
    );
  }
);
