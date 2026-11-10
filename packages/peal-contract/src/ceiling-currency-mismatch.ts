import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The ceiling is in another currency than the ad account's (`accountCurrency`): nothing was changed. */
export class CeilingCurrencyMismatch extends Schema.TaggedError<CeilingCurrencyMismatch>()(
  "CeilingCurrencyMismatch",
  {
    ...errorEnvelope,
    accountCurrency: Schema.String,
  },
  {
    description:
      "The ceiling is in another currency than the ad account's (`accountCurrency`): nothing was changed.",
    httpApiStatus: 422,
  }
) {}
