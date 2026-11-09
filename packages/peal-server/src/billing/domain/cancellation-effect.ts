import { DateTime, Option, Result } from "effect";

import { NothingToCancel } from "./nothing-to-cancel.ts";
import { entitles } from "./subscription.ts";
import type { Subscription } from "./subscription.ts";

/**
 * What cancelling a subscription does:
 *
 * - `atPeriodEnd`: a paid plan ends with the period paid for, at `endsAt`,
 *   and nothing more is charged;
 * - `now`: it ends at once. A trial, which charged nothing; or a plan that
 *   renewed after the cancellation was received and before it could be
 *   applied: the period it was received in is over, and what was charged
 *   for the periods that started after `refundSince` goes back.
 */
export type CancellationEffect =
  | { readonly _tag: "atPeriodEnd"; readonly endsAt: DateTime.Utc }
  | {
      readonly _tag: "now";
      readonly endsAt: DateTime.Utc;
      readonly refundSince: Option.Option<DateTime.Utc>;
    };

/**
 * What a cancellation received at `receivedAt` does to the subscription
 * when it is applied at `now`. The day it was received is the day that
 * counts (Code de la consommation L215-1-1): a cancellation that waited,
 * for its sender to be told from a stranger, never costs them a renewal
 * charged meanwhile. A subscription that gives no plan, or is already set
 * to end, has nothing to cancel.
 */
export const cancellationEffect = (
  subscription: Subscription,
  receivedAt: DateTime.Utc,
  now: DateTime.Utc
): Result.Result<CancellationEffect, NothingToCancel> => {
  if (!entitles(subscription) || subscription.cancelAtPeriodEnd) {
    return Result.fail(new NothingToCancel());
  }

  if (subscription.status === "trialing") {
    return Result.succeed({
      _tag: "now",
      endsAt: now,
      refundSince: Option.none(),
    });
  }

  const renewedSince = Option.exists(subscription.currentPeriodStart, (start) =>
    DateTime.isGreaterThan(start, receivedAt)
  );

  if (renewedSince) {
    return Result.succeed({
      _tag: "now",
      endsAt: now,
      refundSince: Option.some(receivedAt),
    });
  }

  return Result.succeed({
    _tag: "atPeriodEnd",
    endsAt: Option.getOrElse(subscription.currentPeriodEnd, () => now),
  });
};
