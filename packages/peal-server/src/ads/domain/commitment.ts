import { DateTime } from "effect";

import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import { timeZoneOf } from "#shared/domain/time-zone.ts";

/** A boost's budget: an amount for its whole run, or one for each day. */
export type Budget =
  | { readonly _tag: "daily"; readonly amount: number }
  | { readonly _tag: "total"; readonly amount: number };

/** A calendar month of a time zone, written `2026-11`. */
export type SpendMonth = string;

const monthOf = (instant: DateTime.Utc, timeZone: TimeZoneId): SpendMonth => {
  const { month, year } = DateTime.toParts(
    DateTime.setZone(instant, timeZoneOf(timeZone))
  );

  return `${year}-${String(month).padStart(2, "0")}`;
};

// The day an instant falls on in the zone, as days since the epoch.
const dayNumberOf = (instant: DateTime.Utc, timeZone: TimeZoneId): number => {
  const { day, month, year } = DateTime.toParts(
    DateTime.setZone(instant, timeZoneOf(timeZone))
  );

  return Math.round(
    DateTime.toEpochMillis(DateTime.makeUnsafe({ day, month, year })) /
      86_400_000
  );
};

/**
 * The calendar days of the zone a run touches, both ends included: a run
 * from 23:00 to 01:00 touches two.
 */
export const calendarDays = (
  from: DateTime.Utc,
  to: DateTime.Utc,
  timeZone: TimeZoneId
): number =>
  Math.max(1, dayNumberOf(to, timeZone) - dayNumberOf(from, timeZone) + 1);

/**
 * The calendar months of the zone a run touches, in order. A run counts
 * whole in each of them: Peal cannot know in advance which month the
 * network spends a budget in.
 */
export const monthsTouched = (
  from: DateTime.Utc,
  to: DateTime.Utc,
  timeZone: TimeZoneId
): readonly SpendMonth[] => {
  const last = monthOf(to, timeZone);
  const months: SpendMonth[] = [];
  let [year = 0, month = 1] = monthOf(from, timeZone).split("-").map(Number);

  // A run is 90 days at most, so four months; the bound stops a bad range.
  for (let count = 0; count < 120; count += 1) {
    const current = `${year}-${String(month).padStart(2, "0")}`;

    months.push(current);

    if (current >= last) {
      break;
    }

    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
};

/**
 * The share over a daily budget the network may spend on one day. Meta's
 * "About daily budgets" page (Business Help Center, 190490051321426):
 * "Meta may spend up to 75% over your daily budget", and "for every day
 * ending at midnight, spending won't be more than 175% of your daily
 * budget". Peal turns ad set budget sharing off, which would allow more.
 */
export const dailyOverspendPercent = 75;

/**
 * The most a daily budget costs in one calendar week, Sunday to Saturday,
 * in days of it. The same page: "for every week ending Saturday at
 * midnight, spending won't be more than 7 times your daily budget".
 */
export const weeklySpendLimitDays = 7;

// The calendar days of the zone a run touches, by the week, Sunday to
// Saturday, each falls in: how many in each week.
const daysByWeek = (
  from: DateTime.Utc,
  to: DateTime.Utc,
  timeZone: TimeZoneId
): readonly number[] => {
  const first = dayNumberOf(from, timeZone);
  const last = Math.max(first, dayNumberOf(to, timeZone));
  const weeks = new Map<number, number>();

  // Day 0, 1 January 1970, was a Thursday: day 3 the first Sunday.
  for (let day = first; day <= last; day += 1) {
    const week = Math.floor((day + 4) / 7);

    weeks.set(week, (weeks.get(week) ?? 0) + 1);
  }

  return [...weeks.values()];
};

/**
 * The most a budget can cost over a run, in minor units: what Peal counts
 * against the ceiling before the first request leaves. A total budget is
 * its amount. A daily budget is, for each calendar week of the account's
 * zone the run touches, the most the network may spend in it: 175% of the
 * budget for each day the run touches there, and never more than 7 days'
 * worth, rounded up.
 */
export const commitmentOf = (
  budget: Budget,
  from: DateTime.Utc,
  to: DateTime.Utc,
  timeZone: TimeZoneId
): number => {
  if (budget._tag === "total") {
    return budget.amount;
  }

  const percent = daysByWeek(from, to, timeZone).reduce(
    (sum, days) =>
      sum +
      Math.min(
        days * (100 + dailyOverspendPercent),
        weeklySpendLimitDays * 100
      ),
    0
  );

  return Math.ceil((budget.amount * percent) / 100);
};

/** A run that counts against a ceiling: what it commits, and when. */
export interface Committed {
  readonly committed: number;
  readonly from: DateTime.Utc;
  readonly to: DateTime.Utc;
}

/**
 * What the runs commit in the calendar month where they commit the most,
 * among the months `months` names.
 */
export const committedIn = (
  months: readonly SpendMonth[],
  runs: readonly Committed[],
  timeZone: TimeZoneId
): number =>
  Math.max(
    0,
    ...months.map((month) =>
      runs
        .filter((run) =>
          monthsTouched(run.from, run.to, timeZone).includes(month)
        )
        .reduce((sum, run) => sum + run.committed, 0)
    )
  );
