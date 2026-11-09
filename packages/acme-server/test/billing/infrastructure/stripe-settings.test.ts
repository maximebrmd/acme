import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option, Redacted } from "effect";

import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

const settingsFrom = (env: Record<string, string>) =>
  stripeSettingsConfig.parse(ConfigProvider.fromUnknown(env));

const billing = {
  STRIPE_PRICE_BUSINESS: "price_synthetic_business",
  STRIPE_PRICE_PRO: "price_synthetic_pro",
  STRIPE_SECRET_KEY: "sk_test_synthetic",
  STRIPE_WEBHOOK_SECRET: "whsec_synthetic",
};

describe("the Stripe settings", () => {
  it.effect("leave billing off without a key", () =>
    Effect.gen(function* off() {
      assert.isTrue(Option.isNone(yield* settingsFrom({})));
      assert.isTrue(
        Option.isNone(yield* settingsFrom({ STRIPE_SECRET_KEY: " " }))
      );
      assert.isTrue(
        Option.isNone(
          yield* settingsFrom({ STRIPE_PRICE_PRO: "price_synthetic_pro" })
        )
      );
    })
  );

  it.effect("read the key, the webhook secret and each plan's price", () =>
    Effect.gen(function* on() {
      const settings = yield* settingsFrom(billing);

      assert.isTrue(Option.isSome(settings));

      if (Option.isSome(settings)) {
        assert.strictEqual(
          Redacted.value(settings.value.secretKey),
          "sk_test_synthetic"
        );
        assert.strictEqual(
          Redacted.value(settings.value.webhookSecret),
          "whsec_synthetic"
        );
        assert.deepStrictEqual(settings.value.prices, {
          business: "price_synthetic_business",
          pro: "price_synthetic_pro",
        });
        assert.isFalse(settings.value.automaticTax);
        assert.isTrue(Option.isNone(settings.value.apiUrl));
      }
    })
  );

  it.effect("turn on Stripe Tax and another API when asked", () =>
    Effect.gen(function* tax() {
      const settings = yield* settingsFrom({
        ...billing,
        STRIPE_API_URL: "http://127.0.0.1:12111",
        STRIPE_AUTOMATIC_TAX: "true",
      });

      assert.deepStrictEqual(
        settings.pipe(
          Option.map(({ apiUrl, automaticTax }) => ({
            apiUrl: apiUrl.pipe(Option.map((url) => url.href)),
            automaticTax,
          }))
        ),
        Option.some({
          apiUrl: Option.some("http://127.0.0.1:12111/"),
          automaticTax: true,
        })
      );
    })
  );

  it.effect.each(["STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO"])(
    "need %s with a key",
    (missing) =>
      Effect.gen(function* required() {
        const rest = Object.fromEntries(
          Object.entries(billing).filter(([name]) => name !== missing)
        );

        const failure = yield* settingsFrom(rest).pipe(Effect.flip);

        assert.include(String(failure), missing);
      })
  );

  it.effect("refuse a webhook secret without a key", () =>
    Effect.gen(function* halfSet() {
      const failure = yield* settingsFrom({
        STRIPE_WEBHOOK_SECRET: "whsec_synthetic",
      }).pipe(Effect.flip);

      assert.include(String(failure), "STRIPE_SECRET_KEY");
    })
  );
});
