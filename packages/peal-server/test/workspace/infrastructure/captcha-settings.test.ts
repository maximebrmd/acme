import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option, Redacted } from "effect";

import { captchaConfig } from "#shared/infrastructure/captcha-settings.ts";

const settingsFrom = (env: Record<string, string>) =>
  captchaConfig.parse(ConfigProvider.fromUnknown(env));

describe("the captcha settings", () => {
  it.effect("leave Turnstile off without its keys", () =>
    Effect.gen(function* off() {
      assert.isTrue(Option.isNone(yield* settingsFrom({})));
      assert.isTrue(
        Option.isNone(
          yield* settingsFrom({
            TURNSTILE_SECRET_KEY: "",
            TURNSTILE_SITE_KEY: "",
          })
        )
      );
    })
  );

  it.effect("read both keys, and where tokens are checked", () =>
    Effect.gen(function* on() {
      const settings = yield* settingsFrom({
        TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
        TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
        TURNSTILE_VERIFY_URL: "http://127.0.0.1:4000/siteverify",
      });

      assert.deepStrictEqual(
        settings.pipe(
          Option.map(({ secretKey, siteKey, verifyUrl }) => ({
            secretKey: Redacted.value(secretKey),
            siteKey,
            verifyUrl,
          }))
        ),
        Option.some({
          secretKey: "1x0000000000000000000000000000000AA",
          siteKey: "1x00000000000000000000AA",
          verifyUrl: Option.some("http://127.0.0.1:4000/siteverify"),
        })
      );
    })
  );

  it.effect.each([
    ["TURNSTILE_SITE_KEY", { TURNSTILE_SECRET_KEY: "secret" }],
    ["TURNSTILE_SECRET_KEY", { TURNSTILE_SITE_KEY: "site" }],
  ] as const)("need %s with the other key", ([missing, env]) =>
    Effect.gen(function* halfSet() {
      const failure = yield* settingsFrom(env).pipe(Effect.flip);

      assert.include(String(failure), missing);
    })
  );
});
