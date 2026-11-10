import { Schema } from "effect";

/** The endpoint has no delivery with this id. */
export class DeliveryNotFound extends Schema.TaggedError<DeliveryNotFound>()(
  "DeliveryNotFound",
  { deliveryId: Schema.String }
) {}
