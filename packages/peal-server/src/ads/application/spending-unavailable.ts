import { Schema } from "effect";

/** This server does not offer spending on ads: its operator turned ads on for reading only. */
export class SpendingUnavailable extends Schema.TaggedError<SpendingUnavailable>()(
  "SpendingUnavailable",
  {}
) {}
