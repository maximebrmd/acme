import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The ad account has `boosts` boosts that run, may run or are being made: they are stopped before the account is disconnected or its spending turned off, so nothing spends that Peal no longer follows. */
export class AdAccountBusy extends Schema.TaggedError<AdAccountBusy>()(
  "AdAccountBusy",
  {
    ...errorEnvelope,
    boosts: Schema.Int,
  },
  {
    description:
      "The ad account has `boosts` boosts that run, may run or are being made: they are stopped before the account is disconnected or its spending turned off, so nothing spends that Peal no longer follows.",
    httpApiStatus: 409,
  }
) {}
