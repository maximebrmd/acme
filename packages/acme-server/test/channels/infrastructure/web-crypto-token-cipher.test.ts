import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Redacted, Result } from "effect";
import { Base64, Base64Url } from "effect/encoding";

import {
  appSecretContext,
  connectAttemptContext,
  EncryptedTokenSchema,
  TokenCipher,
} from "#channels/application/token-cipher.ts";
import type {
  EncryptedToken,
  SecretContext,
} from "#channels/application/token-cipher.ts";
import { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

// Synthetic keys: 32 bytes of one repeated value each, never used outside tests.
const syntheticKey = (byte: number): string =>
  Base64.encode(new Uint8Array(32).fill(byte));

const firstKey = syntheticKey(1);
const secondKey = syntheticKey(2);

const channel = ChannelIdSchema.make("00000000-0000-7000-8000-000000000020");

const otherChannel = ChannelIdSchema.make(
  "00000000-0000-7000-8000-000000000021"
);

const token = Redacted.make("synthetic-access-token-0123456789");

const cipherWith = (keys: Record<string, string>) =>
  TokenCipherLive.pipe(
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(keys)))
  );

const keyring = (keys: string) => cipherWith({ ACME_TOKEN_KEYS: keys });

const encryptWith = (keys: string) =>
  TokenCipher.use((cipher) => cipher.encrypt(token, channel)).pipe(
    Effect.provide(keyring(keys))
  );

const decryptWith = (
  keys: string,
  encrypted: EncryptedToken,
  channelId = channel
) =>
  TokenCipher.use((cipher) => cipher.decrypt(encrypted, channelId)).pipe(
    Effect.provide(keyring(keys))
  );

const startup = (keys: Record<string, string>) =>
  Effect.flip(Effect.scoped(Layer.build(cipherWith(keys))));

const byteLength = (segment: string | undefined) =>
  Base64Url.decode(segment ?? "").pipe(Result.map((bytes) => bytes.length));

// Changes one byte of the segment at `index` of the stored form.
const tamper = (encrypted: EncryptedToken, index: number): EncryptedToken => {
  const segments = encrypted.split(".");
  const bytes = Result.getOrThrow(Base64Url.decode(segments[index] ?? ""));

  bytes[0] = ((bytes[0] ?? 0) + 1) % 256;
  segments[index] = Base64Url.encode(bytes);

  return EncryptedTokenSchema.make(segments.join("."));
};

describe("the Web Crypto token cipher", () => {
  const keys = `k1:${firstKey}`;

  it.effect("decrypts what it encrypted", () =>
    Effect.gen(function* roundTrip() {
      const encrypted = yield* encryptWith(keys);
      const decrypted = yield* decryptWith(keys, encrypted);

      assert.strictEqual(Redacted.value(decrypted), Redacted.value(token));
      assert.notInclude(encrypted, Redacted.value(token));
    })
  );

  it.effect("stores the key id, a 12-byte IV and the sealed token", () =>
    Effect.gen(function* storedForm() {
      const encrypted = yield* encryptWith(keys);
      const segments = encrypted.split(".");

      assert.strictEqual(segments.length, 3);
      assert.strictEqual(segments[0], "k1");
      assert.deepStrictEqual(byteLength(segments[1]), Result.succeed(12));
      // GCM adds a 16-byte tag to the ciphertext.
      assert.deepStrictEqual(
        byteLength(segments[2]),
        Result.succeed(Redacted.value(token).length + 16)
      );
    })
  );

  it.effect("draws a new IV for every value", () =>
    Effect.gen(function* freshIvs() {
      const once = yield* encryptWith(keys);
      const twice = yield* encryptWith(keys);

      assert.notStrictEqual(twice, once);
    })
  );

  it.effect("refuses a token decrypted for another channel", () =>
    Effect.gen(function* wrongChannel() {
      const encrypted = yield* encryptWith(keys);

      const error = yield* Effect.flip(
        decryptWith(keys, encrypted, otherChannel)
      );

      assert.strictEqual(error._tag, "TokenAuthenticationFailed");
    })
  );

  it.effect.each([
    { index: 2, part: "ciphertext" },
    { index: 1, part: "IV" },
  ])("refuses a token whose $part was changed", ({ index }) =>
    Effect.gen(function* tampered() {
      const encrypted = yield* encryptWith(keys);

      const error = yield* Effect.flip(
        decryptWith(keys, tamper(encrypted, index))
      );

      assert.strictEqual(error._tag, "TokenAuthenticationFailed");
    })
  );

  it.effect("refuses a token relabelled with another listed key", () =>
    Effect.gen(function* relabelled() {
      const encrypted = yield* encryptWith(keys);

      const relabel = EncryptedTokenSchema.make(
        encrypted.replace(/^k1\./u, "k2.")
      );

      const error = yield* Effect.flip(
        decryptWith(`k2:${secondKey},k1:${firstKey}`, relabel)
      );

      assert.strictEqual(error._tag, "TokenAuthenticationFailed");
    })
  );

  it.effect.each([
    { label: "no IV", stored: "k1" },
    { label: "no ciphertext", stored: "k1.AAAAAAAAAAAAAAAA" },
    {
      label: "a fourth part",
      stored: "k1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AAAA",
    },
    {
      label: "an IV that is not base64url",
      stored: "k1.not*base64.AAAAAAAAAAAAAAAAAAAAAA",
    },
    { label: "a 6-byte IV", stored: "k1.AAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA" },
    {
      label: "a ciphertext shorter than the tag",
      stored: "k1.AAAAAAAAAAAAAAAA.AAAAAAAA",
    },
    {
      label: "a key id with spaces",
      stored: "not a key.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA",
    },
  ])("refuses a stored token with $label", ({ stored }) =>
    Effect.gen(function* malformed() {
      const error = yield* Effect.flip(
        decryptWith(keys, EncryptedTokenSchema.make(stored))
      );

      assert.strictEqual(error._tag, "MalformedEncryptedToken");
    })
  );
});

describe("rotating token keys", () => {
  const before = `k1:${firstKey}`;
  const after = `k2:${secondKey},k1:${firstKey}`;

  it.effect("still decrypts tokens encrypted with an older key", () =>
    Effect.gen(function* oldKeyDecrypts() {
      const encrypted = yield* encryptWith(before);
      const decrypted = yield* decryptWith(after, encrypted);

      assert.strictEqual(Redacted.value(decrypted), Redacted.value(token));
    })
  );

  it.effect("encrypts new tokens with the first key", () =>
    Effect.gen(function* newKeyEncrypts() {
      const encrypted = yield* encryptWith(after);

      assert.isTrue(encrypted.startsWith("k2."));
    })
  );

  it.effect("names the key once it has left the keyring", () =>
    Effect.gen(function* removedKey() {
      const encrypted = yield* encryptWith(before);

      const error = yield* Effect.flip(
        decryptWith(`k2:${secondKey}`, encrypted)
      );

      assert.deepInclude(error, { _tag: "UnknownTokenKey", keyId: "k1" });
    })
  );
});

describe("the token keyring", () => {
  it.effect.each([
    { keys: "k1", label: "an entry without a key" },
    { keys: firstKey, label: "a key without an id" },
    { keys: `k1:${firstKey},`, label: "an empty entry" },
    { keys: "k1:not base64!", label: "a key that is not base64" },
    {
      keys: `k1:${Base64.encode(new Uint8Array(16).fill(3))}`,
      label: "a 16-byte key",
    },
    { keys: `k1:${firstKey},k1:${secondKey}`, label: "a key id listed twice" },
    { keys: `key one:${firstKey}`, label: "a key id with a space" },
  ])("fails at startup on $label", ({ keys }) =>
    Effect.gen(function* malformedKeyring() {
      const error = yield* startup({ ACME_TOKEN_KEYS: keys });

      assert.strictEqual(error._tag, "InvalidTokenKeyring");
      // The reason names entries and key ids, never key material.
      assert.notInclude(String(error), firstKey);
      assert.notInclude(String(error), secondKey);
    })
  );
});

describe("a server without token keys", () => {
  // A token another server stored with its key k1.
  const stored = "k1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA";

  const unset = (keys: Record<string, string>) =>
    TokenCipher.use((cipher) =>
      Effect.all({
        decrypted: Effect.flip(
          cipher.decrypt(EncryptedTokenSchema.make(stored), channel)
        ),
        encrypted: Effect.flip(cipher.encrypt(token, channel)),
      })
    ).pipe(Effect.provide(cipherWith(keys)));

  it.effect.each([
    { keys: {}, label: "ACME_TOKEN_KEYS unset" },
    { keys: { ACME_TOKEN_KEYS: "" }, label: "ACME_TOKEN_KEYS empty" },
    { keys: { ACME_TOKEN_KEYS: "  " }, label: "ACME_TOKEN_KEYS blank" },
  ])("starts with $label, and stores no token until keys are set", ({ keys }) =>
    Effect.gen(function* withoutKeys() {
      const { decrypted, encrypted } = yield* unset(keys);

      assert.strictEqual(encrypted._tag, "MissingTokenKey");
      assert.deepInclude(decrypted, { _tag: "UnknownTokenKey", keyId: "k1" });
    })
  );
});

const secret = Redacted.make("synthetic-pkce-verifier-0123456789");

const sealedFor = (context: SecretContext) =>
  TokenCipher.use((cipher) => cipher.encryptSecret(secret, context)).pipe(
    Effect.provide(keyring(`k1:${firstKey}`))
  );

const openedFor = (encrypted: EncryptedToken, context: SecretContext) =>
  TokenCipher.use((cipher) => cipher.decryptSecret(encrypted, context)).pipe(
    Effect.provide(keyring(`k1:${firstKey}`))
  );

describe("secrets that belong to no channel", () => {
  it.effect("decrypt for the context they were encrypted for", () =>
    Effect.gen(function* roundTrips() {
      const context = connectAttemptContext("state-1");
      const encrypted = yield* sealedFor(context);

      assert.isTrue(encrypted.startsWith("k1."));
      assert.notInclude(encrypted, "verifier");
      assert.strictEqual(
        Redacted.value(yield* openedFor(encrypted, context)),
        Redacted.value(secret)
      );
    })
  );

  it.effect("decrypt for no other context, nor as a channel's token", () =>
    Effect.gen(function* bound() {
      const encrypted = yield* sealedFor(connectAttemptContext("state-1"));

      for (const opened of [
        openedFor(encrypted, connectAttemptContext("state-2")),
        openedFor(encrypted, appSecretContext("https://mastodon.example")),
        decryptWith(`k1:${firstKey}`, encrypted),
      ]) {
        const failure = yield* Effect.flip(opened);

        assert.strictEqual(failure._tag, "TokenAuthenticationFailed");
      }
    })
  );
});
