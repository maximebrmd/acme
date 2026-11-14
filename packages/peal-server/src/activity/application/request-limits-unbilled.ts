import { Schema } from "effect";

/**
 * This server does not bill: everyone has the one setting, and a
 * workspace's own limit would never be read.
 */
export class RequestLimitsUnbilled extends Schema.TaggedError<RequestLimitsUnbilled>()(
  "RequestLimitsUnbilled",
  {}
) {}
