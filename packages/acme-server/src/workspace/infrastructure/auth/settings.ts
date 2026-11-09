import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";

import {
  isProduction,
  requiredInProduction,
} from "#shared/infrastructure/environment.ts";

// Used only outside production, so `bun nx run acme-server:dev` signs people
// in without any setup. Production refuses to start without its own secret:
// whoever knows the secret can forge session cookies.
const developmentSecret = Redacted.make(
  "acme-development-secret-9f3c1e7a4b2d8f6e0a5c3b1d7e9f2a4c"
);

// The web app's address in development (`nx run acme-web:dev`).
const developmentPublicUrl = "http://localhost:3001";

// A comma-separated list, without the spaces around its entries or empty ones.
const trimmed = (entries: readonly string[]): readonly string[] =>
  entries.flatMap((entry) => {
    const value = entry.trim();

    return value === "" ? [] : [value];
  });

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
 */
export const authSettingsConfig = Config.all({
  databasePoolMax: Config.Int("AUTH_DB_POOL_MAX").pipe(Config.withDefault(5)),
  // The headers that carry the client's address, which sign-in rate limits
  // count by. Name only headers the edge in front of Acme sets, replacing any
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
  // The origin people open Acme at. Better Auth lives under /api/auth there,
  // and writes the links in its emails from it.
  publicUrl: requiredInProduction(
    Config.URL("PUBLIC_URL"),
    new URL(developmentPublicUrl)
  ).pipe(Config.map((url) => url.origin)),
  requireEmailVerification: Config.Boolean(
    "AUTH_REQUIRE_EMAIL_VERIFICATION"
  ).pipe(Config.withDefault(true)),
  secret: requiredInProduction(
    Config.Redacted("BETTER_AUTH_SECRET"),
    developmentSecret
  ),
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
>()("acme-server/workspace/infrastructure/AuthSettings") {
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
