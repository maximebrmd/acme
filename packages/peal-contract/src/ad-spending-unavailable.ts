import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** This server offers ads for reading only: its operator has not turned spending on. */
export class AdSpendingUnavailable extends Schema.TaggedError<AdSpendingUnavailable>()(
  "AdSpendingUnavailable",
  { ...errorEnvelope },
  {
    description:
      "This server offers ads for reading only: its operator has not turned spending on. Nothing was spent or changed.",
    httpApiStatus: 409,
  }
) {}
