import { Duration, Effect, Option, Schema } from "effect";
import { Headers, HttpClient } from "effect/http";

import { MediaProbeFailed } from "#media/application/media-probe-failed.ts";
import { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaTypeMismatch } from "#media/application/media-type-mismatch.ts";
import type {
  MediaSource,
  ProbeOutcome,
} from "#media/application/ports/media-probe.ts";
import { maxByteSize, maxDocumentPages } from "#media/domain/media-format.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";

import { countPdfPages, isPdf } from "./pdf-pages.ts";

const probeTimeout = Duration.minutes(1);

const decodeContentLength = Schema.decodeUnknownOption(Schema.FiniteFromString);

const tooLarge = (byteSize: number): boolean => byteSize > maxByteSize.document;

/**
 * Reads a PDF without a PDF library: it fetches the file, which is at most
 * 100 MiB, checks that it starts as a PDF does (anything else was not the
 * type declared), and counts its pages from its page objects
 * (`countPdfPages`). A document of more pages than a platform shows is
 * refused (`tooManyPages`); one whose pages cannot be counted, as an
 * encrypted file, is kept without a count, for the platform to judge. The
 * file is never rendered nor run: Peal only stores it and hands it over.
 */
export const makePdfDocumentProbe = Effect.fn("PdfDocumentProbe.make")(
  function* makePdfDocumentProbe() {
    const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);

    // A store that fails to serve the file is a storage failure, which a
    // later probe can retry, not a damaged file.
    const fetchDocument = Effect.fn("PdfDocumentProbe.fetch")(
      function* fetchDocument(url: string) {
        const response = yield* client.get(url);

        // Refused before the body is read into memory.
        const announced = Headers.get(response.headers, "content-length").pipe(
          Option.flatMap(decodeContentLength)
        );

        if (Option.exists(announced, tooLarge)) {
          return yield* new MediaProbeFailed({ reason: "tooLarge" });
        }

        const bytes = yield* response.arrayBuffer;

        return tooLarge(bytes.byteLength)
          ? yield* new MediaProbeFailed({ reason: "tooLarge" })
          : new Uint8Array(bytes);
      },
      Effect.catchTag("HttpClientError", (cause) =>
        Effect.fail(
          new MediaStorageFailed({ cause, operation: "read a file to probe" })
        )
      )
    );

    return Effect.fn("PdfDocumentProbe.probe")(function* probe(
      source: MediaSource
    ) {
      const pages = yield* Effect.gen(function* readDocument() {
        const bytes = yield* fetchDocument(source.url);

        if (!isPdf(bytes)) {
          return yield* new MediaTypeMismatch({
            declared: source.contentType,
          });
        }

        return yield* countPdfPages(bytes);
      }).pipe(
        Effect.timeoutOrElse({
          duration: probeTimeout,
          orElse: () =>
            Effect.fail(new MediaProbeFailed({ reason: "timedOut" })),
        })
      );

      if (Option.exists(pages, (count) => count > maxDocumentPages)) {
        return yield* new MediaProbeFailed({ reason: "tooManyPages" });
      }

      const outcome: ProbeOutcome = {
        _tag: "probed",
        metadata: new MediaMetadata({
          codec: Option.none(),
          dimensions: Option.none(),
          duration: Option.none(),
          pages,
        }),
      };

      return outcome;
    });
  }
);
