import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** No request waits behind this link or this id. */
export class ContractRequestNotFound extends Schema.TaggedError<ContractRequestNotFound>()(
  "ContractRequestNotFound",
  { ...errorEnvelope },
  {
    description:
      "No request waits behind this link or this id: it is unknown, has expired, or was already applied.",
    httpApiStatus: 404,
  }
) {}
