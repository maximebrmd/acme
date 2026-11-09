import { Schema } from "effect";

/** The mail transport did not accept an email. */
export class MailDeliveryFailed extends Schema.TaggedError<MailDeliveryFailed>()(
  "MailDeliveryFailed",
  {
    cause: Schema.Defect(),
    // Whether sending it again may work: a refused connection may, a refused
    // address will not.
    retryable: Schema.Boolean,
  }
) {}
