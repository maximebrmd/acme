import { Effect, Option } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Api } from "peal-contract";

import { serverUrl } from "#api/server-url.ts";

const makeClient = (cookie: string) =>
  Effect.gen(function* staffClient() {
    return yield* HttpApiClient.make(Api, {
      baseUrl: yield* serverUrl,
      transformClient: HttpClient.mapRequest(
        HttpClientRequest.setHeader("cookie", cookie)
      ),
    });
  });

type Client = Effect.Success<ReturnType<typeof makeClient>>;

/** The staff console's endpoints, as the typed client has them. */
export type StaffClient = Client["staff"];

/** The requests to cancel or withdraw that wait for staff. */
export type DeskClient = Client["contractRequestsDesk"];

// What the API answers with 404: anyone but staff, and an account or a
// workspace that is not there.
const missing: ReadonlySet<string> = new Set([
  "NotFound",
  "UserNotFound",
  "WorkspaceNotFound",
]);

/**
 * For the console's Server Components: what a console endpoint answers, read
 * with the visitor's cookies from the server at PEAL_API_URL. Anyone but
 * staff, and anything the API does not find, gets the not-found page; any
 * other failure goes to the error page.
 */
const consoleRead = async <A, E extends { readonly _tag: string }>(
  read: (client: Client) => Effect.Effect<A, E>
): Promise<A> => {
  const incoming = await headers();
  const cookie = incoming.get("cookie");

  if (cookie === null) {
    notFound();
  }

  const answer = await Effect.runPromise(
    makeClient(cookie).pipe(
      Effect.flatMap(read),
      Effect.map(Option.some),
      Effect.catchIf(
        ({ _tag }) => missing.has(_tag),
        () => Effect.succeedNone
      ),
      Effect.timeout("10 seconds"),
      Effect.provide(FetchHttpClient.layer)
    )
  );

  return Option.getOrElse(answer, () => notFound());
};

/** What a staff endpoint answers, read as `consoleRead` reads. */
export const staffRead = async <A, E extends { readonly _tag: string }>(
  read: (staff: StaffClient) => Effect.Effect<A, E>
): Promise<A> => await consoleRead((client) => read(client.staff));

/**
 * The same, for the requests to cancel or withdraw that wait for staff,
 * which the billing context answers behind the same access.
 */
export const deskRead = async <A, E extends { readonly _tag: string }>(
  read: (desk: DeskClient) => Effect.Effect<A, E>
): Promise<A> =>
  await consoleRead((client) => read(client.contractRequestsDesk));
