import { Schema } from "effect";

/** This server does not bill: there is nothing to order or cancel. */
export class BillingOff extends Schema.TaggedError<BillingOff>()(
  "BillingOff",
  {}
) {}
