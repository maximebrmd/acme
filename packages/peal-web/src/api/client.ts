import { Effect, Layer, Option, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { Atom, AtomHttpApi } from "effect/reactivity";
import { Api } from "peal-contract";

import { noticeAnswer } from "#two-step/refusals.ts";

// The reason a refusal gives, if it gives one.
const decodeReason = Schema.decodeUnknownOption(
  Schema.Struct({ reason: Schema.String })
);

const reasonOf = (body: Schema.Json): string | undefined =>
  decodeReason(body).pipe(
    Option.map(({ reason }) => reason),
    Option.getOrUndefined
  );

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

      // Every refusal is read once here, for the reason the whole page
      // acts on (two-step verification a workspace now requires); the
      // body stays for the caller, as the response keeps it.
      return HttpClient.mapRequest(
        client,
        HttpClientRequest.prependUrl(baseUrl)
      ).pipe(
        HttpClient.tap((response) =>
          response.status === 403
            ? response.json.pipe(
                Effect.flatMap((body) =>
                  Effect.sync(() => {
                    noticeAnswer({
                      reason: reasonOf(body),
                      status: response.status,
                    });
                  })
                ),
                Effect.ignore
              )
            : Effect.void
        )
      );
    })
  ).pipe(Layer.provide(FetchHttpClient.layer));

// The typed client derived from peal-contract, with atoms for queries and
// mutations. Components read it through @effect/atom-react.
export class PealApi extends AtomHttpApi.Service<PealApi>()(
  "peal-web/PealApi",
  {
    api: Api,
    httpClient: (get) => fetchFrom(get(apiBaseUrl)),
  }
) {}
