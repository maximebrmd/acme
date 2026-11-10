import { Schema } from "effect";

import { LocalDateSchema } from "#shared/domain/wall-clock.ts";

import { NetworkObjectIdSchema } from "./ids.ts";
import { AmountSchema } from "./money.ts";

/** The largest count Peal keeps, what its columns hold. */
export const maxCount = 2_147_483_647;

const CountSchema = Schema.Int.check(
  Schema.isBetween({ maximum: maxCount, minimum: 0 })
);

/**
 * What one ad did on one day of its account's calendar: counts and money,
 * never who saw it. `results` are the reactions, comments and shares the
 * network counts on the post (none when it reports none: not zero).
 */
export class InsightDay extends Schema.Class<InsightDay>(
  "peal-server/ads/domain/InsightDay"
)({
  adExternalId: NetworkObjectIdSchema,
  clicks: CountSchema,
  day: LocalDateSchema,
  impressions: CountSchema,
  reach: CountSchema,
  results: Schema.Option(CountSchema),
  /** What the day cost, in the account's minor units. */
  spend: AmountSchema,
}) {}
