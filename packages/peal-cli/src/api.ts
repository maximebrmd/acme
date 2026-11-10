import { Context, Effect, Layer } from "effect";
import type { Redacted } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api, OAuthApi } from "peal-contract";

import { display } from "#display.ts";
import { Refused } from "#refused.ts";
import { insecureHttpFlag, insecureHttpVariable } from "#root.ts";

// This machine, under the names a URL gives it: what is sent there leaves
// no network. `URL` writes an IPv6 host in brackets.
const isLoopback = (hostname: string): boolean =>
  hostname === "localhost" ||
  hostname.endsWith(".localhost") ||
  hostname === "[::1]" ||
  /^127(?:\.\d{1,3}){3}$/u.test(hostname);

/**
 * Whether a credential sent to this server stays private on the way: over
 * HTTPS, or to this machine.
 */
export const keepsCredentialsPrivate = (baseUrl: URL): boolean =>
  baseUrl.protocol === "https:" || isLoopback(baseUrl.hostname);

// The typed clients derived from peal-contract, bound to the server the
// command line points at: the HTTP API, and the OAuth endpoints its sign-in
// uses. Commands take them from here, so tests swap the transport (the
// HttpClient) and keep everything else.
export class PealApi extends Context.Service<
  PealApi,
  {
    readonly baseUrl: URL;
    readonly client: HttpApiClient.ForApi<typeof Api>;
    readonly oauth: HttpApiClient.ForApi<typeof OAuthApi>;
    /**
     * Refuses when a credential sent to the server would travel in clear:
     * over plain HTTP to a host that is not this machine, unless the run
     * said it may (--insecure-http). Whatever sends an API key, an access
     * token or a refresh token goes through it first, and what sends none
     * (the health check, the discovery documents) does not.
     */
    readonly sendingCredentials: Effect.Effect<void, Refused>;
    /**
     * The HTTP API's client, sending an OAuth access token or an API key:
     * refused as `sendingCredentials` refuses.
     */
    readonly signedIn: (
      accessToken: Redacted.Redacted
    ) => Effect.Effect<HttpApiClient.ForApi<typeof Api>, Refused>;
  }
>()("peal-cli/PealApi") {
  static readonly layer = (
    baseUrl: URL,
    options: {
      /** Whether credentials may go over plain HTTP beyond this machine. */
      readonly insecureHttp?: boolean;
    } = {}
  ) =>
    Layer.effect(
      PealApi,
      Effect.gen(function* pealApi() {
        const httpClient = yield* HttpClient.HttpClient;

        const sendingCredentials =
          options.insecureHttp === true || keepsCredentialsPrivate(baseUrl)
            ? Effect.void
            : Effect.fail(
                new Refused({
                  code: "insecure_api_url",
                  reason: `${display(baseUrl)} is reached over plain HTTP, and is not this machine: a sign-in or an API key sent there could be read on the way, so none was sent. Point the command line at the server's https:// address (--api-url or PEAL_API_URL). For a server on a network you trust that has no TLS, pass --${insecureHttpFlag}, or set ${insecureHttpVariable}=true.`,
                })
              );

        return PealApi.of({
          baseUrl,
          client: yield* HttpApiClient.makeWith(Api, { baseUrl, httpClient }),
          oauth: yield* HttpApiClient.makeWith(OAuthApi, {
            baseUrl,
            httpClient,
          }),
          sendingCredentials,
          signedIn: (accessToken) =>
            sendingCredentials.pipe(
              Effect.andThen(
                HttpApiClient.makeWith(Api, {
                  baseUrl,
                  httpClient: httpClient.pipe(
                    HttpClient.mapRequest(
                      HttpClientRequest.bearerToken(accessToken)
                    )
                  ),
                })
              )
            ),
        });
      })
    );
}
