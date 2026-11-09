// Turnstile on signing up and asking for a password reset, with Cloudflare's
// test keys, checked by a fake siteverify endpoint; and a server without it.
import { assert, layer } from "@effect/vitest";
import { CaptchaSchema } from "peal-contract";
import { Effect, Schema } from "effect";

import {
  appWithTurnstile,
  dummyToken,
  failingSecretKey,
  FakeTurnstile,
  passingSecretKey,
  passingSiteKey,
} from "#test/workspace/fakes/fake-turnstile.ts";

import {
  bodyOf,
  newEmail,
  password,
  TestApp,
  unconfirmedEmails,
} from "./harness.ts";

const ErrorSchema = Schema.Struct({ code: Schema.String });

const signUp = (headers: Readonly<Record<string, string>> = {}) =>
  TestApp.use((app) =>
    app.request("/api/auth/sign-up/email", {
      body: {
        email: newEmail("captcha"),
        locale: "en",
        name: "Grace Hopper",
        password,
      },
      headers,
    })
  );

const resetPassword = (headers: Readonly<Record<string, string>> = {}) =>
  TestApp.use((app) =>
    app.request("/api/auth/request-password-reset", {
      body: { email: newEmail("forgetful"), redirectTo: "/reset-password" },
      headers,
    })
  );

const codeOf = (reply: Parameters<typeof bodyOf>[1]) =>
  bodyOf(ErrorSchema, reply).pipe(Effect.map(({ code }) => code));

const withToken = { "x-captcha-response": dummyToken };

const captchaSettings = TestApp.use((app) => app.request("/api/captcha")).pipe(
  Effect.flatMap((reply) => bodyOf(CaptchaSchema, reply))
);

layer(appWithTurnstile(passingSecretKey), { timeout: "120 seconds" })(
  "Turnstile with the key that always passes",
  (it) => {
    it.effect("tells clients the site key to show the widget with", () =>
      Effect.gen(function* siteKey() {
        assert.deepStrictEqual(yield* captchaSettings, {
          turnstileSiteKey: passingSiteKey,
        });
      })
    );

    it.effect("signs up only with the widget's token", () =>
      Effect.gen(function* signsUp() {
        const without = yield* signUp();

        assert.strictEqual(without.status, 400);
        assert.strictEqual(yield* codeOf(without), "MISSING_RESPONSE");

        const passed = yield* signUp(withToken);

        assert.strictEqual(passed.status, 200);

        const turnstile = yield* FakeTurnstile;
        const checked = turnstile.requests().at(-1);

        assert.include(checked?.body, passingSecretKey);
        assert.include(checked?.body, dummyToken);
      })
    );

    it.effect("sends a reset link only with the widget's token", () =>
      Effect.gen(function* resets() {
        const without = yield* resetPassword();

        assert.strictEqual(without.status, 400);
        assert.strictEqual(yield* codeOf(without), "MISSING_RESPONSE");

        assert.strictEqual((yield* resetPassword(withToken)).status, 200);
      })
    );
  }
);

layer(appWithTurnstile(failingSecretKey), { timeout: "120 seconds" })(
  "Turnstile with the key that always fails",
  (it) => {
    it.effect("refuses the sign-up and the reset", () =>
      Effect.gen(function* refuses() {
        const refused = yield* signUp(withToken);

        assert.strictEqual(refused.status, 403);
        assert.strictEqual(yield* codeOf(refused), "VERIFICATION_FAILED");

        const reset = yield* resetPassword(withToken);

        assert.strictEqual(reset.status, 403);
      })
    );
  }
);

layer(TestApp.layerWith(unconfirmedEmails), { timeout: "120 seconds" })(
  "a server without Turnstile",
  (it) => {
    it.effect("asks for no token", () =>
      Effect.gen(function* off() {
        assert.deepStrictEqual(yield* captchaSettings, {
          turnstileSiteKey: null,
        });
        assert.strictEqual((yield* signUp()).status, 200);
      })
    );
  }
);
