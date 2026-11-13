// Stripe's meter error events as their destination receives them: thin
// events, signed, read in full from Stripe's API (a stand-in here).
import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Context, Effect, Layer } from "effect";
import { Stripe } from "stripe";

import { MeterErrorEvents } from "#billing/application/ports/meter-error-events.ts";
import { StripeMeterErrorEventsLive } from "#billing/infrastructure/stripe-meter-error-events.ts";
import {
  json,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";

const secret = "whsec_synthetic_meter_errors";

const thin = (type: string) =>
  JSON.stringify({
    created: "2026-11-13T12:00:00.000Z",
    id: "evt_synthetic_thin",
    livemode: false,
    object: "v2.core.event",
    related_object: {
      id: "mtr_synthetic",
      type: "billing.meter",
      url: "/v1/billing/meters/mtr_synthetic",
    },
    type,
  });

const signed = (payload: string) =>
  new Stripe("sk_test_synthetic").webhooks.generateTestHeaderString({
    payload,
    secret,
  });

// The event in full, as GET /v2/core/events/:id answers it.
const full = {
  created: "2026-11-13T12:00:00.000Z",
  data: {
    developer_message_summary: "synthetic",
    reason: {
      error_count: 2,
      error_types: [
        {
          code: "meter_event_customer_not_found",
          error_count: 2,
          sample_errors: [
            {
              error_message: "synthetic",
              request: { identifier: "acc:synthetic:2026-11-13:3:1794571200" },
            },
          ],
        },
      ],
    },
    validation_end: "2026-11-13T12:00:00.000Z",
    validation_start: "2026-11-13T11:00:00.000Z",
  },
  id: "evt_synthetic_thin",
  object: "v2.core.event",
  type: "v1.billing.meter.error_report_triggered",
};

const eventsOn = (apiUrl: string, meterSecret: string) =>
  Layer.build(
    StripeMeterErrorEventsLive.pipe(
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            STRIPE_API_URL: apiUrl,
            STRIPE_METER_WEBHOOK_SECRET: meterSecret,
            STRIPE_SECRET_KEY: "sk_test_synthetic",
            STRIPE_WEBHOOK_SECRET: "whsec_synthetic_subscriptions",
          })
        )
      )
    )
  ).pipe(Effect.map(Context.get(MeterErrorEvents)));

layer(Layer.empty)("Stripe's meter error events", (it) => {
  it.effect(
    "read a signed report in full, and refuse one unsigned or with the endpoint off",
    () =>
      Effect.gen(function* reports() {
        const stripe = yield* platformServer(({ path }) =>
          path === "/v2/core/events/evt_synthetic_thin"
            ? json(full)
            : json(
                {
                  error: {
                    message: "synthetic",
                    type: "invalid_request_error",
                  },
                },
                404
              )
        );

        const events = yield* eventsOn(stripe.url, secret);
        const payload = thin("v1.billing.meter.error_report_triggered");

        assert.deepStrictEqual(yield* events.read(payload, signed(payload)), {
          _tag: "report",
          report: {
            errors: [
              {
                code: "meter_event_customer_not_found",
                count: 2,
                identifiers: ["acc:synthetic:2026-11-13:3:1794571200"],
              },
            ],
            eventId: "evt_synthetic_thin",
          },
        });
        assert.deepStrictEqual(yield* events.read(payload, "t=1,v1=forged"), {
          _tag: "refused",
        });

        const other = thin("v1.billing.meter.no_meter_found_but_other");

        assert.deepStrictEqual(yield* events.read(other, signed(other)), {
          _tag: "ignored",
        });

        const off = yield* eventsOn(stripe.url, "");

        assert.deepStrictEqual(yield* off.read(payload, signed(payload)), {
          _tag: "refused",
        });
      }).pipe(Effect.scoped)
  );
});
