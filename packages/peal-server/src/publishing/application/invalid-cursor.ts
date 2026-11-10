import { Schema } from "effect";

/**
 * The cursor is none a page gave, or one of a page sorted another way: a
 * page's cursor only continues its own list.
 */
export class InvalidCursor extends Schema.TaggedError<InvalidCursor>()(
  "InvalidCursor",
  {}
) {}
