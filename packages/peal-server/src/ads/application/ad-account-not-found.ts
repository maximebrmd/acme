import { Schema } from "effect";

/** No ad account of this workspace has this id. */
export class AdAccountNotFound extends Schema.TaggedError<AdAccountNotFound>()(
  "AdAccountNotFound",
  {}
) {}
