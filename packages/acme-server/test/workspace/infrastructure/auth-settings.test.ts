import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect } from "effect";

import { authSettingsConfig } from "#workspace/infrastructure/auth/settings.ts";

const production = {
  BETTER_AUTH_SECRET: "auth-settings-test-only-0123456789abcdef",
  NODE_ENV: "production",
  PUBLIC_URL: "https://app.example.test",
};

const settingsFrom = (env: Record<string, string>) =>
  authSettingsConfig.parse(ConfigProvider.fromUnknown(env));

describe("the auth settings", () => {
  it.effect(
    "read the client's address from x-forwarded-for outside production",
    () =>
      Effect.gen(function* development() {
        const settings = yield* settingsFrom({});

        assert.deepStrictEqual(settings.ipAddressHeaders, ["x-forwarded-for"]);
        assert.deepStrictEqual(settings.trustedProxies, []);
      })
  );

  // Behind a proxy that passes x-forwarded-for on as the client sent it, a
  // default would let anyone choose the address rate limits count by.
  it.effect("need AUTH_IP_HEADERS in production", () =>
    Effect.gen(function* required() {
      const failure = yield* settingsFrom(production).pipe(Effect.flip);

      assert.include(String(failure), "AUTH_IP_HEADERS");
    })
  );

  it.effect("read header and proxy lists, trimmed", () =>
    Effect.gen(function* lists() {
      const settings = yield* settingsFrom({
        ...production,
        AUTH_IP_HEADERS: " cf-connecting-ip , x-real-ip",
        AUTH_TRUSTED_PROXIES: "10.0.0.0/8, 192.0.2.10",
      });

      assert.deepStrictEqual(settings.ipAddressHeaders, [
        "cf-connecting-ip",
        "x-real-ip",
      ]);
      assert.deepStrictEqual(settings.trustedProxies, [
        "10.0.0.0/8",
        "192.0.2.10",
      ]);
    })
  );
});
