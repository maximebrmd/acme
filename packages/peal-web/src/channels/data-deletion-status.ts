import { Api } from "peal-contract";
import type { MetaApp } from "peal-contract";
import { DateTime, Effect } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";

import { serverUrl } from "#api/server-url.ts";

/**
 * What a data deletion request's status page shows: the request, as plain
 * values a client component takes; none with this code; or the API not
 * answering.
 */
export type DeletionLookup =
  | {
      readonly _tag: "found";
      readonly app: MetaApp;
      readonly channelsDeleted: number;
      /** When it was done, in milliseconds since the epoch. */
      readonly completedAt: number;
      readonly confirmationCode: string;
    }
  | { readonly _tag: "notFound" }
  | { readonly _tag: "unavailable" };

const notFound: DeletionLookup = { _tag: "notFound" };

const unavailable: DeletionLookup = { _tag: "unavailable" };

/**
 * The request with this confirmation code, from GET
 * /api/data-deletion/requests/:code. Nobody signs in for it: Meta links
 * the user here. Server code reaches the server at PEAL_API_URL.
 */
export const lookUpDeletion = Effect.fn("lookUpDeletion")(
  function* lookUpDeletion(code: string) {
    const client = yield* HttpApiClient.make(Api, {
      baseUrl: yield* serverUrl,
    });

    return yield* client.dataDeletion.status({ params: { code } }).pipe(
      Effect.map((status): DeletionLookup => ({
        _tag: "found",
        app: status.app,
        channelsDeleted: status.channelsDeleted,
        completedAt: DateTime.toEpochMillis(status.completedAt),
        confirmationCode: status.confirmationCode,
      })),
      Effect.catchTag("DataDeletionNotFound", () => Effect.succeed(notFound)),
      Effect.timeout("5 seconds")
    );
  },
  Effect.provide(FetchHttpClient.layer),
  Effect.catchCause((cause) =>
    Effect.logWarning("A data deletion status could not be read", cause).pipe(
      Effect.as(unavailable)
    )
  )
);
