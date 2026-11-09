import { Schema } from "effect";

/** The workspace has no subscription to cancel, or it already ends. */
export class NothingToCancel extends Schema.TaggedError<NothingToCancel>()(
  "NothingToCancel",
  {},
  {
    description:
      "The workspace has no subscription to cancel, or it is already set to end.",
    httpApiStatus: 409,
  }
) {}
