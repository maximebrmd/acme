import { Effect, Layer, Redacted } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";

import { PartnerKeyTokens } from "#workspace/application/partner-key-tokens.ts";
import { partnerKeyPrefix } from "#workspace/domain/partner-key.ts";

const encoder = new TextEncoder();

// 256 bits: nobody guesses a key, so its plain SHA-256 is enough to keep.
const keyBytes = 32;

// What is kept in the clear to tell keys apart: the prefix and four
// characters, which say nothing of the other thirty-nine.
const startLength = partnerKeyPrefix.length + 4;

/**
 * Partner keys of 32 random bytes in base64url after their prefix, kept as
 * their SHA-256 in hexadecimal.
 */
export const RandomPartnerKeyTokens = Layer.effect(
  PartnerKeyTokens,
  Effect.gen(function* RandomPartnerKeyTokens() {
    const random = yield* SecureRandom.SecureRandom;
    const digest = yield* Digest.Digest;

    // A digest that cannot be computed is a bug.
    const digestOf = (token: Redacted.Redacted) =>
      digest
        .digestHex(Digest.sha256, encoder.encode(Redacted.value(token)))
        .pipe(Effect.orDie);

    return PartnerKeyTokens.of({
      digestOf,
      issue: Effect.gen(function* issue() {
        const key = `${partnerKeyPrefix}${Base64Url.encode(
          yield* random.randomBytes(keyBytes).pipe(Effect.orDie)
        )}`;

        const token = Redacted.make(key);

        return {
          digest: yield* digestOf(token),
          start: key.slice(0, startLength),
          token,
        };
      }),
    });
  })
).pipe(
  Layer.provide(
    Digest.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);
