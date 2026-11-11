import { readFileSync } from "node:fs";

import { describe, expect, it } from "@effect/vitest";
import { TargetOptionsSchema } from "peal-contract";

// The docs' CLI page lists, under `peal drafts save`, every option each
// platform takes through `--options`, in each language.

const optionsLine = (page: string): string => {
  const text = readFileSync(
    new URL(`../../peal-docs/${page}`, import.meta.url),
    "utf-8"
  );

  return (
    text
      .split("\n")
      .find((line) => line.startsWith("- `--options <channel-id>=<json>`")) ??
    ""
  );
};

describe.each(["docs/cli.mdx", "docs/fr/cli.mdx"])("%s", (page) => {
  it("names every option of every platform that takes some", () => {
    const line = optionsLine(page);

    const missing = TargetOptionsSchema.members.flatMap(({ fields }) =>
      Object.keys(fields)
        .filter((name) => name !== "platform" && !line.includes(`\`${name}\``))
        .map((name) => `${fields.platform.literal}.${name}`)
    );

    expect(line).not.toBe("");
    expect(missing).toStrictEqual([]);
  });
});
