import { Effect, Layer, Option } from "effect";
import { SecureRandom } from "effect/crypto";

import { ShortCodes } from "#shortlinks/application/short-codes.ts";
import { codeLength, codeOf } from "#shortlinks/domain/short-code.ts";
import type { ShortCode } from "#shortlinks/domain/short-code.ts";

// Enough bytes that a draw almost never skips too many to make a code:
// each byte is fair with probability 248/256.
const drawnBytes = codeLength * 2;

/** Codes from the platform's secure random source. */
export const RandomShortCodes = Layer.effect(
  ShortCodes,
  Effect.gen(function* RandomShortCodes() {
    const random = yield* SecureRandom.SecureRandom;

    const draw: Effect.Effect<ShortCode> = random.randomBytes(drawnBytes).pipe(
      Effect.orDie,
      Effect.flatMap((bytes) =>
        Option.match(codeOf(bytes), {
          onNone: () => draw,
          onSome: Effect.succeed,
        })
      )
    );

    return ShortCodes.of({ draw });
  })
).pipe(Layer.provide(SecureRandom.layerWebCrypto));
