import { describe, expect, it } from "@effect/vitest";
import { ScheduleInPast, UnknownChannels } from "peal-contract";
import type { ImportResult, ImportRowResult } from "peal-contract";

import {
  canImport,
  idleImport,
  nextImport,
  refusedMeanwhile,
} from "#posts/import-state.ts";
import type { ImportEvent, ImportState } from "#posts/import-state.ts";

const csv = "text,channels,at\nHello,c1,2027-01-05 09:00\n";
const message = "A synthetic refusal";

const valid = (row: number): ImportRowResult => ({ _tag: "valid", row });

const refused = (row: number): ImportRowResult => ({
  _tag: "refused",
  refusal: new UnknownChannels({ channelIds: ["c9"], message }),
  row,
});

const answer = (
  rows: readonly ImportRowResult[],
  dryRun = true,
  created = 0
): ImportResult => ({ created, dryRun, rows });

// The events, one after the other, from the screen's first state.
const after = (...events: readonly ImportEvent[]): ImportState => {
  let state = idleImport;

  for (const event of events) {
    state = nextImport(state, event);
  }

  return state;
};

const chosen: ImportEvent = { _tag: "chosen", file: { _tag: "read", csv } };

const checkedValid: ImportEvent = {
  _tag: "checked",
  key: "key-1",
  result: answer([valid(1), valid(2)]),
};

describe(nextImport, () => {
  it("checks a file the browser read", () => {
    expect(after(chosen)).toStrictEqual({ _tag: "checking", csv });
  });

  it("refuses a file before any request", () => {
    expect(
      after({ _tag: "chosen", file: { _tag: "refused", reason: "tooLong" } })
    ).toStrictEqual({ _tag: "fileRefused", reason: "tooLong" });
  });

  it("keeps the key made when every row passed the check", () => {
    expect(after(chosen, checkedValid)).toStrictEqual({
      _tag: "checked",
      csv,
      key: "key-1",
      rows: [valid(1), valid(2)],
    });
  });

  it("keeps no key for a file that cannot be imported", () => {
    expect(
      after(chosen, {
        _tag: "checked",
        key: "key-1",
        result: answer([valid(1), refused(2)]),
      })
    ).toStrictEqual({
      _tag: "checked",
      csv,
      key: null,
      rows: [valid(1), refused(2)],
    });
  });

  it("says when the server cannot read the file at all", () => {
    expect(
      after(chosen, {
        _tag: "unreadable",
        column: "title",
        problem: "unknownColumn",
      })
    ).toStrictEqual({
      _tag: "unreadable",
      column: "title",
      problem: "unknownColumn",
    });
  });

  it("imports a checked file under its key", () => {
    expect(after(chosen, checkedValid, { _tag: "confirmed" })).toStrictEqual({
      _tag: "importing",
      csv,
      key: "key-1",
      rows: [valid(1), valid(2)],
    });
  });

  it("refuses to import while a row is refused", () => {
    const state = after(chosen, {
      _tag: "checked",
      key: "key-1",
      result: answer([valid(1), refused(2)]),
    });

    expect(nextImport(state, { _tag: "confirmed" })).toBe(state);
  });

  it("refuses a second confirm while importing", () => {
    const importing = after(chosen, checkedValid, { _tag: "confirmed" });

    expect(nextImport(importing, { _tag: "confirmed" })).toBe(importing);
  });

  it("keeps the file while it is imported: another one waits", () => {
    const importing = after(chosen, checkedValid, { _tag: "confirmed" });

    expect(nextImport(importing, chosen)).toBe(importing);
  });

  it("shows what became of each row", () => {
    const rows = [refused(1)];

    expect(
      after(
        chosen,
        checkedValid,
        { _tag: "confirmed" },
        {
          _tag: "imported",
          result: answer(rows, false, 0),
        }
      )
    ).toStrictEqual({ _tag: "imported", created: 0, rows });
  });

  it("retries a failed import with the same key", () => {
    const importing = after(chosen, checkedValid, { _tag: "confirmed" });
    const failed = nextImport(importing, { _tag: "failed", reason: "unknown" });

    expect(failed).toStrictEqual({
      _tag: "failed",
      reason: "unknown",
      step: importing,
    });
    expect(nextImport(failed, { _tag: "retried" })).toStrictEqual(importing);
  });

  it("retries a failed check with the same file", () => {
    const failed = after(chosen, { _tag: "failed", reason: "forbidden" });

    expect(nextImport(failed, { _tag: "retried" })).toStrictEqual({
      _tag: "checking",
      csv,
    });
  });

  it("makes a new key for a new check of the same file", () => {
    const again = after(chosen, checkedValid, chosen, {
      ...checkedValid,
      key: "key-2",
    });

    expect(again).toMatchObject({ _tag: "checked", key: "key-2" });
  });

  it("starts again from the file when another is chosen", () => {
    expect(
      after(chosen, checkedValid, {
        _tag: "chosen",
        file: { _tag: "refused", reason: "empty" },
      })
    ).toStrictEqual({ _tag: "fileRefused", reason: "empty" });
  });

  it("takes no answer it did not wait for", () => {
    const checked = after(chosen, checkedValid);

    expect(nextImport(checked, { _tag: "imported", result: answer([]) })).toBe(
      checked
    );
    expect(nextImport(idleImport, checkedValid)).toBe(idleImport);
  });
});

describe(canImport, () => {
  it("offers Import once every row is valid", () => {
    expect(canImport(after(chosen, checkedValid))).toBeTruthy();
  });

  it("does not offer Import while a row is refused", () => {
    expect(
      canImport(
        after(chosen, {
          _tag: "checked",
          key: "key-1",
          result: answer([valid(1), refused(2)]),
        })
      )
    ).toBeFalsy();
  });

  it("does not offer Import for a file without rows", () => {
    expect(
      canImport(
        after(chosen, { _tag: "checked", key: "k", result: answer([]) })
      )
    ).toBeFalsy();
  });

  it("does not offer it again while importing", () => {
    expect(
      canImport(after(chosen, checkedValid, { _tag: "confirmed" }))
    ).toBeFalsy();
  });
});

describe(refusedMeanwhile, () => {
  it("lists the rows refused after others were made", () => {
    const late = {
      _tag: "refused" as const,
      refusal: new ScheduleInPast({ message }),
      row: 2,
    };

    expect(refusedMeanwhile([{ _tag: "valid", row: 1 }, late])).toStrictEqual([
      late,
    ]);
  });
});
