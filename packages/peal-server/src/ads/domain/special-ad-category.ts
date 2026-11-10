import { Schema } from "effect";

/**
 * What the advertiser declares the ad is about, as ad networks ask: `none`,
 * or one of the categories the law treats apart (housing, employment,
 * financial products and services, social issues, elections or politics).
 * Each of those restricts targeting, needs a country and, for politics, an
 * authorisation of the advertiser; Peal boosts `none` only and refuses the
 * others rather than run them wrong.
 */
export const SpecialAdCategorySchema = Schema.Literals([
  "none",
  "housing",
  "employment",
  "financialProductsServices",
  "issuesElectionsPolitics",
]);

export type SpecialAdCategory = typeof SpecialAdCategorySchema.Type;
