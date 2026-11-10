import { ByteSize, Effect, Layer } from "effect";
import { HttpIncomingMessage, HttpServerRequest } from "effect/http";
import {
  maxReviewRequestBytes,
  ReviewRequestTooLarge,
  ReviewVisitor,
  ReviewVisitorAddress,
} from "peal-contract";

import {
  addressHeadersConfig,
  addressOf,
} from "#shared/infrastructure/client-address.ts";

const bodyLimit = ByteSize.bytes(maxReviewRequestBytes);

const tooLarge = () => Effect.fail(new ReviewRequestTooLarge());

/**
 * ReviewVisitor: bodies of `maxReviewRequestBytes` at most, read here with
 * that limit before they are decoded, and the address the request came
 * from (`AUTH_IP_HEADERS`, else the connection's), which the handlers count
 * visitors' writes by.
 */
export const ReviewVisitorLive = Layer.effect(
  ReviewVisitor,
  Effect.gen(function* ReviewVisitorLive() {
    const headers = yield* addressHeadersConfig;

    return ReviewVisitor.of((httpEffect) =>
      Effect.gen(function* visitor() {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const length = Number(request.headers["content-length"]);

        if (Number.isFinite(length) && length > maxReviewRequestBytes) {
          return yield* tooLarge();
        }

        // The body is read once and kept: decoding reads it from here.
        yield* request.text.pipe(
          Effect.provideService(HttpIncomingMessage.MaxBodySize, bodyLimit),
          Effect.catchTag("HttpServerError", (failure) =>
            failure.reason._tag === "RequestParseError" &&
            failure.reason.reason === "BodyTooLarge"
              ? tooLarge()
              : Effect.void
          )
        );

        return yield* httpEffect.pipe(
          Effect.provideService(
            ReviewVisitorAddress,
            ReviewVisitorAddress.of({ address: addressOf(request, headers) })
          )
        );
      })
    );
  })
);
