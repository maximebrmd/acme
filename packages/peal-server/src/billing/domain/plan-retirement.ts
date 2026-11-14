import { DateTime, Duration } from "effect";

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
 * hours. The day is counted from then; when the notice goes out later, the
 * day moves later before it does (`noticeIsShort`).
 */
export const retirementTelling = Duration.days(1);

/**
 * How long after its day a retired plan's end may come and still be the
 * retirement's: Stripe ends it at the instant, and its event follows.
 */
export const retirementEndTolerance = Duration.hours(1);

/**
 * The day a legacy plan retired with a notice at `noticeAt` ends: the
 * first midnight UTC 30 days or more after it, whatever the plan's
 * period. Stripe ends it then; what it was paid for beyond that day is
 * credited back, and a period it renews into before it is charged only up
 * to it, so nothing after the day is charged.
 */
export const retirementDay = (noticeAt: DateTime.Utc): DateTime.Utc => {
  const earliest = DateTime.addDuration(noticeAt, retirementNotice);
  const midnight = DateTime.startOf(earliest, "day");

  return DateTime.Equivalence(midnight, earliest)
    ? earliest
    : DateTime.add(midnight, { days: 1 });
};

/** Whether a notice sent at `now` would give fewer than 30 days before `day`. */
export const noticeIsShort = (day: DateTime.Utc, now: DateTime.Utc): boolean =>
  DateTime.isLessThan(day, DateTime.addDuration(now, retirementNotice));
