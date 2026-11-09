import { Effect, Layer, Schema } from "effect";
import { SecureRandom } from "effect/crypto";

import { Ids } from "#shared/application/ids.ts";
import { Uuid7Schema } from "#shared/domain/ids.ts";

const decodeUuid7 = Schema.decodeUnknownEffect(Uuid7Schema);

// UUIDv7s from Effect's SecureRandom (RFC 9562, method 1): the timestamp
// comes from the Clock, so TestClock controls it, and a counter seeded from
// Web Crypto keeps ids issued within one millisecond in order. It runs the
// same on Bun and on Node, where the tests run.
export const IdsLive = Layer.effect(
  Ids,
  Effect.gen(function* IdsLive() {
    const random = yield* SecureRandom.SecureRandom;

    return Ids.of({
      // A generator that breaks the UUIDv7 format is a bug, not a failure
      // callers can handle.
      next: random.uuidV7().pipe(Effect.flatMap(decodeUuid7), Effect.orDie),
    });
  })
).pipe(Layer.provide(SecureRandom.layerWebCrypto));
