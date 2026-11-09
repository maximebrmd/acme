import {
  Config,
  Context,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
} from "effect";

import { authSecretConfig } from "#shared/infrastructure/auth-secret.ts";
import {
  isProduction,
  publicUrlConfig,
  requiredInProduction,
} from "#shared/infrastructure/environment.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

// A comma-separated list, without the spaces around its entries or empty ones.
const trimmed = (entries: readonly string[]): readonly string[] =>
  entries.flatMap((entry) => {
    const value = entry.trim();

    return value === "" ? [] : [value];
  });

/** Cloudflare Turnstile, which signing up and password resets then need. */
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

/**
 * How Better Auth runs, read from the environment:
 *
 * | Variable                          | Default                          |
 * | --------------------------------- | -------------------------------- |
 * | `PUBLIC_URL`                      | `http://localhost:3001`, outside production |
 * | `BETTER_AUTH_SECRET`              | a development secret, outside production |
 * | `TRUSTED_ORIGINS`                 | none: only `PUBLIC_URL`          |
 * | `AUTH_IP_HEADERS`                 | `x-forwarded-for`, outside production |
 * | `AUTH_TRUSTED_PROXIES`            | none                             |
 * | `AUTH_REQUIRE_EMAIL_VERIFICATION` | `true`                           |
 * | `AUTH_DB_POOL_MAX`                | `5`                              |
 * | `MCP_DYNAMIC_REGISTRATION`        | `false`                          |
 * | `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY` | none: no captcha      |
 * | `STRIPE_SECRET_KEY` and the rest  | none: no billing (see `#shared/infrastructure/stripe-settings.ts`) |
 */
export const authSettingsConfig = Config.all({
  captcha: captchaConfig,
  databasePoolMax: Config.Int("AUTH_DB_POOL_MAX").pipe(Config.withDefault(5)),
  // Whether MCP clients may register themselves (OAuth dynamic client
  // registration), which most of them need before they can sign in. Anyone
  // may then register a client under any name, so the consent page tells
  // that the client is unverified and where it sends the user back to.
  dynamicClientRegistration: Config.Boolean("MCP_DYNAMIC_REGISTRATION").pipe(
    Config.withDefault(false)
  ),
  // The headers that carry the client's address, which sign-in rate limits
  // count by. Name only headers the edge in front of Peal sets, replacing any
  // value the client sent: cf-connecting-ip behind Cloudflare, or
  // x-forwarded-for behind a proxy that overwrites it, as Caddy does by
  // default. Production has no default: the web app passes x-forwarded-for
  // on as the client sent it, so trusting it would let anyone pick a fresh
  // address for every attempt.
  ipAddressHeaders: requiredInProduction(
    Config.Array(Schema.String, "AUTH_IP_HEADERS"),
    ["x-forwarded-for"]
  ).pipe(Config.map(trimmed)),
  production: isProduction,
  // The origin people open Peal at. Better Auth lives under /api/auth there,
  // and writes the links in its emails from it.
  publicUrl: publicUrlConfig,
  requireEmailVerification: Config.Boolean(
    "AUTH_REQUIRE_EMAIL_VERIFICATION"
  ).pipe(Config.withDefault(true)),
  secret: authSecretConfig,
  // Billing through Stripe's plugin, with organization subscriptions.
  stripe: stripeSettingsConfig,
  // Other origins allowed to send authenticated requests, besides PUBLIC_URL.
  trustedOrigins: Config.Array(Schema.String, "TRUSTED_ORIGINS").pipe(
    Config.withDefault([]),
    Config.map(trimmed)
  ),
  // The addresses or CIDR ranges of proxies that append to x-forwarded-for.
  // With them, the address is read from the right, past those proxies;
  // without them, a header listing several addresses names no client.
  trustedProxies: Config.Array(Schema.String, "AUTH_TRUSTED_PROXIES").pipe(
    Config.withDefault([]),
    Config.map(trimmed)
  ),
});

export type AuthConfiguration = Config.Success<typeof authSettingsConfig>;

export class AuthSettings extends Context.Service<
  AuthSettings,
  AuthConfiguration
>()("peal-server/workspace/infrastructure/AuthSettings") {
  static readonly layer = Layer.effect(
    AuthSettings,
    Effect.gen(function* authSettings() {
      return yield* authSettingsConfig;
    })
  );
}

/** Every origin trusted to send cookie-authenticated requests. */
export const trustedOriginsOf = (settings: AuthConfiguration): Set<string> =>
  new Set([settings.publicUrl, ...settings.trustedOrigins]);
