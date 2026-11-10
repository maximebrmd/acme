import { Schema } from "effect";

/**
 * Why a boost as asked cannot be made, before anything is reserved or
 * sent: each names the field at fault, as data clients write in their own
 * words. Add one, never rename one.
 */
export const BoostViolationSchema = Schema.Literals([
  // The budget's currency is not the ad account's.
  "currencyMismatch",
  // The budget is zero.
  "budgetEmpty",
  // The run ends before it starts, or has already ended.
  "endsBeforeStart",
  // The run is shorter than a day (or, with a daily budget, not longer).
  "runTooShort",
  // The run is longer than `maxRunDays`.
  "runTooLong",
  // The run starts further ahead than `maxStartAheadDays`.
  "startsTooFarAhead",
  // The youngest age is above the oldest.
  "ageRange",
  // The ad is of a special category, which Peal does not boost.
  "specialCategory",
  // The audience is in the European Union and the boost does not say who
  // benefits from the ad and who pays for it.
  "beneficiaryRequired",
]);

export type BoostViolation = typeof BoostViolationSchema.Type;
