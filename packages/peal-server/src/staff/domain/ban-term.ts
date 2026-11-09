import { DateTime, Option } from "effect";

/** Whether a ban that ends at `expiresAt`, if it ends, still holds at `now`. */
export const banHolds = (
  expiresAt: Option.Option<DateTime.Utc>,
  now: DateTime.Utc
): boolean =>
  Option.match(expiresAt, {
    onNone: () => true,
    onSome: (end) => DateTime.isGreaterThan(end, now),
  });
