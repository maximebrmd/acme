import { Effect, Layer, Redacted } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { Hex } from "effect/encoding";

import { Pseudonyms } from "#shared/application/pseudonyms.ts";

import { authSecretConfig } from "./auth-secret.ts";

const encoder = new TextEncoder();

// Apart from anything else the secret keys, and from each other.
const emailPurpose = "peal-pseudonym-v1:email:";
const memberPurpose = "peal-pseudonym-v1:platform-member:";

/**
 * Pseudonyms as the HMAC-SHA256 of the lowercased, trimmed email address,
 * or of a platform's member's identifier as the platform gives it, keyed
 * with the server's secret, in hexadecimal. Changing the secret changes
 * every pseudonym, so the records kept forget whom they were about.
 */
export const KeyedPseudonymsLive = Layer.effect(
  Pseudonyms,
  Effect.gen(function* KeyedPseudonymsLive() {
    const secret = yield* authSecretConfig;
    const mac = yield* Mac.Mac;

    const key = yield* Mac.key(
      Mac.hmacSha256,
      encoder.encode(Redacted.value(secret))
    ).pipe(Effect.orDie);

    const tagOf = (text: string, span: string) =>
      mac.sign(key, encoder.encode(text)).pipe(
        Effect.map((tag) => Hex.encode(tag)),
        // A tag that cannot be computed is a bug.
        Effect.orDie,
        Effect.withSpan(span)
      );

    return Pseudonyms.of({
      ofEmail: (email) =>
        tagOf(
          `${emailPurpose}${email.trim().toLowerCase()}`,
          "Pseudonyms.ofEmail"
        ),
      ofPlatformMember: (platform, memberId) =>
        tagOf(
          `${memberPurpose}${platform}:${memberId}`,
          "Pseudonyms.ofPlatformMember"
        ),
    });
  })
).pipe(
  Layer.provide(
    Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
  )
);
