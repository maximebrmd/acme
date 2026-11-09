// Fails when the SDKs differ from what openapi.json generates now: a file
// the generator changed or added since the last `git add`. `nx run
// peal-sdk:check` runs it after every language's sdk:generate, so in CI,
// where nothing is staged, a contract change that was not regenerated, or a
// generated file edited by hand, stops the run.
import { $ } from "bun";

import { sdkRoot } from "./container.ts";

const changed = await $`git diff --name-only -- .`.cwd(sdkRoot).text();

const added = await $`git ls-files --others --exclude-standard -- .`
  .cwd(sdkRoot)
  .text();

const differences = `${changed}${added}`.trim();

if (differences !== "") {
  process.stderr.write(`${differences}\n`);
  throw new Error(
    "The SDKs differ from what the contract generates: run `bun run sdk:generate` and commit what changed."
  );
}
