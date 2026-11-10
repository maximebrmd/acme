import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace already has a signature of this name. */
export class SignatureNameTaken extends Schema.TaggedError<SignatureNameTaken>()(
  "SignatureNameTaken",
  { ...errorEnvelope },
  {
    description:
      "The workspace already has a signature of this name, whatever its case. Nothing was changed.",
    httpApiStatus: 409,
  }
) {}
