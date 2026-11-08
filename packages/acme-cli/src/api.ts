import { Api } from "acme-contract";
import { Context, Effect, Layer } from "effect";
import { HttpApiClient } from "effect/http-api";

// The typed client derived from acme-contract, bound to the server the
// command line points at. Commands take it from here, so tests swap the
// transport (the HttpClient) and keep everything else.
export class AcmeApi extends Context.Service<
  AcmeApi,
  {
    readonly baseUrl: URL;
    readonly client: HttpApiClient.ForApi<typeof Api>;
  }
>()("acme-cli/AcmeApi") {
  static readonly layer = (baseUrl: URL) =>
    Layer.effect(
      AcmeApi,
      Effect.map(HttpApiClient.make(Api, { baseUrl }), (client) =>
        AcmeApi.of({ baseUrl, client })
      )
    );
}
