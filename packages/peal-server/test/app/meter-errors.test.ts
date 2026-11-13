// Stripe's meter error events reach the server without credentials: only
// a signed event is taken, a server without the endpoint's secret reads
// none, and no body is read past its size.
import { assert, layer } from "@effect/vitest";
import { Config, Effect, Layer } from "effect";

import { TestApp } from "#test/workspace/integration/harness.ts";

const stripeMockUrl = Config.String("STRIPE_MOCK_URL").pipe(
  Config.withDefault("http://127.0.0.1:12111")
);

// A thin event's body is under a kilobyte.
const tooLarge = { padding: "x".repeat(70_000) };

layer(TestApp.layerWith({}))("the meter errors endpoint, not set up", (it) => {
  it.effect("refuses every event, whatever its size", () =>
    Effect.gen(function* refused() {
      const app = yield* TestApp;

      for (const body of [{ id: "evt_synthetic" }, tooLarge]) {
        const answer = yield* app.request("/api/stripe/meter-errors", {
          body,
          headers: { "stripe-signature": "t=1,v1=forged" },
          method: "POST",
        });

        assert.strictEqual(answer.status, 400);
      }
    })
  );
});

const BilledApp = Layer.unwrap(
  Effect.gen(function* billedApp() {
    return TestApp.layerWith({
      STRIPE_API_URL: yield* stripeMockUrl,
      STRIPE_METER_WEBHOOK_SECRET: "whsec_synthetic_meter_errors",
      STRIPE_SECRET_KEY: "sk_test_synthetic",
      STRIPE_WEBHOOK_SECRET: "whsec_synthetic_meter_subscriptions",
    });
  })
);

layer(BilledApp)("the meter errors endpoint, set up", (it) => {
  it.effect("refuses an unsigned event, and reads no body past 64 KB", () =>
    Effect.gen(function* setUp() {
      const app = yield* TestApp;

      const forged = yield* app.request("/api/stripe/meter-errors", {
        body: { id: "evt_synthetic", type: "v1.billing.meter.no_meter_found" },
        headers: { "stripe-signature": "t=1,v1=forged" },
        method: "POST",
      });

      assert.strictEqual(forged.status, 400);

      const large = yield* app.request("/api/stripe/meter-errors", {
        body: tooLarge,
        headers: { "stripe-signature": "t=1,v1=forged" },
        method: "POST",
      });

      assert.strictEqual(large.status, 413);
    })
  );
});
