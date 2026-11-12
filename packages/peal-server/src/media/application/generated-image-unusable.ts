import { Schema } from "effect";

/**
 * The bytes a provider answered for a generated image are not an image the
 * library takes: not JPEG, PNG, GIF or WebP, larger than an image may be,
 * or not readable as one. Nothing of them is kept.
 */
export class GeneratedImageUnusable extends Schema.TaggedError<GeneratedImageUnusable>()(
  "GeneratedImageUnusable",
  {}
) {}
