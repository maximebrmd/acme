import { Schema } from "effect";

/** Ads are off on this server, or the network asked for is not set up: its operator turns them on. */
export class AdsUnavailable extends Schema.TaggedError<AdsUnavailable>()(
  "AdsUnavailable",
  {}
) {}
