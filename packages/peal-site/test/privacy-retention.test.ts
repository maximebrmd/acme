// The privacy policy's retention table says, in each language, exactly
// what the registry the server's exports are written from says: a row for
// each category, its name then how long it is kept. Change a period in
// packages/peal-contract/src/data-processing.ts, then this table.
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  processingLocales,
  retentionTable,
} from "peal-contract/data-processing";
import { describe, expect, it } from "vitest";

const headings = { en: "## Retention", fr: "## Durées de conservation" };

// The rows of the first table under the section's heading, as cells,
// without its header and the line under it.
const tableOf = (locale: keyof typeof headings): string[][] => {
  const policy = readFileSync(
    path.join(
      import.meta.dirname,
      "../src/content/legal",
      locale,
      "privacy.md"
    ),
    "utf-8"
  );

  const [, section = ""] = policy.split(`${headings[locale]}\n`);
  const [untilNext = ""] = section.split("\n## ");

  return untilNext
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
    );
};

describe("the privacy policy's retention table", () => {
  it.each(processingLocales)("matches the registry in %s", (locale) => {
    expect(tableOf(locale)).toStrictEqual(
      retentionTable(locale).map(([data, keptFor]) => [data, keptFor])
    );
  });
});
