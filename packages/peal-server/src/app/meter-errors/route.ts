import { ByteSize, Effect } from "effect";
import {
  HttpIncomingMessage,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { ReceiveMeterErrors } from "#billing/application/receive-meter-errors.ts";

/** Where Stripe's event destination sends meter error events. */
export const meterErrorsPath = "/api/stripe/meter-errors";

/** The most of a body read: a thin event is under a kilobyte. */
export const maxMeterErrorBytes = 64 * 1024;

const bodyLimit = ByteSize.bytes(maxMeterErrorBytes);

/**
 * `POST /api/stripe/meter-errors`: Stripe's meter error events (thin
 * events), without credentials, taken only when signed with
 * STRIPE_METER_WEBHOOK_SECRET (400 otherwise, and no body read where it is
 * unset), its body read up to `maxMeterErrorBytes` (413). Recorded, of
 * another kind, or delivered again: 200. Stripe not answering the read: 503, which Stripe
 * sends again.
 */
export const MeterErrorsLive = HttpRouter.use(
  Effect.fn(function* meterErrors(router) {
    const receiving = yield* ReceiveMeterErrors;

    yield* router.add(
      "POST",
      meterErrorsPath,
      Effect.gen(function* received() {
        if (!receiving.enabled) {
          return HttpServerResponse.empty({ status: 400 });
        }

        const request = yield* HttpServerRequest.HttpServerRequest;

        const body = yield* request.text.pipe(
          Effect.provideService(HttpIncomingMessage.MaxBodySize, bodyLimit),
          Effect.map((text) => ({ text })),
          Effect.catchTag("HttpServerError", (error) =>
            Effect.succeed(
              error.reason._tag === "RequestParseError" &&
                error.reason.reason === "BodyTooLarge"
                ? { tooLarge: true }
                : { text: "" }
            )
          )
        );

        if (!("text" in body)) {
          return HttpServerResponse.empty({ status: 413 });
        }

        const signature = request.headers["stripe-signature"] ?? "";

        return yield* receiving.receive(body.text, signature).pipe(
          Effect.map((outcome) =>
            HttpServerResponse.empty({
              status: outcome === "refused" ? 400 : 200,
            })
          ),
          Effect.catchTags({
            DatabaseError: Effect.die,
            StripeUnreachable: () =>
              Effect.logWarning(
                "Stripe did not answer the read of a meter error event"
              ).pipe(Effect.as(HttpServerResponse.empty({ status: 503 }))),
          })
        );
      })
    );
  })
);
