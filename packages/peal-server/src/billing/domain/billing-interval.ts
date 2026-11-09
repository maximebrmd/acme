import { Schema } from "effect";

/** How often a subscription is paid for: each month, or each year. */
export const BillingIntervalSchema = Schema.Literals(["month", "year"]);

export type BillingInterval = typeof BillingIntervalSchema.Type;
