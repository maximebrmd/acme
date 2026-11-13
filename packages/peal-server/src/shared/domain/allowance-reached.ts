import { Schema } from "effect";

import { MeterSchema } from "./meter.ts";

/**
 * Why a meter refused: the billing account has no payment method and
 * used its allowance without one (`paymentMethodRequired`: none at all
 * for the assistant on the server's models); it pays, and the units would
 * pass the monthly ceiling it set, or what it may spend until its first
 * invoice is paid (`ceilingReached`); the meter is not turned on for it
 * (`notEnabled`); its legacy plan includes no more (`planAllowance`:
 * per-account pricing bills past it); or its payment is failing
 * (`paymentFailed`: nothing past the allowance until it is paid).
 */
export const AllowanceReasonSchema = Schema.Literals([
  "paymentMethodRequired",
  "ceilingReached",
  "notEnabled",
  "planAllowance",
  "paymentFailed",
]);

export type AllowanceReason = typeof AllowanceReasonSchema.Type;

/**
 * The billing account used what a meter allows it this calendar month
 * (UTC): `allowed` units, of which it used `used`, until `resetsAt`, the
 * first of next month. Nothing was counted, nor done.
 */
export class AllowanceReached extends Schema.TaggedError<AllowanceReached>()(
  "AllowanceReached",
  {
    allowed: Schema.Int,
    meter: MeterSchema,
    reason: AllowanceReasonSchema,
    resetsAt: Schema.DateTimeUtc,
    used: Schema.Int,
  }
) {
  override get message(): string {
    return `The billing account used ${this.used} of the ${this.allowed} ${this.meter} it may use this month`;
  }
}
