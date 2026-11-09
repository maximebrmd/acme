import { Context, Effect, Layer } from "effect";
import type { Redacted } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api, OAuthApi } from "peal-contract";

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
    /** The HTTP API's client, sending an OAuth access token. */
    readonly signedIn: (
      accessToken: Redacted.Redacted
    ) => Effect.Effect<HttpApiClient.ForApi<typeof Api>>;
  }
>()("peal-cli/PealApi") {
  static readonly layer = (baseUrl: URL) =>
    Layer.effect(
      PealApi,
      Effect.gen(function* pealApi() {
        const httpClient = yield* HttpClient.HttpClient;

        return PealApi.of({
          baseUrl,
          client: yield* HttpApiClient.makeWith(Api, { baseUrl, httpClient }),
          oauth: yield* HttpApiClient.makeWith(OAuthApi, {
            baseUrl,
            httpClient,
          }),
          signedIn: (accessToken) =>
            HttpApiClient.makeWith(Api, {
              baseUrl,
              httpClient: httpClient.pipe(
                HttpClient.mapRequest(
                  HttpClientRequest.bearerToken(accessToken)
                )
              ),
            }),
        });
      })
    );
}
