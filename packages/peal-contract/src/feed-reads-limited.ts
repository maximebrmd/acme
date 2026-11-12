import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The workspace's members had Peal read as many addresses as it may in an
 * hour.
 */
export class FeedReadsLimited extends Schema.TaggedError<FeedReadsLimited>()(
  "FeedReadsLimited",
  {
    ...errorEnvelope,
    // Seconds until the hour ends, as the `Retry-After` header says.
    retryAfterSeconds: Schema.Int,
  },
  {
    description:
      "The workspace's members had Peal read 30 addresses within the hour, the most it may (adding a feed, changing its address, resuming one and previewing one each read it): nothing was read. Try again in `retryAfterSeconds` seconds.",
    httpApiStatus: 429,
  }
) {}
