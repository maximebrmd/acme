import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { MeterSchema } from "./rate-card.ts";

/**
 * Why a meter refused: `paymentMethodRequired`, the billing account has no
 * payment method and used what its month includes without one (none at
 * all of the writing assistant on the server's models); `ceilingReached`,
 * it pays, and the units would pass the monthly ceiling it set (the
 * writing assistant's, and X's, or what it may spend until its first
 * invoice is paid); `planAllowance`, its legacy plan includes no more
 * (per-account pricing bills past the allowance); `paymentFailed`, its
 * payment is failing: nothing past the allowance until it goes through;
 * `notEnabled`, the meter is not turned on
 * for it.
 */
export const AllowanceReasonSchema = Schema.Literals([
  "paymentMethodRequired",
  "ceilingReached",
  "notEnabled",
  "planAllowance",
  "paymentFailed",
]).annotate({ identifier: "AllowanceReason" });

export type AllowanceReason = typeof AllowanceReasonSchema.Type;

/**
 * The workspace's billing account used what a meter allows it this
 * calendar month (UTC): nothing was counted, nor done. Reading, analytics
 * and publishing go on. Only a server that bills answers it.
 */
export class UsageAllowanceReached extends Schema.TaggedError<UsageAllowanceReached>()(
  "UsageAllowanceReached",
  {
    ...errorEnvelope,
    // How many units of the meter the account may use this month.
    allowed: Schema.Int,
    // The billing page of the workspace that bills the account, where an
    // owner or an admin adds a payment method or raises a ceiling.
    billingUrl: Schema.String,
    meter: MeterSchema,
    reason: AllowanceReasonSchema,
    // The first of next month, 00:00 UTC, when the meter counts from zero
    // again.
    resetsAt: Schema.DateTimeUtc,
    // How many units of the meter the account used this month.
    used: Schema.Int,
  },
  {
    description:
      "The workspace's billing account used the `allowed` units of `meter` it may use this calendar month (UTC), and used `used`: nothing was counted, nor done. `reason` says the way out: `paymentMethodRequired`, an owner or an admin adds a payment method on the billing page (`billingUrl`), after which what passes the allowance is billed at the rate card's price (the writing assistant on the server's models needs one from the first request); `ceilingReached`, they raise the account's monthly ceiling there (until the account's first invoice is paid, what its meters bill a month is capped whatever the ceiling); `planAllowance`, the workspace's legacy plan includes no more, and moving to per-account pricing there bills what passes it; `paymentFailed`, the subscription's last payment failed: once it goes through (the payment method is updated in the billing page's portal), what passes the allowance is billed again; `notEnabled`, the meter is off for the account. Otherwise it waits for `resetsAt`, the first of next month. Reading, analytics and publishing go on.",
    httpApiStatus: 402,
  }
) {}
