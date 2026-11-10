import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { Int64Schema } from "./int64.ts";

/** The ad account's own spend cap leaves too little room for the boost. */
export class AdAccountSpendCapExceeded extends Schema.TaggedError<AdAccountSpendCapExceeded>()(
  "AdAccountSpendCapExceeded",
  {
    ...errorEnvelope,
    currency: Schema.String,
    // What the boost would commit, in the account's minor units.
    requested: Int64Schema,
    // What the cap leaves once the account's boosts are counted.
    room: Int64Schema,
  },
  {
    description:
      "The ad account's own spend cap, set at its network, leaves `room` once what its boosts already commit is taken off, and the boost would commit `requested`, in minor units of `currency`. Nothing was reserved or sent. The cap is raised at the network, never by Peal.",
    httpApiStatus: 409,
  }
) {}
