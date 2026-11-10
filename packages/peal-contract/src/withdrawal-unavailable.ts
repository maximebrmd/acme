import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The workspace's contract cannot be withdrawn from: no subscription that
 * can (`notSubscribed`), its 14 days are over (`expired`), or the customer
 * buys as a business, with a verified VAT number (`business`).
 */
export class WithdrawalUnavailable extends Schema.TaggedError<WithdrawalUnavailable>()(
  "WithdrawalUnavailable",
  {
    ...errorEnvelope,
    reason: Schema.Literals(["notSubscribed", "expired", "business"]),
  },
  {
    description:
      "The subscription cannot be withdrawn from: `notSubscribed` without a running subscription, `expired` once its 14 days are over, `business` for a customer with a verified VAT number. Nothing was changed.",
    httpApiStatus: 409,
  }
) {}
