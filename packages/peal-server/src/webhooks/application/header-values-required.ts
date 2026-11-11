import { Schema } from "effect";

/**
 * A change that moves an endpoint with headers to another origin (scheme,
 * host or port) without giving every header's value again or clearing
 * them: a value sealed for one origin is never sent to another. Nothing
 * was saved.
 */
export class HeaderValuesRequired extends Schema.TaggedError<HeaderValuesRequired>()(
  "HeaderValuesRequired",
  {}
) {}
