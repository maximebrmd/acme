import { Config, Effect, Layer } from "effect";
import { Digest } from "effect/crypto";

import { RequestPolicy } from "#activity/application/request-policy.ts";
import { SubjectDigest } from "#activity/application/subject-digest.ts";
import {
  defaultRequestsPerMinute,
  requestPolicy,
} from "#activity/domain/rate-limit.ts";

/**
 * How many requests a minute an API key, or an application acting for a
 * user, may send (`PEAL_API_REQUESTS_PER_MINUTE`, 600 unless set). Read
 * when the server starts, so a value that is not a positive integer stops
 * it there.
 */
export const RequestPolicyLive = Layer.effect(
  RequestPolicy,
  Config.Int("PEAL_API_REQUESTS_PER_MINUTE").pipe(
    Config.withDefault(defaultRequestsPerMinute),
    Config.map(requestPolicy)
  )
);

const encoder = new TextEncoder();

/** Subjects named by their SHA-256, in hexadecimal. */
export const SubjectDigestLive = Layer.effect(
  SubjectDigest,
  Effect.gen(function* SubjectDigestLive() {
    const digest = yield* Digest.Digest;

    return (subject: string) =>
      digest
        .digestHex(Digest.sha256, encoder.encode(subject))
        .pipe(Effect.orDie);
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
