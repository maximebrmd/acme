import { Schema } from "effect";

/**
 * The ad account has boosts that run, may run or are being made: they are
 * stopped before it is disconnected, so nothing spends that Peal no longer
 * sees.
 */
export class AdAccountBusy extends Schema.TaggedError<AdAccountBusy>()(
  "AdAccountBusy",
  { boosts: Schema.Int }
) {}
