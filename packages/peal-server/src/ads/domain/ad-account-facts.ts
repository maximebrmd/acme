import { Option, Schema } from "effect";

import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

import { AdAccountStatusSchema } from "./ad-account-status.ts";
import { NetworkObjectIdSchema } from "./ids.ts";
import { AmountSchema, CurrencySchema } from "./money.ts";

/**
 * An ad account as its network describes it now: what a sync, or the check
 * before a boost, reads.
 */
export class AdAccountFacts extends Schema.Class<AdAccountFacts>(
  "peal-server/ads/domain/AdAccountFacts"
)({
  /** What the account spent against its cap, in minor units. */
  amountSpent: Schema.Option(AmountSchema),
  currency: CurrencySchema,
  externalId: NetworkObjectIdSchema,
  name: Schema.String.check(Schema.isMaxLength(512)),
  /**
   * The most the account may spend in all, set at the network, in minor
   * units: none when it has no cap.
   */
  spendCap: Schema.Option(AmountSchema),
  status: AdAccountStatusSchema,
  /** The zone its days and its bills are counted in; none if unknown. */
  timeZone: Schema.Option(TimeZoneIdSchema),
}) {}

/**
 * What the account's own cap leaves to spend, in minor units: none when it
 * has no cap, and nothing when the network did not say what was spent, as
 * room Peal cannot see is room it does not count on.
 */
export const capRoom = (
  account: Pick<AdAccountFacts, "amountSpent" | "spendCap">
): Option.Option<number> =>
  account.spendCap.pipe(
    Option.map((cap) =>
      Option.match(account.amountSpent, {
        onNone: () => 0,
        onSome: (spent) => Math.max(0, cap - spent),
      })
    )
  );
