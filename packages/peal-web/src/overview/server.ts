import { Effect, Option } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { headers } from "next/headers";
import { Api } from "peal-contract";
import type { WorkspaceOverview } from "peal-contract";

import { serverUrl } from "#api/server-url.ts";

import { overviewPages } from "./pages.ts";

const nothing = new Map<string, WorkspaceOverview>();

const overviewEffect = Effect.fn("overview")(function* overview(
  cookie: string
) {
  const client = yield* HttpApiClient.make(Api, {
    baseUrl: yield* serverUrl,
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.setHeader("cookie", cookie)
    ),
  });

  return yield* overviewPages((cursor) =>
    client.overview.get({
      query: Option.match(cursor, {
        onNone: () => ({}),
        onSome: (after) => ({ cursor: after }),
      }),
    })
  );
}, Effect.provide(FetchHttpClient.layer));

/**
 * For the signed-in home, on the server: what needs attention in each of
 * the visitor's workspaces, read from GET /api/me/overview with the
 * request's cookies, by workspace id, a page at a time
 * (`overviewPages`). The pages read before one that fails are kept; none
 * when even the client cannot be made, which is logged: the cards then
 * show as they did without it.
 */
export const overviewOrNothing = async (): Promise<
  ReadonlyMap<string, WorkspaceOverview>
> => {
  const incoming = await headers();
  const cookie = incoming.get("cookie");

  if (cookie === null) {
    return nothing;
  }

  return await Effect.runPromise(
    overviewEffect(cookie).pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning("The overview could not be read", cause).pipe(
          Effect.as(nothing)
        )
      )
    )
  );
};
