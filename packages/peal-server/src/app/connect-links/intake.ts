import { Effect, Layer, Metric, Option } from "effect";
import { HttpServerRequest } from "effect/http";
import { RateLimiter } from "effect/persistence";
import { ConnectLinkIntake, TooManyConnectAttempts } from "peal-contract";

import { refused } from "#shared/api/forbidden.ts";
import {
  addressHeadersConfig,
  addressOf,
} from "#shared/infrastructure/client-address.ts";
import { Authenticate } from "#workspace/application/authenticate.ts";

/** How many times each address may open a connect link in an hour. */
export const opensPerHour = 120;

/**
 * How many times each address may start, complete or choose through
 * connect links in an hour: a sign-in takes two or three of them.
 */
export const stepsPerHour = 60;

/** Hosted requests the intake refused: `rateLimited` or `origin`. */
export const refusedConnectLinkRequests = Metric.counter(
  "peal.connect_links.refused",
  {
    description:
      "Requests of hosted connect pages that the server refused before reading them",
    incremental: true,
  }
);

const refuse = (reason: "origin" | "rateLimited") =>
  Metric.update(
    Metric.withAttributes(refusedConnectLinkRequests, { reason }),
    1
  );

/**
 * ConnectLinkIntake: opening a link counts against `opensPerHour` for its
 * address; every other step counts against `stepsPerHour`, and must come
 * from the web app itself (an `Origin` the server trusts), as it rests on
 * a cookie. Counted in this process. A link's token is never logged, nor
 * counted by: a guess is a miss like any other.
 */
export const ConnectLinkIntakeLive = Layer.effect(
  ConnectLinkIntake,
  Effect.gen(function* ConnectLinkIntakeLive() {
    const limiter = yield* RateLimiter.make;
    const headers = yield* addressHeadersConfig;
    const authenticate = yield* Authenticate;

    return ConnectLinkIntake.of((httpEffect) =>
      Effect.gen(function* intake() {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const reading = request.method === "GET" || request.method === "HEAD";

        if (
          !reading &&
          !authenticate.isTrustedOrigin(
            Option.fromNullishOr(request.headers["origin"])
          )
        ) {
          yield* refuse("origin");

          return yield* refused("untrustedOrigin");
        }

        yield* limiter
          .consume({
            algorithm: "fixed-window",
            key: `connect-links:${reading ? "open" : "step"}:${addressOf(request, headers)}`,
            limit: reading ? opensPerHour : stepsPerHour,
            onExceeded: "fail",
            window: "1 hour",
          })
          .pipe(
            Effect.catchTag("RateLimiterError", (error) =>
              error.reason._tag === "RateLimitExceeded"
                ? refuse("rateLimited").pipe(
                    Effect.andThen(Effect.fail(new TooManyConnectAttempts()))
                  )
                : Effect.die(error)
            )
          );

        return yield* httpEffect;
      })
    );
  })
).pipe(Layer.provide(RateLimiter.layerStoreMemory));
