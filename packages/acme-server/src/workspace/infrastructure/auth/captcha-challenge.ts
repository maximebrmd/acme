import { Effect, Layer, Option } from "effect";

import { CaptchaChallenge } from "#workspace/application/captcha-challenge.ts";

import { AuthSettings } from "./settings.ts";

/** Turnstile's site key, when the server has Turnstile's keys. */
export const CaptchaChallengeLive = Layer.effect(
  CaptchaChallenge,
  Effect.gen(function* CaptchaChallengeLive() {
    const { captcha } = yield* AuthSettings;

    return CaptchaChallenge.of({
      turnstileSiteKey: captcha.pipe(Option.map(({ siteKey }) => siteKey)),
    });
  })
);
