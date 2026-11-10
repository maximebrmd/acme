import { Schema } from "effect";

/** No owner allowed this ad account to spend through Peal. */
export class SpendingNotEnabled extends Schema.TaggedError<SpendingNotEnabled>()(
  "SpendingNotEnabled",
  {}
) {}
