import { describe, expect, it } from "@effect/vitest";
import { Option, Result } from "effect";

import { parseCsv } from "#publishing/domain/csv.ts";
import { maxImportRows, readImport } from "#publishing/domain/post-import.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";

const rowsOf = (file: string) => {
  const read = readImport(file);

  return Result.isSuccess(read) ? read.success : [];
};

const faultOf = (file: string) => {
  const read = readImport(file);

  return Result.isFailure(read)
    ? { ...read.failure, column: Option.getOrNull(read.failure.column) }
    : undefined;
};

const fileOf = (rows: number) =>
  `text,channels,at\n${"a,b,now\n".repeat(rows)}`;

describe(parseCsv, () => {
  it("reads quoted cells, doubled quotes and every line break", () => {
    expect(
      parseCsv(
        `${String.fromCodePoint(0xfe_ff)}text,channels\r\n"Hello, ""world""\nsecond line",a b\n\nplain,c\rlast,`
      )
    ).toStrictEqual(
      Result.succeed([
        ["text", "channels"],
        ['Hello, "world"\nsecond line', "a b"],
        ["plain", "c"],
        ["last", ""],
      ])
    );
  });

  it("refuses a quoted cell that never ends", () => {
    expect(parseCsv('text\n"never')).toStrictEqual(
      Result.fail("unterminatedQuote")
    );
  });
});

describe(readImport, () => {
  it("reads each row's post, its time as an instant", () => {
    const rows = rowsOf(
      [
        "Channels,TEXT,at,time_zone,media,allow_duplicate,idempotency_key",
        'one;two,"A synthetic post, with a comma",now,,,,',
        "one,Winter in Paris,2026-12-01 09:00,Europe/Paris,m1 m2,TRUE,key-1",
        "one,With an offset,2026-12-01T09:00:00+01:00,Asia/Tokyo,,false,",
      ].join("\n")
    );

    expect(rows.map(({ row }) => row)).toStrictEqual([1, 2, 3]);
    expect(rows[0]?.post).toStrictEqual(
      Result.succeed({
        allowDuplicate: false,
        at: Option.none(),
        channels: ["one", "two"],
        idempotencyKey: Option.none(),
        media: [],
        text: "A synthetic post, with a comma",
        timeZone: "UTC",
      })
    );
    expect(rows[1]?.post).toStrictEqual(
      Result.succeed({
        allowDuplicate: true,
        at: Option.some(utc("2026-12-01T08:00:00Z")),
        channels: ["one"],
        idempotencyKey: Option.some("key-1"),
        media: ["m1", "m2"],
        text: "Winter in Paris",
        timeZone: "Europe/Paris",
      })
    );
    // An offset says the instant; the zone is only kept with it.
    expect(
      Result.isSuccess(rows[2]?.post ?? Result.fail([]))
        ? Result.getOrThrow(rows[2]?.post ?? Result.fail([])).at
        : undefined
    ).toStrictEqual(Option.some(utc("2026-12-01T08:00:00Z")));
  });

  it("moves a wall-clock time the clocks skip to the moment they jump", () => {
    const [row] = rowsOf(
      "text,channels,at,time_zone\nSpring,one,2026-03-29 02:30,Europe/Paris"
    );

    expect(
      row !== undefined && Result.isSuccess(row.post)
        ? row.post.success.at
        : undefined
    ).toStrictEqual(Option.some(utc("2026-03-29T01:00:00Z")));
  });

  it("says every cell of a row that cannot be read, and reads the others", () => {
    const rows = rowsOf(
      [
        "text,channels,at,time_zone,media,allow_duplicate",
        "No channel,,,Mars/Olympus,m1 m1,maybe",
        "Fine,one,now,,,",
        "No such day,one,2026-02-30 09:00,,,",
        "No offset no zone,one,2026-12-01T09:00,+01:00,,",
      ].join("\n")
    );

    expect(rows[0]?.post).toStrictEqual(
      Result.fail([
        { column: "channels", problem: "missing" },
        { column: "media", problem: "invalid" },
        { column: "at", problem: "missing" },
        { column: "time_zone", problem: "invalid" },
        { column: "allow_duplicate", problem: "invalid" },
      ])
    );
    expect(Result.isSuccess(rows[1]?.post ?? Result.fail([]))).toBeTruthy();
    expect(rows[2]?.post).toStrictEqual(
      Result.fail([{ column: "at", problem: "invalid" }])
    );
    // The zone is what is wrong, not the time read in it.
    expect(rows[3]?.post).toStrictEqual(
      Result.fail([{ column: "time_zone", problem: "invalid" }])
    );
  });

  it("refuses a file with no row, or with a quote left open", () => {
    expect(faultOf("")).toStrictEqual({ column: null, problem: "empty" });
    expect(faultOf("text,channels,at")).toStrictEqual({
      column: null,
      problem: "empty",
    });
    expect(faultOf('text,channels,at\n"a,b,now')).toStrictEqual({
      column: null,
      problem: "unterminatedQuote",
    });
  });

  it("refuses a first line that names the wrong columns", () => {
    expect(faultOf("text,channels,at,colour\na,b,now,red")).toStrictEqual({
      column: "colour",
      problem: "unknownColumn",
    });
    expect(faultOf("text,channels,at,text\na,b,now,c")).toStrictEqual({
      column: "text",
      problem: "repeatedColumn",
    });
    expect(faultOf("text,channels\na,b")).toStrictEqual({
      column: "at",
      problem: "missingColumn",
    });
  });

  it("takes a hundred rows, and no more", () => {
    expect(faultOf(fileOf(maxImportRows + 1))).toStrictEqual({
      column: null,
      problem: "tooManyRows",
    });
    expect(rowsOf(fileOf(maxImportRows))).toHaveLength(maxImportRows);
  });
});
