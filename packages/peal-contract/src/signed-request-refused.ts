import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The request was not signed with the app's secret, or is malformed. */
export class SignedRequestRefused extends Schema.TaggedError<SignedRequestRefused>()(
  "SignedRequestRefused",
  { ...errorEnvelope },
  {
    description:
      "The signed request does not match the app's secret, or cannot be read. Nothing was deleted.",
    httpApiStatus: 400,
  }
) {}
