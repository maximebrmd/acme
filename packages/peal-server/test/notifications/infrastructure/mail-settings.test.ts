import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Redacted } from "effect";

import { mailSettingsConfig } from "#notifications/infrastructure/mail-settings.ts";

const settingsFrom = (env: Record<string, string>) =>
  mailSettingsConfig.parse(ConfigProvider.fromUnknown(env));

describe("the mail settings", () => {
  it.effect("send through Mailpit outside production", () =>
    Effect.gen(function* development() {
      const { from, transport } = yield* settingsFrom({});

      assert.strictEqual(from, "Peal <noreply@peal.localhost>");
      assert.strictEqual(transport._tag, "Smtp");
      assert.strictEqual(
        transport._tag === "Smtp" ? Redacted.value(transport.url) : "",
        "smtp://127.0.0.1:11025"
      );
    })
  );

  it.effect("prefer Resend when it has a key", () =>
    Effect.gen(function* resend() {
      const { transport } = yield* settingsFrom({
        MAIL_FROM: "Peal <noreply@example.test>",
        NODE_ENV: "production",
        RESEND_API_KEY: "re_test_key",
        SMTP_URL: "smtp://mail.example.test:587",
      });

      assert.strictEqual(transport._tag, "Resend");
    })
  );

  it.effect("send through SMTP_URL in production", () =>
    Effect.gen(function* smtp() {
      const { transport } = yield* settingsFrom({
        MAIL_FROM: "noreply@example.test",
        NODE_ENV: "production",
        SMTP_URL: "smtps://user:secret@mail.example.test:465",
      });

      assert.strictEqual(transport._tag, "Smtp");
    })
  );

  it.effect.each([
    {
      env: { NODE_ENV: "production", SMTP_URL: "smtp://mail.example.test" },
      missing: "MAIL_FROM",
    },
    {
      env: { MAIL_FROM: "noreply@example.test", NODE_ENV: "production" },
      missing: "SMTP_URL",
    },
  ])("need $missing in production", ({ env, missing }) =>
    Effect.gen(function* required() {
      const failure = yield* settingsFrom(env).pipe(Effect.flip);

      assert.include(String(failure), missing);
    })
  );
});
