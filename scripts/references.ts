// Clones the source of each framework agents rely on, at the version this
// workspace installs, into .local/references/<name>. Rerun it after an upgrade:
// a clone whose version no longer matches is replaced.
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { $, Glob } from "bun";
import { Schema } from "effect";

interface Reference {
  /** Folder under .local/references. */
  readonly name: string;
  /** The npm package whose installed version picks the tag. */
  readonly packageName: string;
  /** GitHub owner/repo. */
  readonly repository: string;
  readonly tag: (version: string) => string;
}

const references: readonly Reference[] = [
  {
    name: "effect",
    packageName: "effect",
    repository: "Effect-TS/effect",
    tag: (version) => `effect@${version}`,
  },
  {
    name: "drizzle-orm",
    packageName: "drizzle-orm",
    repository: "drizzle-team/drizzle-orm",
    tag: (version) => `v${version}`,
  },
  {
    name: "better-auth",
    packageName: "better-auth",
    repository: "better-auth/better-auth",
    tag: (version) => `v${version}`,
  },
  {
    // The AT Protocol monorepo, tagged per package: the OAuth client's tag
    // also carries the oauth-client, jwk and identity packages it depends on.
    name: "atproto",
    packageName: "@atproto/oauth-client-node",
    repository: "bluesky-social/atproto",
    tag: (version) => `@atproto/oauth-client-node@${version}`,
  },
  {
    // The client the Stripe plugin calls, and its webhook signatures.
    name: "stripe-node",
    packageName: "stripe",
    repository: "stripe/stripe-node",
    tag: (version) => `v${version}`,
  },
  {
    name: "tiptap",
    packageName: "@tiptap/react",
    repository: "ueberdosis/tiptap",
    tag: (version) => `v${version}`,
  },
  {
    // One monorepo for the core and each framework's package, tagged per
    // package: the React tag carries the core it was released with.
    name: "ui-sdk",
    packageName: "@ui-sdk/react",
    repository: "vercel-labs/ui",
    tag: (version) => `@ui-sdk/react@${version}`,
  },
  {
    name: "blume",
    packageName: "blume",
    repository: "haydenbleasel/blume",
    tag: (version) => `blume@${version}`,
  },
  {
    name: "astro",
    packageName: "astro",
    repository: "withastro/astro",
    tag: (version) => `astro@${version}`,
  },
];

const root = path.join(import.meta.dirname, "..");
const target = path.join(root, ".local", "references");

const decodeManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ version: Schema.String }))
);

// Bun hoists most packages to the root; a package one workspace pins
// differently stays in that workspace's node_modules.
const moduleFolders = [
  "node_modules",
  ...(await Array.fromAsync(
    new Glob("packages/*/node_modules").scan({ cwd: root, onlyFiles: false })
  )),
];

const installedVersion = async (
  packageName: string
): Promise<string | null> => {
  const manifests = moduleFolders.map((folder) =>
    Bun.file(path.join(root, folder, packageName, "package.json"))
  );

  const present = await Promise.all(
    manifests.map(async (manifest) => await manifest.exists())
  );

  const manifest = manifests.find((_, index) => present[index] === true);

  if (manifest === undefined) {
    return null;
  }

  return decodeManifest(await manifest.text()).version;
};

const sync = async (reference: Reference): Promise<string> => {
  const version = await installedVersion(reference.packageName);

  if (version === null) {
    return `skip   ${reference.name}: ${reference.packageName} is not installed`;
  }

  const directory = path.join(target, reference.name);
  const marker = Bun.file(`${directory}.version`);

  if ((await marker.exists()) && (await marker.text()) === version) {
    return `ok     ${reference.name} ${version}`;
  }

  const tag = reference.tag(version);

  await rm(directory, { force: true, recursive: true });
  await $`git -c advice.detachedHead=false clone --quiet --depth 1 --branch ${tag} https://github.com/${reference.repository}.git ${directory}`;
  await Bun.write(marker, version);

  return `clone  ${reference.name} ${version} (${tag})`;
};

await mkdir(target, { recursive: true });

const lines = await Promise.all(references.map(sync));

process.stdout.write(`${lines.join("\n")}\n`);
