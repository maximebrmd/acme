import { Effect, Exit, Option } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { headers } from "next/headers";
import { OAuthApi } from "peal-contract";

import { serverUrl } from "#api/server-url.ts";

/**
 * The name an OAuth client registered with, as Better Auth tells the
 * signed-in visitor whose cookies are given, or none.
 */
export const clientNameEffect = Effect.fn("clientName")(function* clientName(
  cookie: string,
  clientId: string
) {
  const client = yield* HttpApiClient.make(OAuthApi, {
    baseUrl: yield* serverUrl,
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.setHeader("cookie", cookie)
    ),
  });

  const described = yield* client.clients
    .publicClient({ query: { client_id: clientId } })
    .pipe(Effect.timeout("5 seconds"));

  return Option.fromUndefinedOr(described.client_name);
}, Effect.provide(FetchHttpClient.layer));

/**
 * For Server Components: the client's name, or none when it has none or
 * reading it failed, which is logged; the page then names it generically.
 */
export const clientName = async (
  clientId: string
): Promise<Option.Option<string>> => {
  const incoming = await headers();
  const cookie = incoming.get("cookie");

  if (cookie === null) {
    return Option.none();
  }

  const read = await Effect.runPromiseExit(
    clientNameEffect(cookie, clientId).pipe(
      Effect.tapCause((cause) =>
        Effect.logWarning("An OAuth client could not be read", cause)
      )
    )
  );

  return Exit.isSuccess(read) ? read.value : Option.none();
};
