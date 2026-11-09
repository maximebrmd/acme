import { Config, Redacted } from "effect";

import { requiredInProduction } from "./environment.ts";

// Used only outside production, so `bun nx run peal-server:dev` signs people
// in without any setup. Production refuses to start without its own secret:
// whoever knows the secret can forge session cookies.
const developmentSecret = Redacted.make(
  "peal-development-secret-9f3c1e7a4b2d8f6e0a5c3b1d7e9f2a4c"
);

/**
 * The server's secret (BETTER_AUTH_SECRET): Better Auth signs sessions with
 * it, and the keyed pseudonyms derive from it. A development secret outside
 * production.
 */
export const authSecretConfig = requiredInProduction(
  Config.Redacted("BETTER_AUTH_SECRET"),
  developmentSecret
);
