import { Effect, Layer, Option, Redacted, Schema } from "effect";

import { CaptchaChallenge } from "#workspace/application/captcha-challenge.ts";

import { AuthSettings } from "./settings.ts";

// Cloudflare's siteverify, which the captcha plugin calls too.
const cloudflareVerifyUrl =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cloudflare gets this long to answer.
const verifyTimeout = "5 seconds";

const decodeVerdict = Schema.decodeUnknownOption(
  Schema.Struct({ success: Schema.Boolean })
);

/**
 * Turnstile's site key, when the server has Turnstile's keys, and its
 * check of a token: a POST to siteverify with the secret, as the captcha
 * plugin sends it.
 */
export const CaptchaChallengeLive = Layer.effect(
  CaptchaChallenge,
  Effect.gen(function* CaptchaChallengeLive() {
    const { captcha } = yield* AuthSettings;

    const verdict = (
      settings: Option.Option.Value<typeof captcha>,
      token: string
    ) =>
      Effect.tryPromise(async (signal) => {
        const response = await fetch(
          Option.getOrElse(settings.verifyUrl, () => cloudflareVerifyUrl),
          {
            body: JSON.stringify({
              response: token,
              secret: Redacted.value(settings.secretKey),
            }),
            headers: { "content-type": "application/json" },
            method: "POST",
            signal,
          }
        );

        const body: unknown = await response.json();

        return body;
      }).pipe(
        Effect.timeout(verifyTimeout),
        Effect.map((body) =>
          Option.match(decodeVerdict(body), {
            // An answer that is no verdict: Cloudflare is not itself.
            onNone: () => true,
            onSome: ({ success }) => success,
          })
        ),
        Effect.catchCause(() =>
          Effect.logWarning(
            "Turnstile could not check a token: the request goes on"
          ).pipe(Effect.as(true))
        ),
        Effect.withSpan("CaptchaChallenge.passes")
      );

    return CaptchaChallenge.of({
      passes: (token) =>
        Option.match(captcha, {
          onNone: () => Effect.succeed(true),
          onSome: (settings) =>
            Option.match(token, {
              onNone: () => Effect.succeed(false),
              onSome: (value) => verdict(settings, value),
            }),
        }),
      turnstileSiteKey: captcha.pipe(Option.map(({ siteKey }) => siteKey)),
    });
  })
);
