import { Api } from "acme-contract";
import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { CaptchaChallenge } from "#workspace/application/captcha-challenge.ts";

/** The captcha the sign-up and password reset forms show, for anyone. */
export const CaptchaHandlers = HttpApiBuilder.group(
  Api,
  "captcha",
  Effect.fn(function* captchaHandlers(handlers) {
    const { turnstileSiteKey } = yield* CaptchaChallenge;

    return handlers.handle("get", () =>
      Effect.succeed({ turnstileSiteKey: Option.getOrNull(turnstileSiteKey) })
    );
  })
);
