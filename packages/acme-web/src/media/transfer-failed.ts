import { Schema } from "effect";

/**
 * A request to the media store did not succeed: it answered with this
 * status, or nothing came back (`status` is null), as when the connection
 * dropped.
 */
export class TransferFailed extends Schema.TaggedError<TransferFailed>()(
  "TransferFailed",
  { status: Schema.NullOr(Schema.Int) }
) {}
