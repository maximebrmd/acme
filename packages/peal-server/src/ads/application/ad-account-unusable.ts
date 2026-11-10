import { Schema } from "effect";

/**
 * The ad account cannot take a boost now:
 *
 * - `status`: its network does not let it run ads (disabled, unpaid, in
 *   review, closed).
 * - `reconnectNeeded`: the network refused its sign-in: its person signs
 *   in again.
 * - `permission`: its sign-in did not allow making and running ads.
 */
export class AdAccountUnusable extends Schema.TaggedError<AdAccountUnusable>()(
  "AdAccountUnusable",
  { reason: Schema.Literals(["status", "reconnectNeeded", "permission"]) }
) {}
