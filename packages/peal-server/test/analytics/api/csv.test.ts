import { describe, expect, it } from "vitest";

import { ndjsonLine } from "#analytics/api/analytics-export.ts";

// The CSV writer, which this export shares, has its tests in
// test/shared/api/csv.test.ts.
describe("an export's lines", () => {
  it("writes one JSON object a line, in the columns' order", () => {
    expect(ndjsonLine(["a", "b"], ["x", null])).toBe('{"a":"x","b":null}\n');
  });
});
