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

// Whether the contract started after `at`.
const startedAfter = (subscription: Subscription, at: DateTime.Utc) =>
  Option.exists(subscription.startedAt, (startedAt) =>
    DateTime.isGreaterThan(startedAt, at)
  );

/**
 * What a cancellation received at `receivedAt` does to the subscription
 * when it is applied at `now`. The day it was received is the day that
 * counts (Code de la consommation L215-1-1): a cancellation that waited,
 * for its sender to be told from a stranger, never costs them a renewal
 * charged meanwhile. The contract ends with the period paid for, which is
 * not refunded, or on the day asked for when that is later; a trial ends at
 * once. A subscription that gives no plan, or started after the request
 * came, has nothing to cancel; nor one already set to end, unless on a
 * later day than this request asks, which brings its end forward.
 */
export const cancellationEffect = (
  subscription: Subscription,
  { desiredAt, receivedAt }: NotifiedCancellation,
  now: DateTime.Utc
): Result.Result<CancellationEffect, NothingToCancel> => {
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

  // Ended since the request came, as when it waited for its link: the
  // renewal it should have stopped still goes back.
  if (
    subscription.status === "canceled" &&
    renewedSince &&
    !startedAfter(subscription, receivedAt)
  ) {
    return Result.succeed({
      _tag: "now",
      endsAt: now,
      refundSince: Option.some(receivedAt),
    });
  }

  if (!entitles(subscription)) {
    return Result.fail(new NothingToCancel());
  }

  // A contract that started after the request came is another one, ordered
  // since: the request never spoke of it, and applied to it would end it
  // and refund every period it charged.
  if (startedAfter(subscription, receivedAt)) {
    return Result.fail(new NothingToCancel());
  }

  const periodEnd = Option.getOrElse(subscription.currentPeriodEnd, () => now);

  const later = desiredAt.pipe(
    Option.filter((desired) => DateTime.isGreaterThan(desired, periodEnd))
  );

  // Already set to end: nothing to cancel, unless it is set to end on a
  // later day than this request asks, as after a date mistyped: the end
  // is then brought forward.
  if (
    subscription.cancelAtPeriodEnd &&
    !Option.exists(subscription.cancelAt, (set) =>
      DateTime.isGreaterThan(
        set,
        Option.getOrElse(later, () => periodEnd)
      )
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

  if (Option.isSome(later)) {
    return Result.succeed({ _tag: "onDate", endsAt: later.value });
  }

  if (renewedSince) {
    return Result.succeed({
      _tag: "now",
      endsAt: now,
      refundSince: Option.some(receivedAt),
    });
  }

  return Result.succeed({ _tag: "atPeriodEnd", endsAt: periodEnd });
};

/** A line of a paid invoice: what it charged, before tax, and from when. */
export interface InvoiceLine {
  /** In cents; negative for a credit, as for the unused part of a plan. */
  readonly amount: number;
  readonly start: DateTime.Utc;
}

/**
 * What goes back of a paid invoice when a cancellation received at `since`
 * is applied after the plan renewed: the lines for periods that began
 * after it, which the cancellation should have stopped, with their share
 * of the tax; never what the invoice also settled of earlier periods, as a
 * change of plan prorated onto it, and never more than was paid. In cents,
 * rounded down. An invoice whose lines say nothing gives nothing back:
 * staff look at it.
 */
export const renewalRefund = (
  invoice: { readonly lines: readonly InvoiceLine[]; readonly paid: number },
  since: DateTime.Utc
): number => {
  const total = invoice.lines.reduce((sum, { amount }) => sum + amount, 0);

  const renewed = invoice.lines
    .filter(({ start }) => DateTime.isGreaterThan(start, since))
    .reduce((sum, { amount }) => sum + amount, 0);

  if (invoice.paid <= 0 || total <= 0 || renewed <= 0) {
    return 0;
  }

  return Math.floor(invoice.paid * Math.min(renewed / total, 1));
};
