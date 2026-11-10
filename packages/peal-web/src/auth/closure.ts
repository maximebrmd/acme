import { Effect } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { headers } from "next/headers";
import { Api } from "peal-contract";
import type { AccountClosure } from "peal-contract";

import { serverUrl } from "#api/server-url.ts";

/**
 * For the account page's Server Component: what deleting the account would
 * leave on this server, from GET /api/me/closure with the visitor's
 * cookies. Fails when the request does, as the page must not guess.
 */
export const accountClosure = async (): Promise<AccountClosure> => {
  const incoming = await headers();
  const cookie = incoming.get("cookie") ?? "";

  return await Effect.runPromise(
    Effect.gen(function* closure() {
      const client = yield* HttpApiClient.make(Api, {
        baseUrl: yield* serverUrl,
        transformClient: HttpClient.mapRequest(
          HttpClientRequest.setHeader("cookie", cookie)
        ),
      });

      return yield* client.account.closure();
    }).pipe(Effect.timeout("5 seconds"), Effect.provide(FetchHttpClient.layer))
  );
};
