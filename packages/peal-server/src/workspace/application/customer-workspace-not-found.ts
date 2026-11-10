import { Schema } from "effect";

/**
 * The partner owns no such workspace: one that does not exist, another
 * partner's and anyone else's all read the same.
 */
export class CustomerWorkspaceNotFound extends Schema.TaggedError<CustomerWorkspaceNotFound>()(
  "CustomerWorkspaceNotFound",
  {}
) {}
