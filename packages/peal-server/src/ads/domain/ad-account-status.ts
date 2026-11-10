import { Schema } from "effect";

/**
 * Where an ad account stands at its network, in Peal's words:
 *
 * - `active`: it can run ads.
 * - `inGracePeriod`: it still runs, with a payment to settle.
 * - `unsettled`: a payment failed; nothing new runs until it is paid.
 * - `pendingReview`: the network is checking it.
 * - `disabled`: the network turned it off.
 * - `closed`: closed, or being closed.
 * - `unknown`: a status Peal does not know yet.
 *
 * Only `active` takes a new boost.
 */
export const AdAccountStatusSchema = Schema.Literals([
  "active",
  "inGracePeriod",
  "unsettled",
  "pendingReview",
  "disabled",
  "closed",
  "unknown",
]);

export type AdAccountStatus = typeof AdAccountStatusSchema.Type;
