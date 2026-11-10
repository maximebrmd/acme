import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The ad account cannot take a boost now. */
export class AdAccountUnusable extends Schema.TaggedError<AdAccountUnusable>()(
  "AdAccountUnusable",
  {
    ...errorEnvelope,
    reason: Schema.Literals(["status", "reconnectNeeded", "permission"]),
  },
  {
    description:
      "The ad account cannot take a boost now. `status`: its network does not let it run ads (disabled, unpaid, in review, closed). `reconnectNeeded`: the network refused its sign-in, whose person signs in again. `permission`: its sign-in did not allow making and running ads.",
    httpApiStatus: 409,
  }
) {}
