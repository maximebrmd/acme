import { Effect, Result } from "effect";
import type { Duration, Stream } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientError,
  HttpClientRequest,
} from "effect/http";
import type { HttpClientResponse } from "effect/http";

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

/** What becomes of an answer larger than Peal reads. */
export type Overflow =
  // Reading it fails: nothing of it is used.
  | "fail"
  // It ends at the limit, as if the host had sent no more: for a caller
  // that can use the start of an answer, and tells by itself that the
  // rest is missing.
  | "truncate";

// The answer, whose body fails to read, or ends, once it goes past `limit`
// bytes; the rest is never downloaded.
const boundedTo =
  (limit: number, overflow: Overflow = "fail") =>
  (response: Response): Response => {
    if (response.body === null || bodilessStatuses.has(response.status)) {
      return response;
    }

    let received = 0;

    const cutOff = new TransformStream<Uint8Array, Uint8Array>({
      transform: (chunk, controller) => {
        const room = limit - received;

        received += chunk.byteLength;

        if (received <= limit) {
          controller.enqueue(chunk);

          return;
        }

        if (overflow === "fail") {
          controller.error(
            new TypeError(`The answer is larger than ${limit} bytes`)
          );

          return;
        }

        // What fits of the last chunk, then nothing more.
        if (room > 0) {
          controller.enqueue(chunk.subarray(0, room));
        }

        controller.terminate();
      },
    });

    return new Response(response.body.pipeThrough(cutOff), {
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

// Effect's fetch client drops Content-Length, which fetch works out itself
// for a body it holds; a streamed body then goes out chunked, which some
// servers refuse. A request whose body is streamed names its length in
// this header instead (`streamedBody`), which never leaves the process:
// the fetch below sends it as Content-Length, which Bun and Node honour.
const streamedLengthHeader = "x-peal-streamed-length";

const withStreamedLength = (init: RequestInit | undefined) => {
  if (init === undefined) {
    return init;
  }

  const headers = new Headers(init.headers);
  const length = headers.get(streamedLengthHeader);

  if (length === null) {
    return init;
  }

  headers.delete(streamedLengthHeader);
  headers.set("content-length", length);

  return { ...init, headers };
};

// A fetch whose answers are cut off past `limit` bytes.
const fetchBoundedTo = (limit: number, overflow: Overflow = "fail") => {
  const bounded = boundedTo(limit, overflow);

  return withPreconnect(async (input, init) =>
    bounded(await globalThis.fetch(input, withStreamedLength(init)))
  );
};

const boundedFetch = fetchBoundedTo(maxResponseBytes);

/**
 * Gives a request a body read from `bytes` as it is sent, so a file of any
 * size is never held whole, with the length the server is told: the bytes
 * must add up to `contentLength`. Sent through the public HTTP client
 * only, which turns the length into the request's Content-Length. The
 * stream is opened again when the request is sent again.
 */
export const streamedBody =
  <E>(
    bytes: Stream.Stream<Uint8Array, E>,
    options: { readonly contentLength: number; readonly contentType: string }
  ) =>
  (request: HttpClientRequest.HttpClientRequest) =>
    request.pipe(
      HttpClientRequest.bodyStream(bytes, { contentType: options.contentType }),
      HttpClientRequest.setHeader(
        streamedLengthHeader,
        String(options.contentLength)
      )
    );

/** What the public HTTP client is built with. */
export interface PublicHttpOptions {
  readonly maxResponseBytes?: number;
  readonly overflow?: Overflow;
  readonly timeout: Duration.Input;
}

// The client and the guard, and the fetch that bounds answers as asked.
const publicParts = (options: PublicHttpOptions) =>
  Effect.gen(function* makePublicParts() {
    const client = yield* HttpClient.HttpClient;
    const guard = yield* OutboundGuard;

    const fetch =
      options.maxResponseBytes === undefined
        ? boundedFetch
        : fetchBoundedTo(options.maxResponseBytes, options.overflow);

    // What every request goes out with: no redirect followed, the answer
    // bounded, no trace context.
    const sent = <E, R>(
      response: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>
    ) =>
      response.pipe(
        Effect.provideService(FetchHttpClient.RequestInit, noRedirects),
        Effect.provideService(FetchHttpClient.Fetch, fetch),
        Effect.provideService(HttpClient.TracerPropagationEnabled, false)
      );

    return { client, guard, sent };
  });

/**
 * The public HTTP client (see `publicHttpClient`), with requests timing out
 * after `timeout`: for uploads of images and videos, which take longer than
 * the default allows. With `maxResponseBytes`, answers are cut off past
 * that many bytes rather than past a megabyte: for a file a member asked
 * Peal to fetch, whose caller counts the bytes it takes. With `overflow`
 * `truncate`, a longer answer ends there instead of failing.
 */
export const publicHttpClientWith = (options: PublicHttpOptions) =>
  Effect.gen(function* publicHttpClient() {
    const { client, guard, sent } = yield* publicParts(options);

    // The guard checks the request as it is sent, once every mapping is
    // done: a library that prepends its base address over this client has
    // its address checked too.
    return client.pipe(
      HttpClient.transform((response, request) =>
        sent(guard.check(new URL(request.url)).pipe(Effect.andThen(response)))
      ),
      HttpClient.timeout(options.timeout)
    );
  });

/**
 * The public HTTP client with the same rules, for a client library that
 * takes an `HttpClient` failing with HttpClientError alone, and prepends
 * its own base address over it (as the AI provider packages do): a
 * request the guard refuses fails as a transport error, whose cause is the
 * OutboundRequestRefused. Check the address with the guard first to tell
 * the refusal apart.
 */
export const publicLibraryHttpClientWith = (options: PublicHttpOptions) =>
  Effect.gen(function* publicLibraryHttpClient() {
    const { client, guard, sent } = yield* publicParts(options);

    const checked: HttpClient.HttpClient = client.pipe(
      HttpClient.transform((response, request) =>
        sent(
          guard.check(new URL(request.url)).pipe(
            Effect.mapError(
              (cause) =>
                new HttpClientError.HttpClientError({
                  reason: new HttpClientError.TransportError({
                    cause,
                    description: "The outbound guard refused the request",
                    request,
                  }),
                })
            ),
            Effect.andThen(response)
          )
        )
      ),
      HttpClient.timeout(options.timeout)
    );

    return checked;
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
