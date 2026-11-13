import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option, Redacted } from "effect";

import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

const settingsFrom = (env: Record<string, string>) =>
  stripeSettingsConfig.parse(ConfigProvider.fromUnknown(env));

const billing = {
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
          yield* settingsFrom({ STRIPE_LOOKUP_KEY_PREFIX: "peal_sandbox" })
        )
      );
    })
  );

  it.effect("read the key, the webhook secret and each plan's prices", () =>
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
          agency: { month: "peal_agency_monthly", year: "peal_agency_yearly" },
          business: {
            month: "peal_business_monthly",
            year: "peal_business_yearly",
          },
          pro: { month: "peal_pro_monthly", year: "peal_pro_yearly" },
          starter: {
            month: "peal_starter_monthly",
            year: "peal_starter_yearly",
          },
        });
        assert.isTrue(Option.isNone(settings.value.apiUrl));
      }
    })
  );

  it.effect(
    "read the lookup keys of per-account pricing's six prices, which are also its meters' event names",
    () =>
      Effect.gen(function* catalogue() {
        const settings = yield* settingsFrom(billing);

        assert.deepStrictEqual(
          settings.pipe(Option.map(({ catalogue: keys }) => keys)),
          Option.some({
            accounts: "peal_accounts",
            assistantImages: "peal_assistant_images",
            assistantRequests: "peal_assistant_requests",
            managedAds: "peal_managed_ads",
            outboundMessages: "peal_outbound_messages",
            xApi: "peal_x_api",
          })
        );
      })
  );

  it.effect("call another API when asked", () =>
    Effect.gen(function* api() {
      const settings = yield* settingsFrom({
        ...billing,
        STRIPE_API_URL: "http://127.0.0.1:12111",
      });

      assert.deepStrictEqual(
        settings.pipe(
          Option.flatMap(({ apiUrl }) => apiUrl),
          Option.map((url) => url.href)
        ),
        Option.some("http://127.0.0.1:12111/")
      );
    })
  );

  it.effect("find each price by the lookup keys under the prefix given", () =>
    Effect.gen(function* prefixed() {
      const settings = yield* settingsFrom({
        ...billing,
        STRIPE_LOOKUP_KEY_PREFIX: "peal_sandbox",
      });

      assert.deepStrictEqual(
        settings.pipe(Option.map(({ prices }) => prices.pro)),
        Option.some({
          month: "peal_sandbox_pro_monthly",
          year: "peal_sandbox_pro_yearly",
        })
      );

      assert.deepStrictEqual(
        settings.pipe(Option.map(({ catalogue }) => catalogue.accounts)),
        Option.some("peal_sandbox_accounts")
      );

      const malformed = yield* settingsFrom({
        ...billing,
        STRIPE_LOOKUP_KEY_PREFIX: "Not a key!",
      }).pipe(Effect.flip);

      assert.include(String(malformed), "STRIPE_LOOKUP_KEY_PREFIX");
    })
  );

  it.effect.each(["STRIPE_WEBHOOK_SECRET"])("need %s with a key", (missing) =>
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
