import { Schema } from "effect";

/**
 * A file could not be fetched from its address: its host does not resolve
 * (`unknownHost`), did not answer or broke off (`noAnswer`), answered
 * something else than the file (`badStatus`, with the status), redirected
 * too often (`tooManyRedirects`), or the file did not arrive in the time
 * an import has (`tooSlow`). The address itself is never kept: it can hold
 * a token.
 */
export class MediaSourceUnreachable extends Schema.TaggedError<MediaSourceUnreachable>()(
  "MediaSourceUnreachable",
  {
    reason: Schema.Literals([
      "unknownHost",
      "noAnswer",
      "badStatus",
      "tooManyRedirects",
      "tooSlow",
    ]),
    status: Schema.Option(Schema.Int),
  }
) {}
