import { Console, DateTime, Effect, Layer, Predicate } from "effect";
import type { Channel } from "peal-contract";

const { isString } = Predicate;

/** An instant as the command line prints it: ISO 8601, in UTC. */
export const instant = (at: DateTime.Utc): string =>
  DateTime.formatIso(at).replace(/\.\d{3}Z$/u, "Z");

const excerptLength = 60;

/** A post's text on one line, cut short. */
export const excerpt = (text: string): string => {
  const line = text.replaceAll(/\s+/gu, " ").trim();

  if (line === "") {
    return "(no text)";
  }

  return line.length > excerptLength
    ? `${line.slice(0, excerptLength - 1)}…`
    : line;
};

/** A count the platform may not give: a dash for none. */
export const count = (value: number | null): string =>
  value === null ? "–" : String(value);

/** Rows as aligned columns, two spaces apart. */
export const columns = (rows: readonly (readonly string[])[]): string[] => {
  const widths: number[] = [];

  for (const row of rows) {
    for (const [index, cell] of row.entries()) {
      widths[index] = Math.max(widths[index] ?? 0, cell.length);
    }
  }

  return rows.map((row) =>
    row
      .map((cell, index) =>
        index === row.length - 1 ? cell : cell.padEnd(widths[index] ?? 0)
      )
      .join("  ")
      .trimEnd()
  );
};

/**
 * A channel as people recognize it: the name the workspace gave it, if it
 * gave one, then its platform and handle, which always show.
 */
export const channelName = (channel: Channel): string =>
  channel.label === null
    ? `${channel.platform} ${channel.handle}`
    : `${channel.label} (${channel.platform} ${channel.handle})`;

const replacement = String.fromCodePoint(0xff_fd);

/**
 * Whether a terminal acts on the character rather than shows it: C0
 * controls but tab and newline, DEL, C1 controls, and the marks that
 * reorder text.
 */
export const actsOnTerminal = (codePoint: number): boolean =>
  (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0a) ||
  (codePoint >= 0x7f && codePoint <= 0x9f) ||
  (codePoint >= 0x20_2a && codePoint <= 0x20_2e) ||
  (codePoint >= 0x20_66 && codePoint <= 0x20_69);

/**
 * Text as the terminal shows it, never acts on it: what the server holds
 * (posts, names, handles, applications) was written by others, and a
 * control sequence in it could set the clipboard, hide lines or rename the
 * window. Each such character is shown as U+FFFD.
 */
export const printable = (text: string): string =>
  Array.from(text, (character) =>
    actsOnTerminal(character.codePointAt(0) ?? 0) ? replacement : character
  ).join("");

const cleaned = (args: readonly unknown[]) =>
  args.map((arg) => (isString(arg) ? printable(arg) : arg));

// The console, its texts cleaned before they are printed.
const printing = (console: Console.Console): Console.Console => ({
  assert: (condition, ...args) => {
    console.assert(condition, ...cleaned(args));
  },
  clear: () => {
    console.clear();
  },
  count: (label) => {
    console.count(label);
  },
  countReset: (label) => {
    console.countReset(label);
  },
  debug: (...args) => {
    console.debug(...cleaned(args));
  },
  dir: (item, options) => {
    console.dir(item, options);
  },
  dirxml: (...args) => {
    console.dirxml(...cleaned(args));
  },
  error: (...args) => {
    console.error(...cleaned(args));
  },
  group: (...args) => {
    console.group(...cleaned(args));
  },
  groupCollapsed: (...args) => {
    console.groupCollapsed(...cleaned(args));
  },
  groupEnd: () => {
    console.groupEnd();
  },
  info: (...args) => {
    console.info(...cleaned(args));
  },
  log: (...args) => {
    console.log(...cleaned(args));
  },
  table: (tabularData, properties) => {
    console.table(tabularData, properties);
  },
  time: (label) => {
    console.time(label);
  },
  timeEnd: (label) => {
    console.timeEnd(label);
  },
  timeLog: (label, ...args) => {
    console.timeLog(label, ...cleaned(args));
  },
  trace: (...args) => {
    console.trace(...cleaned(args));
  },
  warn: (...args) => {
    console.warn(...cleaned(args));
  },
});

/**
 * The console, printing every text it is given as `printable` does, the
 * reasons a command was refused included.
 */
export const printableConsole = Layer.effect(
  Console.Console,
  Console.consoleWith((console) => Effect.succeed(printing(console)))
);
