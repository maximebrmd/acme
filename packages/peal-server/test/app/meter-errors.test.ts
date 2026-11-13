// Stripe's meter error events reach the server without credentials: only
// a signed event is taken, and a server without the endpoint's secret
// takes none.
import { assert, layer } from "@effect/vitest";
import { Effect } from "effect";

import { TestApp } from "#test/workspace/integration/harness.ts";

layer(TestApp.layerWith({}))("the meter errors endpoint", (it) => {
  it.effect("refuses an event it cannot check", () =>
    Effect.gen(function* refused() {
      const app = yield* TestApp;

      const answer = yield* app.request("/api/stripe/meter-errors", {
        body: { id: "evt_synthetic", type: "v1.billing.meter.no_meter_found" },
        headers: { "stripe-signature": "t=1,v1=forged" },
        method: "POST",
      });

      assert.strictEqual(answer.status, 400);
    })
  );
});
