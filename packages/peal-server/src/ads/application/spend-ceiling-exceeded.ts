import { Schema } from "effect";

/**
 * The boost would pass the monthly ceiling an owner set for the ad
 * account: `committed` is what its boosts already commit in the fullest
 * month the run touches, `requested` what this one would add, all in the
 * account's minor units. An owner raises the ceiling, or the boost is made
 * smaller.
 */
export class SpendCeilingExceeded extends Schema.TaggedError<SpendCeilingExceeded>()(
  "SpendCeilingExceeded",
  {
    ceiling: Schema.Int,
    committed: Schema.Int,
    currency: Schema.String,
    requested: Schema.Int,
  }
) {}
