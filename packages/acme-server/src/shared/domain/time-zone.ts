import { DateTime, Option, Schema } from "effect";

// Offsets such as "+01:00" are valid Intl time zones but not IANA ones, and
// IANA ids never start with a sign.
const offsetPattern = /^[+-]/u;

const isIanaTimeZone = (id: string): boolean =>
  !offsetPattern.test(id) && Option.isSome(DateTime.zoneMakeNamed(id));

/**
 * An IANA time zone id, such as "Europe/Paris", as the user picked it.
 *
 * The id is kept as written: engines canonicalise aliases differently (Node
 * turns "Asia/Kolkata" into "Asia/Calcutta", Bun keeps it), so storing the
 * engine's spelling would change the value between runtimes.
 */
export const TimeZoneIdSchema = Schema.String.check(
  Schema.makeFilter(isIanaTimeZone, {
    expected: "an IANA time zone, such as Europe/Paris",
  })
).pipe(Schema.brand("TimeZoneId"));

export type TimeZoneId = typeof TimeZoneIdSchema.Type;

/** The zone a `TimeZoneId` names, which its schema has already validated. */
export const timeZoneOf = (id: TimeZoneId): DateTime.TimeZone.Named =>
  DateTime.zoneMakeNamedUnsafe(id);
