import { Effect } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import { ReceiveMeterErrors } from "#billing/application/receive-meter-errors.ts";

/** Where Stripe's event destination sends meter error events. */
export const meterErrorsPath = "/api/stripe/meter-errors";

/**
 * `POST /api/stripe/meter-errors`: Stripe's meter error events (thin
 * events), without credentials, taken only when signed with
 * STRIPE_METER_WEBHOOK_SECRET (400 otherwise). Read and recorded, or of
 * another kind: 200. Stripe not answering the read: 503, which Stripe
 * sends again.
 */
export const MeterErrorsLive = HttpRouter.use(
  Effect.fn(function* meterErrors(router) {
    const receiving = yield* ReceiveMeterErrors;

    yield* router.add(
      "POST",
      meterErrorsPath,
      Effect.gen(function* received() {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const body = yield* request.text.pipe(Effect.orElseSucceed(() => ""));
        const signature = request.headers["stripe-signature"] ?? "";

        return yield* receiving.receive(body, signature).pipe(
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
