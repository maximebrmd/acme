// Compiles the CLI into one executable for this machine's platform,
// dist/acme, with its sourcemap embedded so stack traces point at src/.
import { rm } from "node:fs/promises";
import path from "node:path";

import { Glob } from "bun";

const root = path.join(import.meta.dirname, "..");

const { outputs } = await Bun.build({
  compile: { outfile: path.join(root, "dist", "acme") },
  entrypoints: [path.join(root, "src", "main.ts")],
  minify: true,
  sourcemap: "linked",
});

// Bun 1.4.4 leaves its working copy of the Bun executable
// (`.<hash>-00000000.bun-build`, about 90 MB) in the working directory when
// that executable is read-only, as Homebrew installs it. Remove it, so copies
// neither pile up nor change the inputs Nx hashes.
const leftovers = await Array.fromAsync(
  new Glob(".*.bun-build").scan({ cwd: process.cwd(), dot: true })
);

await Promise.all(
  leftovers.map(async (leftover) => {
    await rm(path.join(process.cwd(), leftover), { force: true });
  })
);

process.stdout.write(
  `${outputs.map((output) => path.relative(root, output.path)).join("\n")}\n`
);
