import { Effect, Stream } from "effect";
import type { Duration } from "effect";

import { OutboundGuard } from "./outbound-guard.ts";
import type { OutboundRequestRefused } from "./outbound-request-refused.ts";
import { UploadUnanswered } from "./upload-unanswered.ts";

/** A file sent in one request, read from a stream as it goes. */
export interface StreamedUpload<E> {
  /** The request's body, of `contentLength` bytes exactly. */
  readonly body: Stream.Stream<Uint8Array, E>;
  readonly contentLength: number;
  readonly contentType: string;
  /** The longest the whole request may take. */
  readonly timeout: Duration.Input;
  readonly url: URL;
}

/**
 * POSTs a body of a known length read from a stream, under the public HTTP
 * client's rules (`./public-http.ts`): the OutboundGuard checks the host,
 * redirects are not followed, the answer's body is not read, the request
 * times out, and the host gets no trace context.
 *
 * It is for the hosts that take a whole file in one request and need its
 * `Content-Length`, as the object stores platforms hand uploads to: the
 * fetch HttpClient sends a stream chunked, without a length, which they
 * refuse, and holding a video in memory to learn its length is not an
 * option. Answers the status.
 */
export const publicStreamedPost = Effect.gen(function* publicStreamedPost() {
  const guard = yield* OutboundGuard;

  return <E>(
    upload: StreamedUpload<E>
  ): Effect.Effect<number, OutboundRequestRefused | UploadUnanswered> =>
    guard.check(upload.url).pipe(
      Effect.andThen(Stream.toReadableStreamEffect(upload.body)),
      Effect.flatMap((body) =>
        Effect.tryPromise({
          catch: () => new UploadUnanswered(),
          try: async (signal) => {
            const response = await globalThis.fetch(upload.url, {
              body,
              duplex: "half",
              headers: {
                "content-length": String(upload.contentLength),
                "content-type": upload.contentType,
              },
              method: "POST",
              redirect: "manual",
              signal,
            });

            await response.body?.cancel();

            return response.status;
          },
        })
      ),
      Effect.timeoutOrElse({
        duration: upload.timeout,
        orElse: () => Effect.fail(new UploadUnanswered()),
      }),
      Effect.withSpan("PublicUpload.post")
    );
});
