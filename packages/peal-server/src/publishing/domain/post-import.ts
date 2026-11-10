import { DateTime, Option, Result, Schema } from "effect";

import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import {
  fromWallClock,
  LocalDateSchema,
  LocalTimeSchema,
} from "#shared/domain/wall-clock.ts";

import { parseCsv } from "./csv.ts";
import { maxIdempotencyKeyLength } from "./idempotency.ts";
import { maxMediaPerPost } from "./post-content.ts";
import { PostTextSchema } from "./post-text.ts";

/** The most rows one import takes, the line that names the columns apart. */
export const maxImportRows = 100;

/** The columns an import reads, as the file's first line names them. */
export const importColumns = [
  "text",
  "channels",
  "media",
  "at",
  "time_zone",
  "allow_duplicate",
  "idempotency_key",
] as const;

export type ImportColumn = (typeof importColumns)[number];

// A file names all of these, even when some rows leave their cells empty.
const requiredColumns: readonly ImportColumn[] = ["text", "channels", "at"];

/** Why a file cannot be read as posts at all, and about which column. */
export interface ImportFault {
  readonly column: Option.Option<string>;
  readonly problem:
    | "empty"
    | "missingColumn"
    | "repeatedColumn"
    | "strayQuote"
    | "tooManyRows"
    | "unknownColumn"
    | "unterminatedQuote";
}

/** A cell that is missing where its row needs it, or cannot be read. */
export interface CellProblem {
  readonly column: ImportColumn;
  readonly problem: "invalid" | "missing";
}

/**
 * A post as a row wrote it: channels and media still by the ids written,
 * which only the workspace tells apart, and its time as an instant.
 */
export interface ImportedPost {
  readonly allowDuplicate: boolean;
  /** None is now. */
  readonly at: Option.Option<DateTime.Utc>;
  readonly channels: readonly string[];
  readonly idempotencyKey: Option.Option<string>;
  readonly media: readonly string[];
  readonly text: string;
  readonly timeZone: TimeZoneId;
}

/** A row under the first line, counted from 1, and what it says. */
export interface ImportRow {
  /**
   * How many cells the row has, when that is not as many as the first
   * line names: such a row is not read at all, as which cell is which is
   * no longer known. A comma the text did not quote cuts it in two.
   */
  readonly cellCount: Option.Option<{
    readonly expected: number;
    readonly found: number;
  }>;
  readonly post: Result.Result<ImportedPost, readonly CellProblem[]>;
  readonly row: number;
}

// No key holds a control character: the keys of a file's rows are told
// from one another, and from the request's, by one (`keyAt`).
const controlCharacter = /\p{Cc}/u;

const isColumn = Schema.is(Schema.Literals(importColumns));

const isText = Schema.is(PostTextSchema);

const decodeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

const decodeDate = Schema.decodeUnknownOption(LocalDateSchema);

const decodeTime = Schema.decodeUnknownOption(LocalTimeSchema);

const fault = (problem: ImportFault["problem"], column?: string) =>
  Result.fail<ImportFault>({ column: Option.fromUndefinedOr(column), problem });

// Ids in one cell, separated by spaces, commas or semicolons.
const listed = (cell: string): readonly string[] =>
  cell.split(/[\s,;]+/u).filter((id) => id !== "");

// An instant with its offset, as RFC 3339 writes one, a space allowed in
// place of the T.
const instant =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/u;

// A date and a time of day to the minute, with no offset.
const wallClock =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})[T ](?<hour>\d{2}):(?<minute>\d{2})(?::00)?$/u;

const invalid = (column: ImportColumn): CellProblem => ({
  column,
  problem: "invalid",
});

// When the row's post goes out: none for `now`, or the instant written,
// with its offset or on the wall clock of the row's zone.
const timeOf = (
  cell: string,
  timeZone: Option.Option<TimeZoneId>
): Result.Result<Option.Option<DateTime.Utc>, CellProblem> => {
  if (cell === "") {
    return Result.fail({ column: "at", problem: "missing" });
  }

  if (cell.toLowerCase() === "now") {
    return Result.succeed(Option.none());
  }

  if (instant.test(cell)) {
    return Option.match(DateTime.make(cell.replace(" ", "T")), {
      onNone: () => Result.fail(invalid("at")),
      onSome: (at) => Result.succeed(Option.some(DateTime.toUtc(at))),
    });
  }

  const parts = wallClock.exec(cell)?.groups;

  const read = Option.all({
    date: decodeDate({
      day: Number(parts?.["day"]),
      month: Number(parts?.["month"]),
      year: Number(parts?.["year"]),
    }),
    time: decodeTime({
      hour: Number(parts?.["hour"]),
      minute: Number(parts?.["minute"]),
    }),
    // Without a zone the wall clock names no instant: the zone's own cell
    // says what is wrong with it.
    zone: timeZone,
  });

  return Option.match(read, {
    onNone: () =>
      Option.isNone(timeZone) && parts !== undefined
        ? Result.succeed(Option.none())
        : Result.fail(invalid("at")),
    onSome: ({ date, time, zone }) =>
      Result.succeed(
        Option.some(DateTime.toUtc(fromWallClock(date, time, zone)))
      ),
  });
};

const flagOf = (cell: string): Option.Option<boolean> => {
  const written = cell.toLowerCase();

  if (written === "" || written === "false") {
    return Option.some(false);
  }

  return written === "true" ? Option.some(true) : Option.none();
};

const postOf = (
  cellOf: (column: ImportColumn) => string
): Result.Result<ImportedPost, readonly CellProblem[]> => {
  const text = cellOf("text");
  const channels = listed(cellOf("channels"));
  const media = listed(cellOf("media"));
  const zone = decodeZone(cellOf("time_zone") || "UTC");
  const at = timeOf(cellOf("at").trim(), zone);
  const allowDuplicate = flagOf(cellOf("allow_duplicate").trim());
  const key = cellOf("idempotency_key");

  const problems: readonly CellProblem[] = [
    ...(isText(text) ? [] : [invalid("text")]),
    ...(channels.length === 0
      ? [{ column: "channels", problem: "missing" } as const]
      : []),
    ...(media.length > maxMediaPerPost || new Set(media).size < media.length
      ? [invalid("media")]
      : []),
    ...(Result.isFailure(at) ? [at.failure] : []),
    ...(Option.isNone(zone) ? [invalid("time_zone")] : []),
    ...(Option.isNone(allowDuplicate) ? [invalid("allow_duplicate")] : []),
    ...(key.length > maxIdempotencyKeyLength || controlCharacter.test(key)
      ? [invalid("idempotency_key")]
      : []),
  ];

  if (
    problems.length > 0 ||
    Result.isFailure(at) ||
    Option.isNone(zone) ||
    Option.isNone(allowDuplicate)
  ) {
    return Result.fail(problems);
  }

  return Result.succeed({
    allowDuplicate: allowDuplicate.value,
    at: at.success,
    channels,
    idempotencyKey: key === "" ? Option.none() : Option.some(key),
    media,
    text,
    timeZone: zone.value,
  });
};

/**
 * The posts a CSV file lists, one per row under its first line, which
 * names the columns in any order (`importColumns`; `text`, `channels` and
 * `at` are needed). A row's `at` is `now`, an instant with its offset, or a
 * date and time to the minute read on the wall clock of its `time_zone`
 * (`fromWallClock`; UTC when the cell is empty). Each row is read on its
 * own: one that cannot be read keeps no other from being read. A row is
 * a line that is not blank, numbered from 1 among those; one with more or
 * fewer cells than the first line names is unreadable (`cellCount`), never
 * read by guessing. Fails when the file as a whole cannot be read.
 *
 * A row is a post of one part, with one text for all its channels: no
 * column carries the parts of a thread, texts by channel or options, which
 * a flat cell cannot hold without a syntax of its own. Those posts go
 * through `send` or `bulk`.
 */
export const readImport = (
  file: string
): Result.Result<readonly ImportRow[], ImportFault> => {
  const parsed = parseCsv(file);

  if (Result.isFailure(parsed)) {
    return fault(parsed.failure);
  }

  const [header, ...rows] = parsed.success;

  if (header === undefined) {
    return fault("empty");
  }

  const names = header.map((name) => name.trim().toLowerCase());
  const unknown = names.find((name) => !isColumn(name));

  if (unknown !== undefined) {
    return fault("unknownColumn", unknown);
  }

  const repeated = names.find((name, at) => names.indexOf(name) !== at);

  if (repeated !== undefined) {
    return fault("repeatedColumn", repeated);
  }

  const missing = requiredColumns.find((column) => !names.includes(column));

  if (missing !== undefined) {
    return fault("missingColumn", missing);
  }

  if (rows.length === 0) {
    return fault("empty");
  }

  if (rows.length > maxImportRows) {
    return fault("tooManyRows");
  }

  return Result.succeed(
    rows.map((cells, at): ImportRow =>
      cells.length === names.length
        ? {
            cellCount: Option.none(),
            post: postOf((column) => cells[names.indexOf(column)] ?? ""),
            row: at + 1,
          }
        : {
            cellCount: Option.some({
              expected: names.length,
              found: cells.length,
            }),
            post: Result.fail([]),
            row: at + 1,
          }
    )
  );
};
