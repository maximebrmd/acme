import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Why a file could not be fetched from its address: its host does not
 * resolve (`unknownHost`), did not answer, or broke off (`noAnswer`),
 * answered something else than the file (`badStatus`, with the `status`),
 * redirected more than three times (`tooManyRedirects`), or the file did
 * not arrive within the time an import has (`tooSlow`).
 */
export const MediaSourceFailureSchema = Schema.Literals([
  "unknownHost",
  "noAnswer",
  "badStatus",
  "tooManyRedirects",
  "tooSlow",
]).annotate({ identifier: "MediaSourceFailure" });

export type MediaSourceFailure = typeof MediaSourceFailureSchema.Type;

/** The file could not be fetched from its address. */
export class MediaSourceUnreachable extends Schema.TaggedError<MediaSourceUnreachable>()(
  "MediaSourceUnreachable",
  {
    ...errorEnvelope,
    reason: MediaSourceFailureSchema,
    // The HTTP status the host answered, for `badStatus`.
    status: Schema.NullOr(Schema.Int),
  },
  {
    description:
      "The file could not be fetched from its address: `reason` says why (`unknownHost`, `noAnswer`, `badStatus` with the host's `status`, `tooManyRedirects`, or `tooSlow` when it did not arrive within 90 seconds). Nothing was stored. A file too slow to import can be uploaded instead.",
    httpApiStatus: 422,
  }
) {}
