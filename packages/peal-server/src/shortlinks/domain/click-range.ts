import { DateTime, Option, Result } from "effect";

import { InvalidClickRange } from "./invalid-click-range.ts";

/** How many days one read of clicks covers at most, both ends included. */
export const maxClickRangeDays = 92;

/** How many days a read covers when it is not told, ending today (UTC). */
export const defaultClickRangeDays = 30;

/** The days a read covers, as their first instants (UTC), both included. */
export interface ClickRange {
  readonly from: DateTime.Utc;
  readonly to: DateTime.Utc;
}

/** The day (UTC) an instant counts in, as its first instant. */
export const clickDayOf = (instant: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf(instant, "day");

const dayMillis = 86_400_000;

/** How many days the range covers, both ends included. */
export const daysIn = ({ from, to }: ClickRange): number =>
  Math.round(
    (DateTime.toEpochMillis(to) - DateTime.toEpochMillis(from)) / dayMillis
  ) + 1;

/**
 * The days a read covers: `to` or today, and `from` or the 30 days that
 * end on `to`. Refused when it ends before it starts or spans more than
 * 92 days.
 */
export const clickRangeOf = (
  asked: {
    readonly from: Option.Option<DateTime.Utc>;
    readonly to: Option.Option<DateTime.Utc>;
  },
  now: DateTime.Utc
): Result.Result<ClickRange, InvalidClickRange> => {
  const to = clickDayOf(Option.getOrElse(asked.to, () => now));

  const from = clickDayOf(
    Option.getOrElse(asked.from, () =>
      DateTime.subtract(to, { days: defaultClickRangeDays - 1 })
    )
  );

  const range: ClickRange = { from, to };
  const days = daysIn(range);

  return days >= 1 && days <= maxClickRangeDays
    ? Result.succeed(range)
    : Result.fail(new InvalidClickRange({ maxDays: maxClickRangeDays }));
};

/** Every day of the range, oldest first, as its first instant. */
export const daysOf = (range: ClickRange): readonly DateTime.Utc[] =>
  Array.from({ length: daysIn(range) }, (_, index) =>
    DateTime.add(range.from, { days: index })
  );
