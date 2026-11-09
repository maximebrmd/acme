import { Api } from "acme-contract";
import type { Me } from "acme-contract";
import { Effect, Option } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { headers } from "next/headers";
import { cache } from "react";

import { serverUrl } from "#api/server-url.ts";

const signedOut = () => Effect.succeed(Option.none<Me>());

/**
 * The signed-in user, from GET /api/me with the visitor's cookies, or none.
 * Server code reaches the server at ACME_API_URL, not through the proxy.
 */
export const currentUserEffect = Effect.fn("currentUser")(function* currentUser(
  cookie: string
) {
  const client = yield* HttpApiClient.make(Api, {
    baseUrl: yield* serverUrl,
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.setHeader("cookie", cookie)
    ),
  });

  return yield* client.session.me().pipe(
    Effect.map(Option.some),
    // A banned user, like a signed-out one, sees the public pages.
    Effect.catchTags({ Forbidden: signedOut, Unauthenticated: signedOut }),
    Effect.timeout("5 seconds")
  );
}, Effect.provide(FetchHttpClient.layer));

/**
 * For Server Components: the user the request's cookies sign in, if any.
 * Read once per request, however many components ask.
 */
export const currentUser = cache(async (): Promise<Option.Option<Me>> => {
  const incoming = await headers();
  const cookie = incoming.get("cookie");

  return cookie === null
    ? Option.none()
    : await Effect.runPromise(currentUserEffect(cookie));
});
