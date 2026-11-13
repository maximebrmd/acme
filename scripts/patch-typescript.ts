// Patches the workspace's TypeScript with Effect's language service
// (effect-tsgo patch), so tsc and the editor report Effect's diagnostics.
//
// @effect/tsgo ships a build for each TypeScript version it supports, and
// refuses any other. On install (the root package's prepare) a refusal is
// a warning, so `bun install` still works; with --strict (bun run
// typecheck) it fails, so no check passes without the diagnostics.
import path from "node:path";

const strict = process.argv.includes("--strict");

const patcher = path.join(
  import.meta.dirname,
  "..",
  "node_modules",
  ".bin",
  "effect-tsgo"
);

const { exitCode } = Bun.spawnSync([patcher, "patch", "--typescript"], {
  stderr: "inherit",
  stdout: "inherit",
});

if (exitCode !== 0) {
  const message = [
    "Effect's language service could not patch TypeScript: the installed @effect/tsgo has no build for this TypeScript version.",
    "Move typescript and @effect/tsgo together, to a pair @effect/tsgo's README lists as supported (Dependabot's typescript group does), then run bun install.",
    strict
      ? "bun run typecheck fails until then."
      : "Until then tsc and the editor run without Effect's diagnostics, and bun run typecheck fails.",
  ].join("\n");

  process.stderr.write(`\n${strict ? "error" : "warning"}: ${message}\n\n`);
  process.exitCode = strict ? 1 : 0;
}
