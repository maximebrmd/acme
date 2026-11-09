import { Effect, Result } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";

import { OutboundGuard } from "./outbound-guard.ts";

// Platforms answer within seconds; a request that takes longer is treated as
// lost, which every caller already handles.
const requestTimeout = "20 seconds";

const noRedirects: globalThis.RequestInit = { redirect: "manual" };

/**
 * The HTTP client for hosts a user chose: every request is checked by the
 * OutboundGuard before it is sent, redirects are answered as they come
 * rather than followed (a redirect could lead past the guard), and requests
 * time out.
 */
export const publicHttpClient = Effect.gen(function* publicHttpClient() {
  const client = yield* HttpClient.HttpClient;
  const guard = yield* OutboundGuard;

  return client.pipe(
    HttpClient.mapRequestEffect((request) =>
      guard.check(new URL(request.url)).pipe(Effect.as(request))
    ),
    HttpClient.transform((response) =>
      response.pipe(
        Effect.provideService(FetchHttpClient.RequestInit, noRedirects)
      )
    ),
    HttpClient.timeout(requestTimeout)
  );
});

/** A fetch function, as libraries take one. */
export type PublicFetch = typeof globalThis.fetch;

/**
 * The same rules as a fetch function, for client libraries that take one: a
 * refused request rejects with a TypeError, as fetch does when it cannot
 * connect, whose cause is the OutboundRequestRefused.
 */
export const publicFetch = Effect.gen(function* publicFetch() {
  const guard = yield* OutboundGuard;

  const guarded = async (
    input: Request | URL | string,
    init?: RequestInit
  ): Promise<Response> => {
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(input instanceof URL ? input.href : input, init);

    const url = new URL(request.url);

    const checked = await Effect.runPromise(
      guard.check(url).pipe(Effect.result)
    );

    if (Result.isFailure(checked)) {
      throw new TypeError(`fetch refused for ${url.host}`, {
        cause: checked.failure,
      });
    }

    return await globalThis.fetch(request, {
      ...noRedirects,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
    });
  };

  // Bun's fetch also offers `preconnect`, which this one passes on: warming
  // a connection sends nothing.
  const fetch: PublicFetch = Object.assign(guarded, {
    preconnect: globalThis.fetch.preconnect,
  });

  return fetch;
});
