import { Schema } from "effect";

/**
 * The callback names no connection this member may complete: unknown,
 * expired, already completed, started by someone else or in another
 * workspace. Which one is not told.
 */
export class InvalidConnectState extends Schema.TaggedError<InvalidConnectState>()(
  "InvalidConnectState",
  {}
) {}
