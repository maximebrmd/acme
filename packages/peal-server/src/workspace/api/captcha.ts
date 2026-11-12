import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { Api } from "peal-contract";

import { CaptchaChallenge } from "#workspace/application/captcha-challenge.ts";
import { SignUpSettings } from "#workspace/application/sign-up-settings.ts";

/**
 * The captcha the sign-up and password reset forms show, and who may sign
 * up, for anyone.
 */
export const CaptchaHandlers = HttpApiBuilder.group(
  Api,
  "captcha",
  Effect.fn(function* captchaHandlers(handlers) {
    const { turnstileSiteKey } = yield* CaptchaChallenge;
    const { mode } = yield* SignUpSettings;

    return handlers.handle("get", () =>
      Effect.succeed({
        signUp: mode,
        turnstileSiteKey: Option.getOrNull(turnstileSiteKey),
      })
    );
  })
);
