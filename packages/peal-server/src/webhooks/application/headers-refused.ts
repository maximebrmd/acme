import { Schema } from "effect";

/**
 * Headers an endpoint cannot carry: more than its limit, a name twice, a
 * name Peal sets or that is no HTTP token, or a value that is not visible
 * ASCII on one line. Nothing was saved.
 */
export class HeadersRefused extends Schema.TaggedError<HeadersRefused>()(
  "HeadersRefused",
  {}
) {}
