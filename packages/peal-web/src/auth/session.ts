import { Api } from "peal-contract";
import type { Me } from "peal-contract";
import { Effect, Exit, Option } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { headers } from "next/headers";
import { cache } from "react";

import { serverUrl } from "#api/server-url.ts";

const signedOut = () => Effect.succeed(Option.none<Me>());

/**
 * The signed-in user, from GET /api/me with the visitor's cookies, or none.
 * Server code reaches the server at PEAL_API_URL, not through the proxy.
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
 * The user, or none when reading them failed, which is logged: for what
 * every page shows, so that the API being down leaves the pages up.
 */
export const orSignedOut = <E, R>(
  user: Effect.Effect<Option.Option<Me>, E, R>
) =>
  user.pipe(
    Effect.catchCause((cause) =>
      Effect.logWarning("The signed-in user could not be read", cause).pipe(
        Effect.as(Option.none<Me>())
      )
    )
  );

// Read once per request, however many components ask; each decides what a
// failure means.
const readCurrentUser = cache(async () => {
  const incoming = await headers();
  const cookie = incoming.get("cookie");

  return cookie === null
    ? Exit.succeed(Option.none<Me>())
    : await Effect.runPromiseExit(currentUserEffect(cookie));
});

/**
 * For Server Components: the user the request's cookies sign in, if any.
 * Fails when GET /api/me does.
 */
export const currentUser = async (): Promise<Option.Option<Me>> =>
  await Effect.runPromise(await readCurrentUser());

/**
 * For the header, on every page: the same user, or none when GET /api/me
 * fails, so the page still renders, with a way to sign in.
 */
export const currentUserOrNone = async (): Promise<Option.Option<Me>> =>
  await Effect.runPromise(orSignedOut(await readCurrentUser()));
