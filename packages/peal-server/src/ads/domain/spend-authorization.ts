import { Schema } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";

import { AmountSchema } from "./money.ts";

/**
 * Whether an ad account may spend through Peal, and how much a month:
 *
 * - `off`: nothing spends. Every account starts so.
 * - `on`: an owner allowed it, with the most the boosts made through Peal
 *   may commit in one calendar month of the account's time zone, in the
 *   account's currency. `by` is that owner, none once their account is
 *   closed.
 *
 * Peal never turns it on, and never raises a ceiling, on its own.
 */
export const SpendAuthorizationSchema = Schema.Union([
  Schema.TaggedStruct("off", {}),
  Schema.TaggedStruct("on", {
    at: Schema.DateTimeUtc,
    by: Schema.Option(UserIdSchema),
    monthlyCeiling: AmountSchema.check(Schema.isGreaterThan(0)),
  }),
]);

export type SpendAuthorization = typeof SpendAuthorizationSchema.Type;

export const spendingOff: SpendAuthorization = { _tag: "off" };
