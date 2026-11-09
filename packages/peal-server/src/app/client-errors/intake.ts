import {
  ByteSize,
  Config,
  Effect,
  Layer,
  Metric,
  Option,
  Schema,
} from "effect";
import { HttpIncomingMessage, HttpServerRequest } from "effect/http";
import { RateLimiter } from "effect/persistence";
import {
  ClientErrorIntake,
  ClientErrorTooLarge,
  maxClientErrorBytes,
  TooManyClientErrors,
} from "peal-contract";

import { requiredInProduction } from "#shared/infrastructure/environment.ts";

/** How many reports each address may send in a minute. */
export const reportsPerMinute = 30;

/**
 * Reports the intake dropped, by reason: `rateLimited` or `tooLarge`. A
 * flood shows here even while the reports themselves are refused.
 */
export const droppedClientErrors = Metric.counter(
  "peal.client_errors.dropped",
  {
    description: "Error reports from the web app that the server dropped",
    incremental: true,
  }
);

const drop = (reason: "rateLimited" | "tooLarge") =>
  Metric.update(Metric.withAttributes(droppedClientErrors, { reason }), 1);

const tooLarge = () =>
  drop("tooLarge").pipe(Effect.andThen(Effect.fail(new ClientErrorTooLarge())));

// The headers that carry the client's address: those sign-in rate limits
// read (AUTH_IP_HEADERS), which the edge sets and overwrites.
const addressHeadersConfig = requiredInProduction(
  Config.Array(Schema.String, "AUTH_IP_HEADERS"),
  ["x-forwarded-for"]
).pipe(
  Config.map((names) =>
    names.flatMap((name) => {
      const header = name.trim().toLowerCase();

      return header === "" ? [] : [header];
    })
  )
);

const longestAddress = 100;

/**
 * Who sent a request, for counting: the first address header present, else
 * the connection's address. Reports from the web app's own server count as
 * its address.
 */
export const addressOf = (
  request: HttpServerRequest.HttpServerRequest,
  headers: readonly string[]
): string => {
  for (const header of headers) {
    const value = request.headers[header]?.trim();

    if (value !== undefined && value !== "") {
      return value.slice(0, longestAddress);
    }
  }

  return Option.getOrElse(request.remoteAddress, () => "unknown");
};

const bodyLimit = ByteSize.bytes(maxClientErrorBytes);

/**
 * ClientErrorIntake: `reportsPerMinute` per address, counted in this
 * process, and bodies of `maxClientErrorBytes` at most, read here with that
 * limit before the report is decoded.
 */
export const ClientErrorIntakeLive = Layer.effect(
  ClientErrorIntake,
  Effect.gen(function* ClientErrorIntakeLive() {
    const limiter = yield* RateLimiter.make;
    const headers = yield* addressHeadersConfig;

    return ClientErrorIntake.of((httpEffect) =>
      Effect.gen(function* intake() {
        const request = yield* HttpServerRequest.HttpServerRequest;

        yield* limiter
          .consume({
            algorithm: "fixed-window",
            key: `client-errors:${addressOf(request, headers)}`,
            limit: reportsPerMinute,
            onExceeded: "fail",
            window: "1 minute",
          })
          .pipe(
            Effect.catchTag("RateLimiterError", (error) =>
              error.reason._tag === "RateLimitExceeded"
                ? drop("rateLimited").pipe(
                    Effect.andThen(Effect.fail(new TooManyClientErrors()))
                  )
                : Effect.die(error)
            )
          );

        const length = Number(request.headers["content-length"]);

        if (Number.isFinite(length) && length > maxClientErrorBytes) {
          return yield* tooLarge();
        }

        // The body is read once and kept: decoding reads it from here.
        yield* request.text.pipe(
          Effect.provideService(HttpIncomingMessage.MaxBodySize, bodyLimit),
          Effect.catchTag("HttpServerError", (error) =>
            error.reason._tag === "RequestParseError" &&
            error.reason.reason === "BodyTooLarge"
              ? tooLarge()
              : Effect.void
          )
        );

        return yield* httpEffect;
      })
    );
  })
).pipe(Layer.provide(RateLimiter.layerStoreMemory));
