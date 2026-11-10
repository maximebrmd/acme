import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no ad account with this id, or the sign-in does not reach the account asked for. */
export class AdAccountNotFound extends Schema.TaggedError<AdAccountNotFound>()(
  "AdAccountNotFound",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no ad account with this id, or the sign-in does not reach the account asked for.",
    httpApiStatus: 404,
  }
) {}
