import { Effect, Layer } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";

import { LinkTokens } from "#review/application/ports/link-tokens.ts";

const encoder = new TextEncoder();

// 256 bits: a token nobody guesses, nor finds by trying.
const tokenBytes = 32;

/**
 * Link tokens from the platform's secure random source, base64url so they
 * sit in an address, and their SHA-256, in hex.
 */
export const SecureLinkTokens = Layer.effect(
  LinkTokens,
  Effect.gen(function* SecureLinkTokens() {
    const digest = yield* Digest.Digest;
    const random = yield* SecureRandom.SecureRandom;

    // Hashing a string in memory does not fail.
    const hashOf = (token: string) =>
      digest.digestHex(Digest.sha256, encoder.encode(token)).pipe(Effect.orDie);

    return LinkTokens.of({
      hashOf,
      issue: random.randomBytes(tokenBytes).pipe(
        Effect.map((bytes) => Base64Url.encode(bytes)),
        Effect.flatMap((token) =>
          hashOf(token).pipe(Effect.map((hash) => ({ hash, token })))
        )
      ),
    });
  })
).pipe(
  Layer.provide(
    Digest.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);
