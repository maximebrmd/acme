import { Schema } from "effect";

/**
 * This server does not bill: every key sends under the one setting, and a
 * workspace's own limit would never be read.
 */
export class RequestLimitsNotBilled extends Schema.TaggedError<RequestLimitsNotBilled>()(
  "RequestLimitsNotBilled",
  {}
) {}
