import { createInterface } from "node:readline/promises";

// Keeps what Pulumi needs in the owner's login keychain, from the password
// manager the owner keeps them in (README.md, "State and credentials"):
//
//   bun scripts/keychain.ts
//
// It asks for each value in turn: copy it, press Enter, and it reads the
// clipboard, then empties it at the end. The item is written through
// `security -i`, on its standard input, so no value is ever in a command
// line, and with no trusted application, so macOS asks before each read.
import { Option } from "effect";

import {
  credentialNames,
  credentialsFrom,
  keychainAccount,
  keychainService,
} from "./credentials.ts";

const what = {
  AWS_ACCESS_KEY_ID: "the state bucket key's access key ID",
  AWS_SECRET_ACCESS_KEY: "the state bucket key's secret access key",
  CLOUDFLARE_API_TOKEN: "Pulumi's Cloudflare API token",
  PULUMI_CONFIG_PASSPHRASE: "the stacks' passphrase",
} as const;

const clipboard = (): string =>
  Bun.spawnSync(["pbpaste"], { stderr: "ignore", stdin: "ignore" })
    .stdout.toString()
    .trim();

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// One value after another, as the owner copies each in turn.
const collect = async (
  names: readonly (keyof typeof what)[],
  values: Record<string, string>
): Promise<Record<string, string>> => {
  const [name, ...rest] = names;

  if (name === undefined) {
    return values;
  }

  await terminal.question(`Copy ${what[name]} (${name}), then press Enter.`);
  const value = clipboard();

  if (value === "") {
    console.error("The clipboard is empty: nothing was written.");
    process.exit(1);
  }

  return await collect(rest, { ...values, [name]: value });
};

const values = await collect(credentialNames, {});

terminal.close();

Bun.spawnSync(["pbcopy"], { stdin: Buffer.from("") });

const json = JSON.stringify(values);

if (Option.isNone(credentialsFrom(json))) {
  console.error("A value is missing: nothing was written.");
  process.exit(1);
}

// -X takes the password in hexadecimal, which needs no quoting; -U replaces
// an item already there; -T "" trusts no application.
const command = `add-generic-password -U -a ${keychainAccount} -s ${keychainService} -T "" -X ${Buffer.from(json).toString("hex")}\n`;

const written = Bun.spawnSync(["security", "-i"], {
  stderr: "pipe",
  stdin: Buffer.from(command),
  stdout: "ignore",
});

if (written.exitCode !== 0 || written.stderr.length > 0) {
  console.error(`The keychain refused the item "${keychainService}".`);
  process.exit(1);
}

console.log(
  `Saved "${keychainService}" in the login keychain; the clipboard is empty.`
);
