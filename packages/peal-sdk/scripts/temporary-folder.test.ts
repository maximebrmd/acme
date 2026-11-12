import { describe, expect, it } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { withTemporaryFolder } from "./temporary-folder.ts";

// A root of the test's own, so nothing outside it is touched.
const root = await mkdtemp(path.join(tmpdir(), "peal-sdk-temporary-test-"));

const removeWith = async (folder: string) => {
  await rm(folder, { force: true, recursive: true });
};

describe("the temporary folder Fern runs in", () => {
  it("is a new folder each run, so runs at once never share one", async () => {
    const seen: string[] = [];

    const run = async () =>
      await withTemporaryFolder(
        { name: "peal-sdk-fern-node", remove: removeWith, root },
        async (folder) => {
          seen.push(folder);

          return await readdir(root);
        }
      );

    const [first, second] = await Promise.all([run(), run()]);

    expect(new Set(seen).size).toBe(2);

    for (const folder of seen) {
      expect(path.basename(folder)).toStartWith("peal-sdk-fern-node-");
      expect([...(first ?? []), ...(second ?? [])]).toContain(
        path.basename(folder)
      );
    }

    expect(await readdir(root)).toEqual([]);
  });

  it("is removed when the run fails", async () => {
    let failed = false;

    try {
      await withTemporaryFolder(
        { name: "peal-sdk-fern-rust", remove: removeWith, root },
        async (folder) => {
          await readdir(folder);

          throw new Error("synthetic failure");
        }
      );
    } catch {
      failed = true;
    }

    expect(failed).toBeTrue();
    expect(await readdir(root)).toEqual([]);

    await rm(root, { force: true, recursive: true });
  });
});
