import { Api, OAuthApi } from "acme-contract";
import { Context, Effect, Layer } from "effect";
import type { Redacted } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";

// The typed clients derived from acme-contract, bound to the server the
// command line points at: the HTTP API, and the OAuth endpoints its sign-in
// uses. Commands take them from here, so tests swap the transport (the
// HttpClient) and keep everything else.
export class AcmeApi extends Context.Service<
  AcmeApi,
  {
    readonly baseUrl: URL;
    readonly client: HttpApiClient.ForApi<typeof Api>;
    readonly oauth: HttpApiClient.ForApi<typeof OAuthApi>;
    /** The HTTP API's client, sending an OAuth access token. */
    readonly signedIn: (
      accessToken: Redacted.Redacted
    ) => Effect.Effect<HttpApiClient.ForApi<typeof Api>>;
  }
>()("acme-cli/AcmeApi") {
  static readonly layer = (baseUrl: URL) =>
    Layer.effect(
      AcmeApi,
      Effect.gen(function* acmeApi() {
        const httpClient = yield* HttpClient.HttpClient;

        return AcmeApi.of({
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
