// The check a server that bills makes of Stripe's prices when it starts,
// against a stand-in for Stripe's API, and against stripe-mock, whose one
// price is none of Peal's.
import { assert, layer } from "@effect/vitest";
import { Config, ConfigProvider, Effect, Layer } from "effect";

import { priceOf } from "#billing/domain/prices.ts";
import { StripePricesCheckedLive } from "#billing/infrastructure/stripe-prices-checked.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";
import {
  empty,
  json,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
} from "#test/publishing/fakes/platform-server.ts";

// Peal's prices as Stripe lists them, each changed by `change` if it likes.
const prices = (
  change: (price: Record<string, JsonValue>) => Record<string, JsonValue>
): JsonValue[] =>
  PaidPlanSchema.literals.flatMap((plan) =>
    (["month", "year"] as const).map((interval) =>
      change({
        active: true,
        currency: "eur",
        id: `price_${plan}_${interval}`,
        lookup_key: `peal_${plan}_${interval}ly`,
        object: "price",
        recurring: { interval },
        tax_behavior: "exclusive",
        unit_amount: priceOf(plan, interval),
      })
    )
  );

const fakeStripe = (answer: () => PlatformAnswer) =>
  platformServer(({ method, path }) =>
    method === "GET" && path === "/v1/prices" ? answer() : empty(404)
  );

const listing = (data: JsonValue[]) =>
  json({ data, has_more: false, object: "list", url: "/v1/prices" });

// The server starting, as far as the check goes.
const startingOn = (settings: Readonly<Record<string, string>>) =>
  Layer.build(
    StripePricesCheckedLive.pipe(
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(settings)))
    )
  ).pipe(Effect.scoped, Effect.asVoid);

const billingOn = (apiUrl: string) =>
  startingOn({
    STRIPE_API_URL: apiUrl,
    STRIPE_SECRET_KEY: "sk_test_0123456789syntheticprices",
    STRIPE_WEBHOOK_SECRET: "whsec_synthetic_prices",
  });

layer(Layer.empty)("Stripe's prices when the server starts", (it) => {
  it.effect("lets a server start whose prices match what Peal publishes", () =>
    Effect.gen(function* matching() {
      const stripe = yield* fakeStripe(() => listing(prices((price) => price)));

      yield* billingOn(stripe.url);

      // One request, for the eight lookup keys.
      assert.lengthOf(stripe.requests(), 1);
      assert.sameMembers(
        [...(stripe.requests()[0]?.query.entries() ?? [])].flatMap(
          ([name, value]) => (name.startsWith("lookup_keys") ? [value] : [])
        ),
        PaidPlanSchema.literals.flatMap((plan) => [
          `peal_${plan}_monthly`,
          `peal_${plan}_yearly`,
        ])
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "stops a server whose prices are missing, differ or include tax, saying which",
    () =>
      Effect.gen(function* differing() {
        const stripe = yield* fakeStripe(() =>
          listing(
            prices((price) =>
              price["lookup_key"] === "peal_pro_monthly"
                ? { ...price, tax_behavior: "inclusive", unit_amount: 1500 }
                : price
            )
              .filter((price) => price !== null)
              .slice(1)
          )
        );

        const stopped = yield* billingOn(stripe.url).pipe(Effect.flip);

        assert.strictEqual(stopped._tag, "StripePricesMismatch");
        assert.strictEqual(
          stopped.message,
          [
            "Stripe's prices are not the ones this server publishes (billing/domain/prices.ts), so it does not start:",
            "- peal_starter_monthly: Stripe has no active price with this lookup key",
            "- peal_pro_monthly: Stripe charges 1500 eur, the pro plan costs 1250 eur excluding VAT",
            "- peal_pro_monthly: its tax behavior at Stripe is inclusive, not exclusive, so the VAT would not be added to it",
            "Create or correct them at Stripe (docs: self-hosting, Stripe), or set STRIPE_LOOKUP_KEY_PREFIX to the prefix of the right ones.",
          ].join("\n")
        );
      }).pipe(Effect.scoped)
  );

  it.effect("stops on stripe-mock's price, which is none of Peal's", () =>
    Effect.gen(function* mock() {
      const apiUrl = yield* Config.String("STRIPE_MOCK_URL").pipe(
        Config.withDefault("http://127.0.0.1:12111")
      );

      const stopped = yield* billingOn(apiUrl).pipe(Effect.flip);

      assert.strictEqual(stopped._tag, "StripePricesMismatch");
      assert.include(
        stopped.message,
        "peal_agency_yearly: Stripe has no active price with this lookup key"
      );
    })
  );

  it.effect("starts, with a warning, while Stripe does not answer", () =>
    Effect.gen(function* unreachable() {
      const stripe = yield* fakeStripe(() => empty(500));

      yield* billingOn(stripe.url);
      assert.isAbove(stripe.requests().length, 0);
    }).pipe(Effect.scoped)
  );

  it.effect("asks Stripe nothing on a server that does not bill", () =>
    startingOn({})
  );
});
