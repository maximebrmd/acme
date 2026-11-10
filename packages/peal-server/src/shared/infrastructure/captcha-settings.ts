import { Config, Option, Redacted } from "effect";

/**
 * Cloudflare Turnstile, which signing up, password resets and what the
 * visitors of review links write then need.
 */
export interface CaptchaSettings {
  readonly secretKey: Redacted.Redacted;
  /** The key the web app shows the widget with. */
  readonly siteKey: string;
  /**
   * Where tokens are checked: Cloudflare's siteverify unless
   * TURNSTILE_VERIFY_URL names another, such as a fake in tests.
   */
  readonly verifyUrl: Option.Option<string>;
}

// A setting that is set: unset and empty both read as none.
const optionalString = (name: string) =>
  Config.option(Config.String(name)).pipe(
    Config.map(Option.filter((value) => value.trim() !== ""))
  );

/**
 * Turnstile, when TURNSTILE_SECRET_KEY and TURNSTILE_SITE_KEY are both set;
 * off when neither is. One without the other stops the server: sign-ups
 * would need a token the web app cannot get, or show a widget the server
 * never checks.
 */
export const captchaConfig = Config.all({
  secretKey: optionalString("TURNSTILE_SECRET_KEY"),
  siteKey: optionalString("TURNSTILE_SITE_KEY"),
}).pipe(
  Config.flatMap(({ secretKey, siteKey }) => {
    if (Option.isSome(secretKey) && Option.isSome(siteKey)) {
      return Config.option(Config.URL("TURNSTILE_VERIFY_URL")).pipe(
        Config.map((verifyUrl) =>
          Option.some<CaptchaSettings>({
            secretKey: Redacted.make(secretKey.value),
            siteKey: siteKey.value,
            verifyUrl: verifyUrl.pipe(Option.map((url) => url.href)),
          })
        )
      );
    }

    if (Option.isSome(secretKey)) {
      return Config.NonEmptyString("TURNSTILE_SITE_KEY").pipe(
        Config.map(() => Option.none<CaptchaSettings>())
      );
    }

    if (Option.isSome(siteKey)) {
      return Config.NonEmptyString("TURNSTILE_SECRET_KEY").pipe(
        Config.map(() => Option.none<CaptchaSettings>())
      );
    }

    return Config.succeed(Option.none<CaptchaSettings>());
  })
);
