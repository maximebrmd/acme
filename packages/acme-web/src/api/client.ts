import { Api } from "acme-contract";
import { Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { Atom, AtomHttpApi } from "effect/reactivity";

// Where API requests go. Every endpoint's path starts with /api, so browsers
// keep this default and stay same-origin: Next forwards /api/* to the
// server. Server-side code seeds its own registry with the server's URL
// instead (see prefetch.ts).
export const apiBaseUrl = Atom.make("").pipe(Atom.keepAlive);

const fetchFrom = (baseUrl: string) =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* prependBaseUrl() {
      const client = yield* HttpClient.HttpClient;

      return HttpClient.mapRequest(
        client,
        HttpClientRequest.prependUrl(baseUrl)
      );
    })
  ).pipe(Layer.provide(FetchHttpClient.layer));

// The typed client derived from acme-contract, with atoms for queries and
// mutations. Components read it through @effect/atom-react.
export class AcmeApi extends AtomHttpApi.Service<AcmeApi>()(
  "acme-web/AcmeApi",
  {
    api: Api,
    httpClient: (get) => fetchFrom(get(apiBaseUrl)),
  }
) {}
