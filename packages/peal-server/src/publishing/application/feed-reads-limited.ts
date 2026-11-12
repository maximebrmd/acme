import { Schema } from "effect";

/**
 * The workspace had Peal read as many addresses its members gave as it
 * may this hour: the next read is free in `retryAfterSeconds`.
 */
export class FeedReadsLimited extends Schema.TaggedError<FeedReadsLimited>()(
  "FeedReadsLimited",
  { retryAfterSeconds: Schema.Int }
) {
  override get message(): string {
    return `Too many feeds read this hour: try again in ${String(this.retryAfterSeconds)} seconds`;
  }
}
