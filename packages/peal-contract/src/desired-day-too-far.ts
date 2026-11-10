import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * How far ahead a cancellation may ask its contract to end, in days: a
 * little over a year, so a yearly plan can be let run to its end and no
 * further. A later day is a mistake, which would keep the plan renewing.
 */
export const desiredDayHorizonDays = 400;

/**
 * The day asked for the contract to end is further ahead than a
 * cancellation may ask (`desiredDayHorizonDays`).
 */
export class DesiredDayTooFar extends Schema.TaggedError<DesiredDayTooFar>()(
  "DesiredDayTooFar",
  { ...errorEnvelope, horizonDays: Schema.Int },
  {
    description:
      "The day asked for the contract to end is more than 400 days ahead: give a nearer one, or none to end it as soon as the contract allows.",
    httpApiStatus: 400,
  }
) {}
