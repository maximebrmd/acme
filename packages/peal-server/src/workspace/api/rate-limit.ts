import { Effect, Option, Schema } from "effect";
import { HttpServerResponse } from "effect/http";
import { TooManyRequests } from "peal-contract";

import { setAnswerHeader } from "#shared/api/answer-headers.ts";
import type {
  RequestLimits,
  RequestStanding,
} from "#workspace/application/request-limits.ts";
import type { Principal } from "#workspace/domain/principal.ts";

/**
 * The headers that tell a client where it stands, as the IETF's "RateLimit
 * header fields for HTTP" draft writes them (structured fields): the policy
 * (`q` requests every `w` seconds) and what is left of it (`r` requests,
 * for `t` more seconds), and `Retry-After` on a refusal.
 */
export const limitHeaders = (
  standing: RequestStanding
): readonly (readonly [name: string, value: string])[] => {
  const headers = [
    [
      "ratelimit-policy",
      `"${standing.policy}";q=${String(standing.limit)};w=${String(standing.windowSeconds)}`,
    ],
    [
      "ratelimit",
      `"${standing.policy}";r=${String(standing.remaining)};t=${String(standing.resetAfterSeconds)}`,
    ],
  ] as const;

  return standing.allowed
    ? headers
    : [...headers, ["retry-after", String(standing.resetAfterSeconds)]];
};

const encodeRefusal = Schema.encodeSync(TooManyRequests);

/**
 * The answer to a request past the limit: `TooManyRequests`, as the
 * contract encodes it. An answer, not a failure: Authentication tries each
 * of its schemes in turn, and a failure of the bearer token's would be
 * taken for a missing one.
 */
export const tooManyRequests = (
  standing: RequestStanding
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.jsonUnsafe(
    encodeRefusal(
      new TooManyRequests({
        limit: standing.limit,
        retryAfterSeconds: standing.resetAfterSeconds,
        windowSeconds: standing.windowSeconds,
      })
    ),
    { status: 429 }
  );

/**
 * Counts a request for its principal, if it is counted, and leaves where
 * it stands for the answer's headers, whatever the answer is. Past the
 * limit, the standing to refuse it with, before anything is handled.
 */
export const pastLimit = (
  limits: RequestLimits["Service"],
  principal: Principal
): Effect.Effect<Option.Option<RequestStanding>> =>
  limits.admit(principal).pipe(
    Effect.tap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (standing) =>
          Effect.forEach(
            limitHeaders(standing),
            ([name, value]) => setAnswerHeader(name, value),
            { discard: true }
          ),
      })
    ),
    Effect.map(Option.filter((standing) => !standing.allowed))
  );
