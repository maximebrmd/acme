import path from "node:path";

// Runs the Pulumi CLI in one of this package's projects, with the
// credentials it needs read from the owner's login keychain (README.md,
// "State and credentials"):
//
//   bun scripts/pulumi.ts <account|environment> <pulumi arguments…>
//
// Each variable already set wins, as in CI, and the keychain is read only
// when one is missing: macOS then asks the owner to allow it. They reach
// Pulumi in its environment alone, never a file. Nothing here prints a
// secret.
import { Option } from "effect";

import {
  credentialNames,
  credentialsFrom,
  keychainAccount,
  keychainService,
} from "./credentials.ts";

const [project, ...args] = process.argv.slice(2);

if (project !== "account" && project !== "environment") {
  console.error(
    "Usage: bun scripts/pulumi.ts <account|environment> <pulumi arguments…>"
  );
  process.exit(2);
}

const missing = credentialNames.filter(
  (name) => process.env[name] === undefined
);

const env: Record<string, string> = {};

if (missing.length > 0) {
  const found = Bun.spawnSync(
    [
      "security",
      "find-generic-password",
      "-a",
      keychainAccount,
      "-s",
      keychainService,
      "-w",
    ],
    { stderr: "ignore", stdin: "ignore", stdout: "pipe" }
  );

  const credentials =
    found.exitCode === 0
      ? credentialsFrom(found.stdout.toString().trim())
      : Option.none();

  if (Option.isNone(credentials)) {
    console.error(
      `No usable keychain item "${keychainService}": run \`bun scripts/keychain.ts\` (README.md), or allow the keychain's prompt. Missing: ${missing.join(", ")}.`
    );
    process.exit(1);
  }

  for (const name of missing) {
    env[name] = credentials.value[name];
  }
}

const run = Bun.spawn(["pulumi", ...args], {
  cwd: path.join(import.meta.dir, "..", project),
  env: { ...process.env, ...env },
  stdio: ["inherit", "inherit", "inherit"],
});

process.exit(await run.exited);
