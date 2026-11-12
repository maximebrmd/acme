import { Effect } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { headers } from "next/headers";
import { Api } from "peal-contract";
import type { Overview, WorkspaceOverview } from "peal-contract";

import { serverUrl } from "#api/server-url.ts";

// A person in more workspaces than this many pages hold sees the cards
// after them as they were before the overview: links, and no figure.
const mostPages = 20;

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

  const found = new Map<string, WorkspaceOverview>();
  let cursor: string | null = null;

  for (let page = 0; page < mostPages; page += 1) {
    const answered: Overview = yield* client.overview.get({
      query: cursor === null ? {} : { cursor },
    });

    for (const workspace of answered.workspaces) {
      found.set(workspace.id, workspace);
    }

    cursor = answered.nextCursor;

    if (cursor === null) {
      break;
    }
  }

  return found;
}, Effect.provide(FetchHttpClient.layer));

/**
 * For the signed-in home, on the server: what needs attention in each of
 * the visitor's workspaces, read from GET /api/me/overview with the
 * request's cookies, by workspace id. Empty when it cannot be read, which
 * is logged: the cards then show as they did without it.
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
      Effect.timeout("5 seconds"),
      Effect.catchCause((cause) =>
        Effect.logWarning("The overview could not be read", cause).pipe(
          Effect.as(nothing)
        )
      )
    )
  );
};
