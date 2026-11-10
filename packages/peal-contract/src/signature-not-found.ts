import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no signature with this id. */
export class SignatureNotFound extends Schema.TaggedError<SignatureNotFound>()(
  "SignatureNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no signature with this id.",
    httpApiStatus: 404,
  }
) {}
