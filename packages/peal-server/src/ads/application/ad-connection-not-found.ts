import { Schema } from "effect";

/** No sign-in of this workspace has this id, or it is another member's. */
export class AdConnectionNotFound extends Schema.TaggedError<AdConnectionNotFound>()(
  "AdConnectionNotFound",
  {}
) {}
