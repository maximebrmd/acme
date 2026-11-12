import { describe, expect, it } from "@effect/vitest";
import { maxImportLength } from "peal-contract";

import { readImportFile } from "#posts/import-file.ts";

// A file as the browser hands it over: its size in bytes, and its text.
const file = (text: string, size = new TextEncoder().encode(text).length) => {
  const read: string[] = [];

  return {
    read,
    size,
    text: async () => {
      await Promise.resolve();
      read.push(text);

      return text;
    },
  };
};

const csv = "text,channels,at\nHello,c1,now\n";

describe(readImportFile, () => {
  it("takes the file's text as it is", async () => {
    await expect(readImportFile(file(csv))).resolves.toStrictEqual({
      _tag: "read",
      csv,
    });
  });

  it("drops the mark some programs write before the first character", async () => {
    await expect(
      readImportFile(file(`${String.fromCodePoint(0xfe_ff)}${csv}`))
    ).resolves.toStrictEqual({ _tag: "read", csv });
  });

  it("refuses an empty file", async () => {
    await expect(readImportFile(file(""))).resolves.toStrictEqual({
      _tag: "refused",
      reason: "empty",
    });
  });

  it("refuses a file that holds only the mark", async () => {
    await expect(
      readImportFile(file(String.fromCodePoint(0xfe_ff)))
    ).resolves.toStrictEqual({ _tag: "refused", reason: "empty" });
  });

  it("refuses a file larger than four bytes a character allow, unread", async () => {
    const large = file("", maxImportLength * 4 + 1);

    await expect(readImportFile(large)).resolves.toStrictEqual({
      _tag: "refused",
      reason: "tooLong",
    });
    expect(large.read).toStrictEqual([]);
  });

  it("takes a text as long as one import takes", async () => {
    const longest = "x".repeat(maxImportLength);

    await expect(readImportFile(file(longest))).resolves.toStrictEqual({
      _tag: "read",
      csv: longest,
    });
  });

  it("refuses a text one character longer", async () => {
    await expect(
      readImportFile(file("x".repeat(maxImportLength + 1)))
    ).resolves.toStrictEqual({ _tag: "refused", reason: "tooLong" });
  });

  it("says when the browser could not read the file", async () => {
    await expect(
      readImportFile({
        size: 10,
        text: async () => {
          await Promise.resolve();

          throw new Error("synthetic read failure");
        },
      })
    ).resolves.toStrictEqual({ _tag: "refused", reason: "unreadable" });
  });
});
