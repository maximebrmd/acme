import { DateTime, Option, Schema } from "effect";

// IANA ids are ASCII names whose every segment starts with a capital letter,
// such as "America/Port-au-Prince" or "Etc/GMT+1". Intl also accepts offsets,
// "+01:00" and, on Node, "−01:00" with a Unicode minus, which are not zones.
const ianaName = /^[A-Z][\w+-]*(?:\/[A-Z][\w+-]*)*$/u;

// Intl matches names whatever their case, and "EUROPE/PARIS" resolves to
// "Europe/Paris". An id that resolves to a name differing only in case is a
// misspelling, refused so one zone has one spelling. An alias the engine
// resolves to another name, such as "Asia/Kolkata", keeps its own.
const isWrittenAsResolved = (id: string, zone: DateTime.TimeZone.Named) =>
  zone.id === id || zone.id.toLowerCase() !== id.toLowerCase();

const isIanaTimeZone = (id: string): boolean =>
  ianaName.test(id) &&
  Option.exists(DateTime.zoneMakeNamed(id), (zone) =>
    isWrittenAsResolved(id, zone)
  );

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
