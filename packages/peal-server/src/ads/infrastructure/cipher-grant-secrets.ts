import { Effect, Layer } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";

import { AdSignInFailed } from "#ads/application/ad-sign-in-failed.ts";
import { GrantSecrets } from "#ads/application/ports/grant-secrets.ts";
import {
  adGrantContext,
  EncryptedTokenSchema,
  TokenCipher,
} from "#channels/application/token-cipher.ts";

const encoder = new TextEncoder();

const unopenable = { _tag: "Unopenable" } as const;

/**
 * Grant tokens on the channels context's token cipher: encrypted with the
 * server's keyring (`PEAL_TOKEN_KEYS`), bound to `ads:<grant id>`. Peal
 * keeps one cipher: nothing here encrypts on its own. Sign-in states are
 * 32 random bytes, kept as their SHA-256.
 */
export const CipherGrantSecrets = Layer.effect(
  GrantSecrets,
  Effect.gen(function* CipherGrantSecrets() {
    const cipher = yield* TokenCipher;
    const random = yield* SecureRandom.SecureRandom;
    const digest = yield* Digest.Digest;

    const hashOf = (state: string) =>
      // Hashing a string cannot fail on a platform that has SHA-256.
      digest.digestHex(Digest.sha256, encoder.encode(state)).pipe(Effect.orDie);

    return GrantSecrets.of({
      hashOf,
      newState: Effect.gen(function* newState() {
        const state = Base64Url.encode(
          yield* random.randomBytes(32).pipe(Effect.orDie)
        );

        return { hash: yield* hashOf(state), state };
      }),
      open: (sealed, grantId) =>
        cipher
          .decryptSecret(
            EncryptedTokenSchema.make(sealed),
            adGrantContext(grantId)
          )
          .pipe(Effect.mapError(() => unopenable)),
      seal: (token, grantId) =>
        cipher
          .encryptSecret(token, adGrantContext(grantId))
          .pipe(
            Effect.mapError(
              () => new AdSignInFailed({ reason: "notConfigured" })
            )
          ),
    });
  })
).pipe(
  Layer.provide(
    Layer.mergeAll(SecureRandom.layerWebCrypto, Digest.layerWebCrypto)
  )
);
