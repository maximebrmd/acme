import { Schema } from "effect";

import { AmountSchema } from "./money.ts";

/**
 * Whether a campaign, an ad set or an ad runs, in Peal's words, whatever
 * its network calls it (`rawStatus` keeps the network's):
 *
 * - `active`: it runs, or will when its schedule starts.
 * - `paused`: turned off, itself or by what holds it.
 * - `inReview`: the network is reviewing it.
 * - `rejected`: the network refused it.
 * - `withIssues`: it cannot run until something is fixed (billing, an
 *   error the network reports).
 * - `archived`, `deleted`: kept for its numbers only.
 * - `unknown`: a status Peal does not know yet.
 */
export const AdObjectStatusSchema = Schema.Literals([
  "active",
  "paused",
  "inReview",
  "rejected",
  "withIssues",
  "archived",
  "deleted",
  "unknown",
]);

export type AdObjectStatus = typeof AdObjectStatusSchema.Type;

/** What a campaign is for, in Peal's words; `other` for the rest. */
export const CampaignObjectiveSchema = Schema.Literals([
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "appPromotion",
  "sales",
  "other",
]);

export type CampaignObjective = typeof CampaignObjectiveSchema.Type;

export const objectName = Schema.String.check(Schema.isMaxLength(1024));

export const objectStatus = {
  rawStatus: Schema.String.check(Schema.isMaxLength(64)),
  status: AdObjectStatusSchema,
};

export const objectBudget = {
  dailyBudget: Schema.Option(AmountSchema),
  totalBudget: Schema.Option(AmountSchema),
};

export const objectSchedule = {
  endsAt: Schema.Option(Schema.DateTimeUtc),
  startsAt: Schema.Option(Schema.DateTimeUtc),
};
