import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The request was already applied, refused or closed. */
export class ContractRequestSettled extends Schema.TaggedError<ContractRequestSettled>()(
  "ContractRequestSettled",
  { ...errorEnvelope, status: Schema.String },
  {
    description:
      "The request was already applied, refused or closed: nothing more is done with it.",
    httpApiStatus: 409,
  }
) {}
