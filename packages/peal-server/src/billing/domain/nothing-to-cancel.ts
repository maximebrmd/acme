import { Schema } from "effect";

/**
 * The workspace has no subscription to cancel: none, or one already set to
 * end.
 */
export class NothingToCancel extends Schema.TaggedError<NothingToCancel>()(
  "NothingToCancel",
  {}
) {}
