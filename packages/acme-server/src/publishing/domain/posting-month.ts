import { DateTime } from "effect";

/** A calendar month in UTC: from its first instant, up to the next month's. */
export interface PostingMonth {
  readonly from: DateTime.Utc;
  readonly to: DateTime.Utc;
}

/**
 * The calendar month (UTC) an instant falls in: the period a plan counts
 * the posts going out in, wherever its members are.
 */
export const postingMonthOf = (instant: DateTime.Utc): PostingMonth => {
  const from = DateTime.startOf(instant, "month");

  return { from, to: DateTime.add(from, { months: 1 }) };
};

/** Whether two instants go out in the same calendar month (UTC). */
export const sameMonth = (left: DateTime.Utc, right: DateTime.Utc): boolean =>
  DateTime.Equivalence(postingMonthOf(left).from, postingMonthOf(right).from);
