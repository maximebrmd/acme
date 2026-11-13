import { Schema } from "effect";

/**
 * What a billing account pays for by use, each with a monthly allowance
 * across every workspace it pays for: writing assistant requests and images
 * on the server's provider (never with a workspace's own), inbox messages
 * sent (comment replies included), managed ads active in the month, and
 * calls to X's API at X's rates. In the kernel, as every context that
 * spends one claims it (`MeteredUsage`).
 */
export const MeterSchema = Schema.Literals([
  "assistantRequests",
  "assistantImages",
  "outboundMessages",
  "managedAds",
  "xApi",
]);

export type Meter = typeof MeterSchema.Type;
