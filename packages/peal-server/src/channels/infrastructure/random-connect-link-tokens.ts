import { Effect, Layer, Redacted } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { Base64Url } from "effect/encoding";

import { ConnectLinkTokens } from "#channels/application/connect-link-tokens.ts";

const encoder = new TextEncoder();

// 256 bits: nobody guesses a link, so its plain SHA-256 is enough to keep.
const secretBytes = 32;

/**
 * Secrets of 32 random bytes, in base64url, kept as their SHA-256 in
 * hexadecimal.
 */
export const RandomConnectLinkTokens = Layer.effect(
  ConnectLinkTokens,
  Effect.gen(function* RandomConnectLinkTokens() {
    const random = yield* SecureRandom.SecureRandom;
    const digest = yield* Digest.Digest;

    // A digest that cannot be computed is a bug.
    const digestOf = (secret: Redacted.Redacted) =>
      digest
        .digestHex(Digest.sha256, encoder.encode(Redacted.value(secret)))
        .pipe(Effect.orDie);

    return ConnectLinkTokens.of({
      digestOf,
      issue: Effect.gen(function* issue() {
        const secret = Redacted.make(
          Base64Url.encode(
            yield* random.randomBytes(secretBytes).pipe(Effect.orDie)
          )
        );

        return { digest: yield* digestOf(secret), secret };
      }),
    });
  })
).pipe(
  Layer.provide(
    Digest.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);
