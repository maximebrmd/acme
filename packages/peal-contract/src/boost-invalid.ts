import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Why a boost as asked cannot be made, each naming what is at fault:
 *
 * - `currencyMismatch`: the budget's currency is not the ad account's.
 * - `budgetEmpty`: the budget is zero.
 * - `endsBeforeStart`: the run ends before it starts, or has ended.
 * - `runTooShort`: the run is shorter than a day, or, with a daily budget,
 *   not longer than one.
 * - `runTooLong`: the run is longer than 90 days.
 * - `startsTooFarAhead`: the run starts more than 30 days ahead.
 * - `ageRange`: the youngest age is above the oldest.
 * - `specialCategory`: the ad is of a special category (housing,
 *   employment, financial products and services, social issues, elections
 *   or politics), which Peal does not boost.
 * - `beneficiaryRequired`: the audience is in the European Union, and the
 *   boost does not say who benefits from the ad and who pays for it.
 */
export const BoostViolationSchema = Schema.Literals([
  "currencyMismatch",
  "budgetEmpty",
  "endsBeforeStart",
  "runTooShort",
  "runTooLong",
  "startsTooFarAhead",
  "ageRange",
  "specialCategory",
  "beneficiaryRequired",
]).annotate({ identifier: "BoostViolation" });

export type BoostViolation = typeof BoostViolationSchema.Type;

/** The boost breaks Peal's own rules. */
export class BoostInvalid extends Schema.TaggedError<BoostInvalid>()(
  "BoostInvalid",
  {
    ...errorEnvelope,
    violations: Schema.Array(BoostViolationSchema),
  },
  {
    description:
      "The boost breaks Peal's own rules, which are checked before anything is reserved or sent: `violations` lists every one at once.",
    httpApiStatus: 422,
  }
) {}
