import { describe, expect, it } from "vitest";

import { csvLine, ndjsonLine } from "#analytics/api/analytics-export.ts";

describe("an export's lines", () => {
  it("writes CSV as RFC 4180 does: quotes around a comma, a quote or a line break, and nothing for null", () => {
    expect(csvLine(["a", 12, null, "b,c", 'say "hi"', "two\nlines"])).toBe(
      'a,12,,"b,c","say ""hi""","two\nlines"\r\n'
    );
  });

  it("never lets a cell start a formula in a spreadsheet", () => {
    expect(csvLine(["=1+1", "+1", "-2", "@x", -3])).toBe(
      "'=1+1,'+1,'-2,'@x,-3\r\n"
    );
  });

  it("writes one JSON object a line, in the columns' order", () => {
    expect(ndjsonLine(["a", "b"], ["x", null])).toBe('{"a":"x","b":null}\n');
  });
});
