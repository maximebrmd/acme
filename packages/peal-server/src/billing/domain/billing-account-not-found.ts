import { Schema } from "effect";

/** No billing account has this id, or holds this workspace. */
export class BillingAccountNotFound extends Schema.TaggedError<BillingAccountNotFound>()(
  "BillingAccountNotFound",
  {}
) {}
