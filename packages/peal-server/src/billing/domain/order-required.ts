import { Schema } from "effect";

/**
 * A checkout was asked without an order placed on the billing page for the
 * same plan and interval, by the same member, in the last 30 minutes, or
 * with one already used.
 */
export class OrderRequired extends Schema.TaggedError<OrderRequired>()(
  "OrderRequired",
  {}
) {}
