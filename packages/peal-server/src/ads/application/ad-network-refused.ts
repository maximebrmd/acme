import { Schema } from "effect";

/**
 * Why an ad network refused a request as sent, sorted for the code that
 * acts on it. The network answered: nothing was made or changed.
 */
export const NetworkRefusalKindSchema = Schema.Literals([
  // The sign-in lacks a permission, or its person lost access to the
  // account or the Page.
  "permission",
  // The account cannot run ads (disabled, unpaid, blocked).
  "accountUnusable",
  // The budget is under the network's minimum.
  "budgetTooLow",
  // The post cannot be shown as an ad.
  "postNotPromotable",
  // Anything else: `code` names it.
  "other",
]);

export type NetworkRefusalKind = typeof NetworkRefusalKindSchema.Type;

/**
 * The ad network refused the request, with its own code (`graph100.1885272`),
 * never its message, which may quote what was sent.
 */
export class AdNetworkRefused extends Schema.TaggedError<AdNetworkRefused>()(
  "AdNetworkRefused",
  { code: Schema.String, kind: NetworkRefusalKindSchema }
) {}
