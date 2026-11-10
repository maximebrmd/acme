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

type ConsoleClient = Effect.Success<ReturnType<typeof makeClient>>;

/** The staff console's endpoints, as the typed client has them. */
export type StaffClient = ConsoleClient["staff"];

/** The legal requests' endpoints, for staff who hold the legal role. */
export type LegalClient = ConsoleClient["legal"];

/** The requests to cancel or withdraw that wait for staff. */
export type DeskClient = ConsoleClient["contractRequestsDesk"];

// What the API answers with 404: anyone but staff, and an account or a
// workspace that is not there.
const missing: ReadonlySet<string> = new Set([
  "NotFound",
  "UserNotFound",
  "WorkspaceNotFound",
]);

// What a console endpoint answers, read with the visitor's cookies from
// the server at PEAL_API_URL, or none when the API answers 404.
const consoleRead = async <A, E extends { readonly _tag: string }>(
  read: (client: ConsoleClient) => Effect.Effect<A, E>
): Promise<Option.Option<A>> => {
  const incoming = await headers();
  const cookie = incoming.get("cookie");

  if (cookie === null) {
    return Option.none();
  }

  return await Effect.runPromise(
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
};

/**
 * For the console's Server Components: what a staff endpoint answers, read
 * with the visitor's cookies from the server at PEAL_API_URL. Anyone but
 * staff, and anything the API does not find, gets the not-found page; any
 * other failure goes to the error page.
 */
export const staffRead = async <A, E extends { readonly _tag: string }>(
  read: (staff: StaffClient) => Effect.Effect<A, E>
): Promise<A> =>
  Option.getOrElse(await consoleRead(({ staff }) => read(staff)), () =>
    notFound()
  );

/**
 * The same for the legal requests' endpoints, which answer staff who hold
 * the legal role: other staff get the not-found page too, as anyone does.
 */
export const legalRead = async <A, E extends { readonly _tag: string }>(
  read: (legal: LegalClient) => Effect.Effect<A, E>
): Promise<A> =>
  Option.getOrElse(await consoleRead(({ legal }) => read(legal)), () =>
    notFound()
  );

/**
 * Whether the visitor answers legal requests, so the console links their
 * page for them alone.
 */
export const answersLegalRequests = async (): Promise<boolean> =>
  Option.isSome(await consoleRead(({ legal }) => legal.standing()));

/**
 * The same as `staffRead`, for the requests to cancel or withdraw that
 * wait for staff, which the billing context answers behind the same access.
 */
export const deskRead = async <A, E extends { readonly _tag: string }>(
  read: (desk: DeskClient) => Effect.Effect<A, E>
): Promise<A> =>
  Option.getOrElse(
    await consoleRead(({ contractRequestsDesk }) => read(contractRequestsDesk)),
    () => notFound()
  );
