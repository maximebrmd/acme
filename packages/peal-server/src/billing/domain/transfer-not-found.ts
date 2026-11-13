import { Schema } from "effect";

/**
 * No offer to take over the workspace's billing is open for the one who
 * asks: none was made, it expired, or it was taken or withdrawn.
 */
export class TransferNotFound extends Schema.TaggedError<TransferNotFound>()(
  "TransferNotFound",
  {}
) {}
