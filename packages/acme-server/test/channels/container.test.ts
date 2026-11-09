import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Option, Redacted } from "effect";

import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { TokenCipher } from "#channels/application/token-cipher.ts";
import { ChannelsLive } from "#channels/container.ts";
import {
  actorIn,
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  syntheticKeyring,
} from "#test/channels/support.ts";

// The channels context as the server builds it, with this keyring. A blank
// keyring stands for an unset one, whatever the environment says.
const channelsWith = (keys: string) =>
  ChannelsLive.pipe(
    Layer.provide(
      ConfigProvider.layerAdd(
        ConfigProvider.fromUnknown({ ACME_TOKEN_KEYS: keys }),
        { asPrimary: true }
      )
    ),
    Layer.provideMerge(DatabaseTest)
  );

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
