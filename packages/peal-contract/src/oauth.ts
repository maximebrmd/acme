import { HttpApi } from "effect/http-api";

import { OAuthClientsApi } from "./oauth-clients.ts";
import { OAuthDiscoveryApi } from "./oauth-discovery.ts";
import { OAuthTokensApi } from "./oauth-tokens.ts";

// The OAuth endpoints Peal's own clients call. The server does not build
// them from this definition: Better Auth answers them, and the server's
// tests check that its answers decode.

/**
 * The command line's OAuth client id, which every Peal server registers: a
 * public client that signs in with the device authorization grant.
 */
export const cliClientId = "peal-cli";

/**
 * The OAuth endpoints of a Peal server that its command line and web app
 * call, beside the HTTP API: discovery, the device authorization grant,
 * token renewal and revocation, and what the authorization pages show of a
 * client.
 */
export class OAuthApi extends HttpApi.make("peal-oauth")
  .add(OAuthDiscoveryApi)
  .add(OAuthTokensApi)
  .add(OAuthClientsApi) {}
