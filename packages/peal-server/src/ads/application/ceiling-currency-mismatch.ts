import { Schema } from "effect";

/** The ceiling is in another currency than the ad account's. */
export class CeilingCurrencyMismatch extends Schema.TaggedError<CeilingCurrencyMismatch>()(
  "CeilingCurrencyMismatch",
  { accountCurrency: Schema.String }
) {}
