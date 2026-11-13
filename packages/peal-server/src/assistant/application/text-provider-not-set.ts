import { Schema } from "effect";

/** The workspace brought no text provider: there is nothing to test. */
export class TextProviderNotSet extends Schema.TaggedError<TextProviderNotSet>()(
  "TextProviderNotSet",
  {}
) {}
