import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no ad network sign-in with this id, or it is another member's: only who signed in chooses the ad accounts it connects. */
export class AdConnectionNotFound extends Schema.TaggedError<AdConnectionNotFound>()(
  "AdConnectionNotFound",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no ad network sign-in with this id, or it is another member's: only who signed in chooses the ad accounts it connects.",
    httpApiStatus: 404,
  }
) {}
