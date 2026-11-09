import { Config, Effect, Layer, Option, Redacted, Result } from "effect";
import { Aead, SecureRandom } from "effect/crypto";
import { Base64, Base64Url } from "effect/encoding";

import { MalformedEncryptedToken } from "#channels/application/malformed-encrypted-token.ts";
import { MissingTokenKey } from "#channels/application/missing-token-key.ts";
import { TokenAuthenticationFailed } from "#channels/application/token-authentication-failed.ts";
import {
  EncryptedTokenSchema,
  TokenCipher,
} from "#channels/application/token-cipher.ts";
import type {
  EncryptedToken,
  SecretContext,
} from "#channels/application/token-cipher.ts";
import { UnknownTokenKey } from "#channels/application/unknown-token-key.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { InvalidTokenKeyring } from "./invalid-token-keyring.ts";

// AES-256-GCM on Web Crypto, through Effect's Aead.
//
// ACME_TOKEN_KEYS lists "keyId:base64key" entries separated by commas, each
// key 32 random bytes in standard base64 (`openssl rand -base64 32`). The
// first key encrypts; every listed key decrypts. To rotate, put a new key
// first and keep the old ones until every token has been re-encrypted.
//
// The keyring is optional, so a server that connects no channel needs none:
// left unset or blank, encrypting fails with MissingTokenKey and decrypting
// with UnknownTokenKey. A keyring that is set but malformed still stops the
// server at startup, rather than when the first channel is connected.
//
// A token is stored as "<keyId>.<iv>.<ciphertext>", the last two in
// unpadded base64url. The IV is 12 random bytes per value, and the ciphertext
// ends with GCM's 16-byte tag, which also covers the channel id passed as
// additional data. Random IVs stay safe for up to about 2^32 encryptions under
// one key, far more than a keyring's lifetime of tokens.

const keyIdPattern = /^[\w-]{1,64}$/u;

const segmentPattern = /^[\w-]+$/u;

const ivLength = 12;

const tagLength = 16;

const { keyLength } = Aead.aes256Gcm;

interface KeyringEntry {
  readonly id: string;
  readonly key: Aead.Key;
}

interface Keyring {
  // The key that encrypts, absent when no keyring is set.
  readonly current: Option.Option<KeyringEntry>;
  readonly keys: ReadonlyMap<string, Aead.Key>;
}

interface StoredToken {
  readonly iv: Uint8Array;
  readonly keyId: string;
  readonly sealed: Uint8Array;
}

const invalid = (reason: string) => new InvalidTokenKeyring({ reason });

const parseEntry = (
  entry: string,
  position: number
): Effect.Effect<KeyringEntry, InvalidTokenKeyring> => {
  const separator = entry.indexOf(":");

  if (separator === -1) {
    return Effect.fail(invalid(`entry ${position} is not keyId:base64key`));
  }

  const id = entry.slice(0, separator).trim();

  if (!keyIdPattern.test(id)) {
    return Effect.fail(
      invalid(
        `entry ${position} needs a key id of 1 to 64 letters, digits, - or _`
      )
    );
  }

  const bytes = Base64.decode(entry.slice(separator + 1).trim());

  if (Result.isFailure(bytes)) {
    return Effect.fail(invalid(`key ${id} is not base64`));
  }

  if (bytes.success.length !== keyLength) {
    return Effect.fail(
      invalid(
        `key ${id} has ${bytes.success.length} bytes, and AES-256 needs ${keyLength}`
      )
    );
  }

  return Aead.key(Aead.aes256Gcm, bytes.success).pipe(
    Effect.mapError(() => invalid(`key ${id} is not an AES-256 key`)),
    Effect.map((key) => ({ id, key }))
  );
};

const parseKeyring = Effect.fnUntraced(function* parseKeyring(
  value: Redacted.Redacted
) {
  const entries = yield* Effect.forEach(
    Redacted.value(value).split(","),
    (entry, index) => parseEntry(entry, index + 1)
  );

  const [current] = entries;

  if (current === undefined) {
    return yield* invalid("it lists no keys");
  }

  const keys = new Map<string, Aead.Key>();

  for (const { id, key } of entries) {
    if (keys.has(id)) {
      return yield* invalid(`key ${id} is listed twice`);
    }

    keys.set(id, key);
  }

  const keyring: Keyring = { current: Option.some(current), keys };

  return keyring;
});

const emptyKeyring: Keyring = { current: Option.none(), keys: new Map() };

// ACME_TOKEN_KEYS, unless it is unset or blank, as `KEY=` in an env file.
const keyringConfig = Config.option(Config.Redacted("ACME_TOKEN_KEYS")).pipe(
  Config.map(Option.filter((value) => Redacted.value(value).trim() !== ""))
);

const decodeSegment = (segment: string): Option.Option<Uint8Array> =>
  segmentPattern.test(segment)
    ? Result.getSuccess(Base64Url.decode(segment))
    : Option.none();

const parseStored = (encrypted: string): Option.Option<StoredToken> => {
  const [keyId, ivText, sealedText, ...rest] = encrypted.split(".");

  if (
    keyId === undefined ||
    ivText === undefined ||
    sealedText === undefined ||
    rest.length > 0 ||
    !keyIdPattern.test(keyId)
  ) {
    return Option.none();
  }

  return Option.all({
    iv: Option.filter(decodeSegment(ivText), (iv) => iv.length === ivLength),
    keyId: Option.some(keyId),
    sealed: Option.filter(
      decodeSegment(sealedText),
      (sealed) => sealed.length >= tagLength
    ),
  });
};

const encoder = new TextEncoder();

const decoder = new TextDecoder("utf-8");

/**
 * Reads the keyring from ACME_TOKEN_KEYS, if it is set, and fails at startup
 * if it is malformed.
 */
export const TokenCipherLive = Layer.effect(
  TokenCipher,
  Effect.gen(function* TokenCipherLive() {
    const keyring = yield* keyringConfig.pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.succeed(emptyKeyring),
          onSome: parseKeyring,
        })
      )
    );

    const aead = yield* Aead.Aead;
    const random = yield* SecureRandom.SecureRandom;

    const seal = Effect.fn("TokenCipher.encrypt")(function* seal(
      token: Redacted.Redacted,
      boundTo: string
    ) {
      if (Option.isNone(keyring.current)) {
        return yield* new MissingTokenKey();
      }

      const { id, key } = keyring.current.value;
      const iv = yield* random.randomBytes(ivLength);

      // Aead only fails on a wrong IV length or a plaintext over 64 GiB.
      const sealed = yield* Effect.orDie(
        aead.encrypt(key, encoder.encode(Redacted.value(token)), {
          aad: encoder.encode(boundTo),
          nonce: iv,
        })
      );

      return EncryptedTokenSchema.make(
        `${id}.${Base64Url.encode(iv)}.${Base64Url.encode(sealed)}`
      );
    });

    const open = Effect.fn("TokenCipher.decrypt")(function* open(
      encrypted: EncryptedToken,
      boundTo: string
    ) {
      const stored = parseStored(encrypted);

      if (Option.isNone(stored)) {
        return yield* new MalformedEncryptedToken();
      }

      const { iv, keyId, sealed } = stored.value;
      const key = keyring.keys.get(keyId);

      if (key === undefined) {
        return yield* new UnknownTokenKey({ keyId });
      }

      const plaintext = yield* aead
        .decrypt(key, sealed, { aad: encoder.encode(boundTo), nonce: iv })
        .pipe(
          Effect.catchReason(
            "CryptoError",
            "DecryptionFailed",
            () => Effect.fail(new TokenAuthenticationFailed()),
            (_reason, error) => Effect.die(error)
          )
        );

      return Redacted.make(decoder.decode(plaintext));
    });

    // A secret's context starts with "app:" or "connect:", so it never equals
    // a channel id, a UUID: neither decrypts as the other.
    return TokenCipher.of({
      decrypt: (encrypted: EncryptedToken, channelId: ChannelId) =>
        open(encrypted, channelId),
      decryptSecret: (encrypted: EncryptedToken, context: SecretContext) =>
        open(encrypted, context),
      encrypt: (token: Redacted.Redacted, channelId: ChannelId) =>
        seal(token, channelId),
      encryptSecret: (secret: Redacted.Redacted, context: SecretContext) =>
        seal(secret, context),
    });
  })
).pipe(
  Layer.provide(
    Aead.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);
