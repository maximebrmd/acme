// Runs the Pulumi CLI in one of this package's projects, with the
// credentials it needs read from the owner's machine (README.md):
//
//   bun scripts/pulumi.ts <account|environment> <pulumi arguments…>
//
// Each variable already set wins, as in CI. Nothing here prints a secret.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const [project, ...args] = process.argv.slice(2);

if (project !== "account" && project !== "environment") {
  console.error(
    "Usage: bun scripts/pulumi.ts <account|environment> <pulumi arguments…>"
  );
  process.exit(2);
}

const folder = path.join(homedir(), ".config", "peal");
const env: Record<string, string> = {};

const token = path.join(folder, "cloudflare-pulumi.token");

if (process.env["CLOUDFLARE_API_TOKEN"] === undefined && existsSync(token)) {
  env["CLOUDFLARE_API_TOKEN"] = readFileSync(token, "utf-8").trim();
}

// The state bucket's own key, as NAME=value lines.
const state = path.join(folder, "pulumi-state.env");

if (process.env["AWS_ACCESS_KEY_ID"] === undefined && existsSync(state)) {
  for (const line of readFileSync(state, "utf-8").split("\n")) {
    const at = line.indexOf("=");

    if (at > 0) {
      env[line.slice(0, at)] = line.slice(at + 1).trim();
    }
  }
}

const passphrase = path.join(folder, "pulumi-passphrase");

if (
  process.env["PULUMI_CONFIG_PASSPHRASE"] === undefined &&
  process.env["PULUMI_CONFIG_PASSPHRASE_FILE"] === undefined &&
  existsSync(passphrase)
) {
  env["PULUMI_CONFIG_PASSPHRASE_FILE"] = passphrase;
}

const run = Bun.spawn(["pulumi", ...args], {
  cwd: path.join(import.meta.dir, "..", project),
  env: { ...process.env, ...env },
  stdio: ["inherit", "inherit", "inherit"],
});

process.exit(await run.exited);
