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

/**
 * How Better Auth runs, read from the environment:
 *
 * | Variable                          | Default                          |
 * | --------------------------------- | -------------------------------- |
 * | `PUBLIC_URL`                      | `http://localhost:3001`, outside production |
 * | `BETTER_AUTH_SECRET`              | a development secret, outside production |
 * | `TRUSTED_ORIGINS`                 | none: only `PUBLIC_URL`          |
 * | `AUTH_IP_HEADERS`                 | `x-forwarded-for`                |
 * | `AUTH_REQUIRE_EMAIL_VERIFICATION` | `true`                           |
 * | `AUTH_DB_POOL_MAX`                | `5`                              |
 */
export const authSettingsConfig = Config.all({
  databasePoolMax: Config.Int("AUTH_DB_POOL_MAX").pipe(Config.withDefault(5)),
  // The headers the proxy in front of the server sets to the client's
  // address, replacing any value the client sent: cf-connecting-ip behind
  // Cloudflare, x-real-ip behind Caddy.
  ipAddressHeaders: Config.Array(Schema.String, "AUTH_IP_HEADERS").pipe(
    Config.withDefault(["x-forwarded-for"])
  ),
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
    Config.map((origins) => origins.map((origin) => origin.trim()))
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
