import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** A sign-in to an ad network did not come to a connection. */
export class AdSignInFailed extends Schema.TaggedError<AdSignInFailed>()(
  "AdSignInFailed",
  {
    ...errorEnvelope,
    reason: Schema.Literals(["denied", "expired", "failed", "notConfigured"]),
  },
  {
    description:
      "A sign-in to an ad network did not come to a connection. `denied`: the person refused, or left out the permission reading needs. `expired`: the sign-in is unknown, was completed already, is older than 15 minutes or was started by someone else: start again. `failed`: the network refused the exchange. `notConfigured`: the server has no key to encrypt the token with.",
    httpApiStatus: 422,
  }
) {}
