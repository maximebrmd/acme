import { Schema } from "effect";

/**
 * No request waits behind this link or this id: unknown, expired, or
 * already applied.
 */
export class ContractRequestNotFound extends Schema.TaggedError<ContractRequestNotFound>()(
  "ContractRequestNotFound",
  {}
) {}
