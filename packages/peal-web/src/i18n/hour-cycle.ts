import { Option, Schema } from "effect";
import type { Formats } from "next-intl";
import { useSyncExternalStore } from "react";

// How the viewer wants times of day written: as their language does, on a
// 12-hour clock or on a 24-hour one. A preference of the browser, kept in
// its localStorage: it is no setting of the account, and other devices
// keep their own.

export const HourFormatSchema = Schema.Literals(["auto", "h12", "h24"]);

export type HourFormat = typeof HourFormatSchema.Type;

const decodeHourFormat = Schema.decodeUnknownOption(HourFormatSchema);

/** The preference a stored value names; the language's own for any other. */
export const hourFormatOf = (stored: string | null): HourFormat =>
  Option.getOrElse(decodeHourFormat(stored), (): HourFormat => "auto");

/** What to add to a time's `Intl` options so it follows the preference. */
export interface TimeOptions {
  readonly hourCycle?: "h12" | "h23";
}

const none: TimeOptions = {};

const twelve: TimeOptions = { hourCycle: "h12" };

const twentyFour: TimeOptions = { hourCycle: "h23" };

/** The options of a preference: nothing for the language's own clock. */
export const timeOptionsOf = (format: HourFormat): TimeOptions => {
  if (format === "auto") {
    return none;
  }

  return format === "h12" ? twelve : twentyFour;
};

/**
 * The named formats that messages writing `{at, time, short}` take, so
 * they follow the preference; none for the language's own clock.
 */
export const timeFormatsOf = (format: HourFormat): Formats | undefined =>
  format === "auto"
    ? undefined
    : {
        dateTime: {
          short: {
            hour: "numeric",
            minute: "numeric",
            ...timeOptionsOf(format),
          },
        },
      };

const storageKey = "peal.hour-format";

const changed = "peal:hour-format";

const read = (): HourFormat => {
  try {
    return hourFormatOf(window.localStorage.getItem(storageKey));
  } catch {
    // Storage is closed to this page: the language's clock.
    return "auto";
  }
};

/** Keeps the preference in this browser, and tells every page that shows times. */
export const saveHourFormat = (format: HourFormat): void => {
  try {
    window.localStorage.setItem(storageKey, format);
  } catch {
    // Storage is closed to this page: the preference lasts as long as it.
  }

  window.dispatchEvent(new Event(changed));
};

const subscribe = (onChange: () => void) => {
  window.addEventListener(changed, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(changed, onChange);
    window.removeEventListener("storage", onChange);
  };
};

/**
 * The viewer's preference. The server, and the page while it hydrates,
 * write the language's own clock; the browser's preference replaces it
 * after, so both renders agree.
 */
export const useHourFormat = (): HourFormat =>
  useSyncExternalStore(subscribe, read, (): HourFormat => "auto");

/** The `Intl` options that make a time follow the viewer's preference. */
export const useTimeOptions = (): TimeOptions => timeOptionsOf(useHourFormat());
