import { Schema } from "effect";

/** No boost of this workspace has this id. */
export class BoostNotFound extends Schema.TaggedError<BoostNotFound>()(
  "BoostNotFound",
  {}
) {}
