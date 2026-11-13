// Stripe's meter error events as their destination receives them: thin
// events, signed, read in full from Stripe's API (a stand-in here).
import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Context, Effect, Layer, Logger } from "effect";
import { Stripe } from "stripe";

import { MeterErrorEvents } from "#billing/application/ports/meter-error-events.ts";
import { StripeMeterErrorEventsLive } from "#billing/infrastructure/stripe-meter-error-events.ts";
import {
  json,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformAnswer } from "#test/publishing/fakes/platform-server.ts";

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

  it.effect(
    "count a signed report Stripe gives no sample of, or whose full event it refuses or the server cannot read, and wait on an outage, asked once",
    () =>
      Effect.gen(function* unreadable() {
        // What the full event answers, by the event's id.
        const answers = new Map<string, PlatformAnswer>(
          Object.entries({
            "/v2/core/events/evt_bare": json({
              data: {
                reason: {
                  error_types: [{ code: "no_meter", error_count: 4 }],
                },
              },
              id: "evt_bare",
              object: "v2.core.event",
            }),
            "/v2/core/events/evt_gone": json(
              {
                error: { message: "synthetic", type: "invalid_request_error" },
              },
              404
            ),
            "/v2/core/events/evt_odd": json({
              id: "evt_odd",
              object: "v2.core.event",
            }),
            "/v2/core/events/evt_outage": json(
              { error: { message: "synthetic", type: "api_error" } },
              500
            ),
          })
        );

        const stripe = yield* platformServer(
          ({ path }) => answers.get(path) ?? json({}, 404)
        );

        const events = yield* eventsOn(stripe.url, secret);

        const of = (id: string) => {
          const payload = JSON.stringify({
            id,
            object: "v2.core.event",
            type: "v1.billing.meter.no_meter_found",
          });

          return events.read(payload, signed(payload));
        };

        assert.deepStrictEqual(yield* of("evt_bare"), {
          _tag: "report",
          report: {
            errors: [{ code: "no_meter", count: 4, identifiers: [] }],
            eventId: "evt_bare",
          },
        });

        for (const id of ["evt_gone", "evt_odd"]) {
          assert.deepStrictEqual(yield* of(id), {
            _tag: "report",
            report: {
              errors: [{ code: "unreadable", count: 1, identifiers: [] }],
              eventId: id,
            },
          });
        }

        const outage = yield* of("evt_outage").pipe(Effect.flip);

        assert.strictEqual(outage._tag, "StripeUnreachable");
        // Asked once: Stripe sends the event again, not the client.
        assert.lengthOf(
          stripe
            .requests()
            .filter(({ path }) => path === "/v2/core/events/evt_outage"),
          1
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "say when the endpoint is on, and warn at the start of a server that bills without it",
    () =>
      Effect.gen(function* configured() {
        const lines: string[] = [];

        const logs = Logger.layer([
          Logger.make(({ message }) => {
            lines.push(JSON.stringify(message));
          }),
        ]);

        const on = yield* eventsOn("http://127.0.0.1:1", secret);

        const off = yield* eventsOn("http://127.0.0.1:1", "").pipe(
          Effect.provide(logs)
        );

        assert.isTrue(on.enabled);
        assert.isFalse(off.enabled);
        assert.isTrue(
          lines.some((line) => line.includes("STRIPE_METER_WEBHOOK_SECRET"))
        );
      }).pipe(Effect.scoped)
  );
});
