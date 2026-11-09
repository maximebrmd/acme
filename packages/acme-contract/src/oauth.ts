import { HttpApi } from "effect/http-api";

import { OAuthClientsApi } from "./oauth-clients.ts";
import { OAuthDiscoveryApi } from "./oauth-discovery.ts";
import { OAuthTokensApi } from "./oauth-tokens.ts";

// The OAuth endpoints Acme's own clients call. The server does not build
// them from this definition: Better Auth answers them, and the server's
// tests check that its answers decode.

/**
 * The command line's OAuth client id, which every Acme server registers: a
 * public client that signs in with the device authorization grant.
 */
export const cliClientId = "acme-cli";

/**
 * The OAuth endpoints of an Acme server that its command line and web app
 * call, beside the HTTP API: discovery, the device authorization grant,
 * token renewal and revocation, and what the authorization pages show of a
 * client.
 */
export class OAuthApi extends HttpApi.make("acme-oauth")
  .add(OAuthDiscoveryApi)
  .add(OAuthTokensApi)
  .add(OAuthClientsApi) {}
