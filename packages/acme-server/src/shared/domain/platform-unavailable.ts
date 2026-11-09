import { Schema } from "effect";

/**
 * The platform could not be reached, or answered that it is down, and the
 * request was not accepted: nothing was published, so trying again later is
 * safe.
 */
export class PlatformUnavailable extends Schema.TaggedError<PlatformUnavailable>()(
  "PlatformUnavailable",
  {}
) {}
