import { Effect, Layer, Option } from "effect";

import { RequestLimiter } from "#activity/application/request-limiter.ts";
import { RequestPolicy } from "#activity/application/request-policy.ts";
import { RequestLimits } from "#workspace/application/request-limits.ts";
import { limitSubjectOf } from "#workspace/domain/limit-subject.ts";

/**
 * The rate limit, counted by the activity context. A count the database
 * cannot keep is logged, and the request goes through.
 */
export const CountedRequestLimits = Layer.effect(
  RequestLimits,
  Effect.gen(function* CountedRequestLimits() {
    const limiter = yield* RequestLimiter;
    const policy = yield* RequestPolicy;

    return RequestLimits.of({
      admit: (principal) =>
        Option.match(limitSubjectOf(principal), {
          onNone: () => Effect.succeedNone,
          onSome: (subject) =>
            limiter.admit(subject).pipe(
              Effect.map((standing) =>
                Option.some({ ...standing, policy: policy.name })
              ),
              Effect.catchCause((cause) =>
                Effect.logWarning(
                  "Counting a request for the rate limit failed",
                  cause
                ).pipe(Effect.as(Option.none()))
              )
            ),
        }),
    });
  })
);
