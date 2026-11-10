import { Effect, Layer } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";

import { RequestTokens } from "#billing/application/ports/request-tokens.ts";

const encoder = new TextEncoder();

// 256 bits: nobody guesses a link.
const tokenBytes = 32;

/**
 * Tokens of 32 random bytes, in base64url, kept as their SHA-256 in
 * hexadecimal.
 */
export const RandomRequestTokensLive = Layer.effect(
  RequestTokens,
  Effect.gen(function* RandomRequestTokensLive() {
    const random = yield* SecureRandom.SecureRandom;
    const digest = yield* Digest.Digest;

    // A digest that cannot be computed is a bug.
    const digestOf = (token: string) =>
      digest.digestHex(Digest.sha256, encoder.encode(token)).pipe(Effect.orDie);

    return RequestTokens.of({
      digestOf,
      issue: Effect.gen(function* issue() {
        const token = Base64Url.encode(
          yield* random.randomBytes(tokenBytes).pipe(Effect.orDie)
        );

        return { digest: yield* digestOf(token), token };
      }),
    });
  })
).pipe(
  Layer.provide(
    Digest.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);
