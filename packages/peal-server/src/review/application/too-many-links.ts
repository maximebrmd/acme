import { Schema } from "effect";

/** The post has as many working links as it may. */
export class TooManyLinks extends Schema.TaggedError<TooManyLinks>()(
  "TooManyLinks",
  { limit: Schema.Int }
) {}
