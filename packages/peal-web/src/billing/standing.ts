import { Effect, Option } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { headers } from "next/headers";
import { Api } from "peal-contract";
import type { Standing } from "peal-contract";

import { serverUrl } from "#api/server-url.ts";

/**
 * Where the workspace stands against its plan, with the visitor's cookies,
 * for the layout around its pages. None when it cannot be read: the pages
 * then show as usual, and the server still refuses what a plan refuses.
 */
export const standingOfWorkspace = async (
  workspaceId: string
): Promise<Option.Option<Standing>> => {
  const incoming = await headers();
  const cookie = incoming.get("cookie");

  if (cookie === null) {
    return Option.none();
  }

  return await Effect.runPromise(
    Effect.gen(function* standing() {
      const client = yield* HttpApiClient.make(Api, {
        baseUrl: yield* serverUrl,
        transformClient: HttpClient.mapRequest(
          HttpClientRequest.setHeader("cookie", cookie)
        ),
      });

      return yield* client.billing
        .standing({ params: { workspaceId } })
        .pipe(Effect.map(Option.some), Effect.timeout("5 seconds"));
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.catchCause((cause) =>
        Effect.logWarning(
          "The workspace's standing could not be read",
          cause
        ).pipe(Effect.as(Option.none<Standing>()))
      )
    )
  );
};
