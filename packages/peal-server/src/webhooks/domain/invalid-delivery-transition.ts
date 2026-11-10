import { Schema } from "effect";

import { WebhookDeliveryIdSchema } from "./webhook-delivery-id.ts";

/** A delivery already over was asked to go on. */
export class InvalidDeliveryTransition extends Schema.TaggedError<InvalidDeliveryTransition>()(
  "InvalidDeliveryTransition",
  {
    deliveryId: WebhookDeliveryIdSchema,
    from: Schema.Literals(["succeeded", "failed"]),
  }
) {}
