import { DateTime, Option, Result } from "effect";

import { NothingToCancel } from "./nothing-to-cancel.ts";
import { entitles } from "./subscription.ts";
import type { Subscription } from "./subscription.ts";

/**
 * What cancelling a subscription does:
 *
 * - `atPeriodEnd`: a paid plan ends with the period paid for, at `endsAt`,
 *   and nothing more is charged;
 * - `onDate`: it ends on the day the customer asked for, after the period
 *   paid for: it renews until then, the last period charged only up to
 *   that day;
 * - `now`: it ends at once. A trial, which charged nothing; or a plan that
 *   renewed after the cancellation was received and before it could be
 *   applied: the period it was received in is over, and what was charged
 *   for the periods that started after `refundSince` goes back.
 */
export type CancellationEffect =
  | { readonly _tag: "atPeriodEnd"; readonly endsAt: DateTime.Utc }
  | { readonly _tag: "onDate"; readonly endsAt: DateTime.Utc }
  | {
      readonly _tag: "now";
      readonly endsAt: DateTime.Utc;
      readonly refundSince: Option.Option<DateTime.Utc>;
    };

/** A cancellation, as its sender notified it. */
export interface NotifiedCancellation {
  /**
   * When they want the contract to end, if they said (Code de la
   * consommation D215-2, 4°): none is as soon as the contract allows.
   */
  readonly desiredAt: Option.Option<DateTime.Utc>;
  /** When it was received. */
  readonly receivedAt: DateTime.Utc;
}

/**
 * What a cancellation received at `receivedAt` does to the subscription
 * when it is applied at `now`. The day it was received is the day that
 * counts (Code de la consommation L215-1-1): a cancellation that waited,
 * for its sender to be told from a stranger, never costs them a renewal
 * charged meanwhile. The contract ends with the period paid for, which is
 * not refunded, or on the day asked for when that is later; a trial ends at
 * once. A subscription that gives no plan, is already set to end, or
 * started after the request came, has nothing to cancel.
 */
export const cancellationEffect = (
  subscription: Subscription,
  { desiredAt, receivedAt }: NotifiedCancellation,
  now: DateTime.Utc
): Result.Result<CancellationEffect, NothingToCancel> => {
  if (!entitles(subscription) || subscription.cancelAtPeriodEnd) {
    return Result.fail(new NothingToCancel());
  }

  // A contract that started after the request came is another one, ordered
  // since: the request never spoke of it, and applied to it would end it
  // and refund every period it charged.
  if (
    Option.exists(subscription.startedAt, (startedAt) =>
      DateTime.isGreaterThan(startedAt, receivedAt)
    )
  ) {
    return Result.fail(new NothingToCancel());
  }

  if (subscription.status === "trialing") {
    return Result.succeed({
      _tag: "now",
      endsAt: now,
      refundSince: Option.none(),
    });
  }

  const periodEnd = Option.getOrElse(subscription.currentPeriodEnd, () => now);

  const later = desiredAt.pipe(
    Option.filter((desired) => DateTime.isGreaterThan(desired, periodEnd))
  );

  if (Option.isSome(later)) {
    return Result.succeed({ _tag: "onDate", endsAt: later.value });
  }

  // The plan renewed after the request came, and its sender did not ask to
  // stay into the new period.
  const renewedSince = Option.exists(
    subscription.currentPeriodStart,
    (start) =>
      DateTime.isGreaterThan(start, receivedAt) &&
      !Option.exists(desiredAt, (desired) =>
        DateTime.isGreaterThan(desired, start)
      )
  );

  if (renewedSince) {
    return Result.succeed({
      _tag: "now",
      endsAt: now,
      refundSince: Option.some(receivedAt),
    });
  }

  return Result.succeed({ _tag: "atPeriodEnd", endsAt: periodEnd });
};
