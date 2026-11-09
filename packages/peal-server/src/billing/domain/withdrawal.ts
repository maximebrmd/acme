import { DateTime, Duration, Option, Result } from "effect";

import { entitles } from "./subscription.ts";
import type { Subscription } from "./subscription.ts";
import { WithdrawalUnavailable } from "./withdrawal-unavailable.ts";

/**
 * How long a consumer may withdraw from a subscription, from the day the
 * contract started (EU Consumer Rights Directive art. 9; Code de la
 * consommation L221-18).
 */
export const withdrawalPeriod = Duration.days(14);

/** When the consumer's right to withdraw ends, if the start is known. */
export const withdrawalEndsAt = (
  subscription: Subscription
): Option.Option<DateTime.Utc> =>
  subscription.startedAt.pipe(
    Option.map((start) => DateTime.addDuration(start, withdrawalPeriod))
  );

/**
 * Whether the subscription can still be withdrawn from at `now`: one that
 * gives its plan, started less than 14 days ago, whether or not it is set to
 * end with its period, as cancelling waives no right to withdraw. Whether
 * the customer is a consumer is Stripe's to say, and checked apart.
 */
export const mayWithdraw = (
  subscription: Subscription,
  now: DateTime.Utc
): Result.Result<DateTime.Utc, WithdrawalUnavailable> => {
  if (!entitles(subscription)) {
    return Result.fail(new WithdrawalUnavailable({ reason: "notSubscribed" }));
  }

  return Option.match(withdrawalEndsAt(subscription), {
    onNone: () =>
      Result.fail(new WithdrawalUnavailable({ reason: "notSubscribed" })),
    onSome: (endsAt) =>
      DateTime.isLessThan(now, endsAt)
        ? Result.succeed(endsAt)
        : Result.fail(new WithdrawalUnavailable({ reason: "expired" })),
  });
};

/** The period a payment bought, and what was paid for it, in cents. */
export interface PaidPeriod {
  readonly end: DateTime.Utc;
  readonly paid: number;
  readonly start: DateTime.Utc;
}

/**
 * What a consumer who withdraws gets back, in cents: what they paid for the
 * period less the part of it already supplied, to the second (CRD art.
 * 14(3), C. conso L221-25), rounded down to the cent. Nothing paid, or a
 * period over, gives nothing back; a period not started yet gives it all.
 */
export const refundOf = (
  { end, paid, start }: PaidPeriod,
  now: DateTime.Utc
): number => {
  const length = DateTime.toEpochMillis(end) - DateTime.toEpochMillis(start);

  if (paid <= 0 || length <= 0) {
    return 0;
  }

  const left = DateTime.toEpochMillis(end) - DateTime.toEpochMillis(now);
  const share = Math.min(Math.max(left / length, 0), 1);

  return Math.floor(paid * share);
};
