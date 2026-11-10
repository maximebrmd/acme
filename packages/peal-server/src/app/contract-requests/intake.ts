import { Effect, Layer, Metric, Option } from "effect";
import { HttpServerRequest } from "effect/http";
import { RateLimiter } from "effect/persistence";
import {
  CaptchaRefused,
  ContractRequestIntake,
  TooManyContractRequests,
} from "peal-contract";

import { addressHeadersConfig, addressOf } from "#app/client-errors/intake.ts";
import { CaptchaChallenge } from "#workspace/application/captcha-challenge.ts";

/** How many requests to cancel or withdraw each address may send an hour. */
export const requestsPerHour = 5;

/** How many times each address may open or follow a link in an hour. */
export const confirmationsPerHour = 30;

/** Requests the intake refused, by reason: `rateLimited` or `captcha`. */
export const refusedContractRequests = Metric.counter(
  "peal.contract_requests.refused",
  {
    description:
      "Requests to cancel or withdraw that the server refused before reading them",
    incremental: true,
  }
);

const refuse = (reason: "captcha" | "rateLimited") =>
  Metric.update(Metric.withAttributes(refusedContractRequests, { reason }), 1);

// The endpoint a new request is sent to; the others open or follow a
// link. Told by the endpoint the router matched, never by the path as it
// was written: the router reads a path in any case and with any number of
// slashes, and a check that read it otherwise would let those through.
const sendEndpoint = "send";

const captchaHeader = "x-captcha-response";

/**
 * ContractRequestIntake: reading the settings passes; a new request counts
 * against `requestsPerHour` for its address, and needs a Turnstile token
 * that passes on a server with Turnstile; a link counts against
 * `confirmationsPerHour`. Counted in this process.
 */
export const ContractRequestIntakeLive = Layer.effect(
  ContractRequestIntake,
  Effect.gen(function* ContractRequestIntakeLive() {
    const limiter = yield* RateLimiter.make;
    const headers = yield* addressHeadersConfig;
    const captcha = yield* CaptchaChallenge;

    return ContractRequestIntake.of((httpEffect, { endpoint }) =>
      Effect.gen(function* intake() {
        const request = yield* HttpServerRequest.HttpServerRequest;

        if (request.method !== "POST") {
          return yield* httpEffect;
        }

        const sending = endpoint.identifier === sendEndpoint;

        yield* limiter
          .consume({
            algorithm: "fixed-window",
            key: `contract-requests:${sending ? "send" : "link"}:${addressOf(request, headers)}`,
            limit: sending ? requestsPerHour : confirmationsPerHour,
            onExceeded: "fail",
            window: "1 hour",
          })
          .pipe(
            Effect.catchTag("RateLimiterError", (error) =>
              error.reason._tag === "RateLimitExceeded"
                ? refuse("rateLimited").pipe(
                    Effect.andThen(Effect.fail(new TooManyContractRequests()))
                  )
                : Effect.die(error)
            )
          );

        if (sending) {
          const token = Option.fromUndefinedOr(
            request.headers[captchaHeader]
          ).pipe(Option.filter((value) => value.trim() !== ""));

          if (!(yield* captcha.passes(token))) {
            yield* refuse("captcha");

            return yield* new CaptchaRefused();
          }
        }

        return yield* httpEffect;
      })
    );
  })
).pipe(Layer.provide(RateLimiter.layerStoreMemory));
