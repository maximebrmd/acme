import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { Api } from "peal-contract";

import { CaptchaChallenge } from "#workspace/application/captcha-challenge.ts";
import { SignUpGate } from "#workspace/application/sign-up-gate.ts";
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
    const signUps = yield* SignUpGate;

    return handlers.handle("get", () =>
      signUps.modeNow().pipe(
        // The server's setting when the accounts cannot be read: the gate
        // decides on the sign-up itself.
        Effect.orElseSucceed(() => mode),
        Effect.map((signUp) => ({
          signUp,
          turnstileSiteKey: Option.getOrNull(turnstileSiteKey),
        }))
      )
    );
  })
);
