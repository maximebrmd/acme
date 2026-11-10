import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { Int64Schema } from "./int64.ts";

/** The boost would pass the monthly ceiling an owner set. */
export class SpendCeilingExceeded extends Schema.TaggedError<SpendCeilingExceeded>()(
  "SpendCeilingExceeded",
  {
    ...errorEnvelope,
    // The monthly ceiling, in the account's minor units.
    ceiling: Int64Schema,
    // What the account's boosts already commit in the fullest month the
    // run touches.
    committed: Int64Schema,
    currency: Schema.String,
    // What this boost would add.
    requested: Int64Schema,
  },
  {
    description:
      "The boost would pass the monthly ceiling an owner set for the ad account: its boosts already commit `committed` in the fullest calendar month the run touches, this one would add `requested`, and the ceiling is `ceiling`, all in minor units of `currency`. Nothing was reserved or sent. An owner raises the ceiling in the web app, or the boost is made smaller; Peal never raises a ceiling on its own.",
    httpApiStatus: 409,
  }
) {}
