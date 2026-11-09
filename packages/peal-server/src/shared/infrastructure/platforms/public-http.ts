import { Effect, Result } from "effect";
import type { Duration } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";

import { OutboundGuard } from "./outbound-guard.ts";

// Platforms answer within seconds; a request that takes longer is treated as
// lost, which every caller already handles.
const requestTimeout = "20 seconds";

const noRedirects: globalThis.RequestInit = { redirect: "manual" };

// The most an answer may carry. Platforms answer with small JSON documents
// (an account, OAuth metadata, a DID document): a host sending more is
// trying to fill Peal's memory.
const maxResponseBytes = 1_048_576;

// Statuses whose answers have no body, which a Response cannot be given.
const bodilessStatuses: ReadonlySet<number> = new Set([
  101, 103, 204, 205, 304,
]);

// The answer, whose body fails to read once it goes past the limit; the
// rest is never downloaded.
const bounded = (response: Response): Response => {
  if (response.body === null || bodilessStatuses.has(response.status)) {
    return response;
  }

  let received = 0;

  const limit = new TransformStream<Uint8Array, Uint8Array>({
    transform: (chunk, controller) => {
      received += chunk.byteLength;

      if (received > maxResponseBytes) {
        controller.error(
          new TypeError(`The answer is larger than ${maxResponseBytes} bytes`)
        );

        return;
      }

      controller.enqueue(chunk);
    },
  });

  return new Response(response.body.pipeThrough(limit), {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
};

/** A fetch function, as libraries take one. */
export type PublicFetch = typeof globalThis.fetch;

// Bun's fetch also offers `preconnect`, which these pass on: warming a
// connection sends nothing.
const withPreconnect = (
  fetch: (
    input: Request | URL | string,
    init?: RequestInit
  ) => Promise<Response>
): PublicFetch =>
  Object.assign(fetch, { preconnect: globalThis.fetch.preconnect });

const boundedFetch = withPreconnect(async (input, init) =>
  bounded(await globalThis.fetch(input, init))
);

/**
 * The public HTTP client (see `publicHttpClient`), with requests timing out
 * after `timeout`: for uploads of images and videos, which take longer than
 * the default allows.
 */
export const publicHttpClientWith = (options: {
  readonly timeout: Duration.Input;
}) =>
  Effect.gen(function* publicHttpClient() {
    const client = yield* HttpClient.HttpClient;
    const guard = yield* OutboundGuard;

    return client.pipe(
      HttpClient.mapRequestEffect((request) =>
        guard.check(new URL(request.url)).pipe(Effect.as(request))
      ),
      HttpClient.transform((response) =>
        response.pipe(
          Effect.provideService(FetchHttpClient.RequestInit, noRedirects),
          Effect.provideService(FetchHttpClient.Fetch, boundedFetch),
          Effect.provideService(HttpClient.TracerPropagationEnabled, false)
        )
      ),
      HttpClient.timeout(options.timeout)
    );
  });

/**
 * The HTTP client for hosts a user chose: every request is checked by the
 * OutboundGuard before it is sent, redirects are answered as they come
 * rather than followed (a redirect could lead past the guard), answers are
 * cut off past a megabyte, requests time out, and the host is not sent
 * Peal's trace context. Built on the fetch HttpClient, whose fetch it bounds.
 */
export const publicHttpClient = publicHttpClientWith({
  timeout: requestTimeout,
});

/**
 * The same rules as a fetch function, for client libraries that take one: a
 * refused request rejects with a TypeError, as fetch does when it cannot
 * connect, whose cause is the OutboundRequestRefused.
 */
export const publicFetch = Effect.gen(function* publicFetch() {
  const guard = yield* OutboundGuard;

  return withPreconnect(async (input, init) => {
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

    return await boundedFetch(request, {
      ...noRedirects,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
    });
  });
});
