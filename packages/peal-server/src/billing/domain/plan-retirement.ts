import { DateTime, Duration } from "effect";

import type { BillingInterval } from "./billing-interval.ts";

/**
 * The notice a legacy plan is given before it ends for good: the terms
 * promise 30 days before a change of price, and a new contract cannot be
 * imposed, so the subscriber orders per-account pricing or is on the free
 * tier from that day.
 */
export const retirementNotice = Duration.days(30);

/**
 * How long after a retirement is applied its notice may go out: the
 * hourly reminders tell it, and an email that fails is retried for some
 * hours. The day is counted from then, so 30 days are never fewer.
 */
export const retirementTelling = Duration.days(1);

/**
 * The day a legacy plan retired with a notice at `noticeAt` ends: its
 * period's end when that is 30 days or more after the notice; else, for a
 * monthly plan, the first period's end that is (it renews once or twice,
 * whole months, as paid for); for a yearly plan, the 30th day itself, as
 * renewing a year to retire it would charge a year: Stripe then charges
 * the period it renews into only up to that day. Months are counted from
 * the period's end as Effect counts them (the 31st of January and a month
 * is the 28th of February), never later than Stripe's own period end.
 */
export const retirementDay = (
  noticeAt: DateTime.Utc,
  periodEnd: DateTime.Utc,
  interval: BillingInterval
): DateTime.Utc => {
  const earliest = DateTime.addDuration(noticeAt, retirementNotice);

  if (DateTime.isGreaterThanOrEqualTo(periodEnd, earliest)) {
    return periodEnd;
  }

  if (interval === "year") {
    return earliest;
  }

  let months = 1;
  let end = DateTime.add(periodEnd, { months });

  while (DateTime.isLessThan(end, earliest)) {
    months += 1;
    end = DateTime.add(periodEnd, { months });
  }

  return end;
};
