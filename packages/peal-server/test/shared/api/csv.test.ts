import { describe, expect, it } from "vitest";

import { csvLine } from "#shared/api/csv.ts";

// The one CSV writer of the API's files, which another workspace's owner
// may write a cell of (its name, in the report across workspaces).

describe(csvLine, () => {
  it("quotes every text cell, doubles its quotes, and writes numbers and nothing as they are", () => {
    expect(csvLine(["a", 12, null, "b,c", 'say "hi"', "two\nlines", -3])).toBe(
      '"a",12,,"b,c","say ""hi""","two\nlines",-3\r\n'
    );
  });

  it.each([
    ["=1+1"],
    ["+1"],
    ["-2"],
    ["@SUM(A1)"],
    ["\t=1"],
    ["\r=1"],
    ["\n=1"],
    ["＝1+1"],
    ["＋1"],
    ["－1"],
    ["＠x"],
  ])("never lets %j start a formula", (cell) => {
    expect(csvLine([cell])).toBe(`"'${cell}"\r\n`);
  });

  it.each([
    ["x;=cmd|' /C calc'!A0;"],
    ["a;+1"],
    ["a; -1"],
    ["a;@x"],
    ["a;＝1"],
  ])(
    "never lets a cell %j start a formula after a semicolon either",
    (cell) => {
      expect(csvLine([cell])).toBe(`"'${cell}"\r\n`);
    }
  );

  it("leaves text that starts no formula as written", () => {
    expect(csvLine(["Studio; Paris", "e-mail", "A=B"])).toBe(
      '"Studio; Paris","e-mail","A=B"\r\n'
    );
  });
});
