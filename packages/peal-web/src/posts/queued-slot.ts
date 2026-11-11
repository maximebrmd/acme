import type { DateTime } from "effect";
import { Option } from "effect";

import { wallClockOf } from "#posts/zoned-time.ts";
import type { CalendarDate } from "#posts/zoned-time.ts";

/**
 * How a slot a queue gave a post is written: its date and time on the
 * queue's clock, with the zone's name, as the queue's zone may not be the
 * reader's.
 */
export const queuedSlotFormat = (
  timeZone: string
): Intl.DateTimeFormatOptions => ({
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone,
  timeZoneName: "short",
  year: "numeric",
});

/**
 * The date the calendar opens on to show a post a queue placed: the slot's
 * date in the zone the calendar is shown in, or none for a zone that does
 * not exist.
 */
export const queuedSlotWeek = (
  schedule: { readonly at: DateTime.Utc },
  shownIn: string
): CalendarDate | undefined =>
  wallClockOf(schedule.at, shownIn).pipe(
    Option.map(({ date }) => date),
    Option.getOrUndefined
  );
