import { Schema } from "effect";

/** No request waits behind this link or this id. */
export class ContractRequestNotFound extends Schema.TaggedError<ContractRequestNotFound>()(
  "ContractRequestNotFound",
  {},
  {
    description:
      "No request waits behind this link or this id: it is unknown, has expired, or was already applied.",
    httpApiStatus: 404,
  }
) {}
