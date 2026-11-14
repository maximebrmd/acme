import { Metric } from "effect";

/**
 * Reads of a channel's conversations that reached the last page they
 * take, with conversations left unlisted: those are read by no run until
 * they move up the list. Counted so that an account with that many is
 * seen.
 */
export const messagesListingTruncated = Metric.counter(
  "peal.engagement.messages.listing_truncated",
  {
    description:
      "Reads of a channel's direct messages that stopped at the last page they take",
    incremental: true,
  }
);
