// Generates one language's SDK from openapi.json:
// `bun scripts/generate.ts <language>`. It deletes what the previous run
// wrote (listed in .openapi-generator/FILES), so a schema or an operation the
// contract drops leaves no file behind, runs openapi-generator, then copies
// the SDKs' license in and fills what the generator leaves out of the
// package's manifest. The files a language's .openapi-generator-ignore names
// are ours, and the generator never writes them.
import { copyFile, mkdir, readdir, rm, rmdir } from "node:fs/promises";
import path from "node:path";

import { Schema } from "effect";

import { cacheRoot, runInContainer, sdkRoot } from "./container.ts";
import { finish } from "./finish.ts";
import { generatorImage, languageNamed } from "./languages.ts";

const language = languageNamed(Bun.argv[2]);
const output = path.join(sdkRoot, language.name);
const filesList = path.join(output, ".openapi-generator", "FILES");

/** Removes the folders under `folder` that hold nothing, deepest first. */
const removeEmptyFolders = async (folder: string): Promise<boolean> => {
  const entries = await readdir(folder, { withFileTypes: true });

  const removed = await Promise.all(
    entries.map(async (entry) =>
      entry.isDirectory()
        ? await removeEmptyFolders(path.join(folder, entry.name))
        : false
    )
  );

  const empty = removed.every(Boolean);

  if (empty && folder !== output) {
    await rmdir(folder);
  }

  return empty;
};

// Without the document, the generator would fail after the previous run's
// files are gone, and leave the SDK empty.
if (!(await Bun.file(path.join(sdkRoot, "openapi.json")).exists())) {
  throw new Error(
    "packages/peal-sdk/openapi.json is missing: generate through Nx (`bun run sdk:generate`), which writes it first."
  );
}

const previousFiles = Bun.file(filesList);

if (await previousFiles.exists()) {
  const list = await previousFiles.text();
  const listed = list.split("\n").filter((line) => line.trim() !== "");

  await Promise.all(
    listed.map(async (file) => {
      await rm(path.join(output, file), { force: true });
    })
  );
  await removeEmptyFolders(output);
}

const decodeSchemaNames = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      components: Schema.Struct({
        schemas: Schema.Record(Schema.String, Schema.Unknown),
      }),
    })
  )
);

/**
 * Go names each model's constructor New<Model>, so a schema New<X> next to a
 * schema <X> would declare the same name twice. Go's SDK calls it
 * Create<X>Request, as it is the body that creates an <X>.
 */
const goModelNames = async (): Promise<readonly string[]> => {
  const document = decodeSchemaNames(
    await Bun.file(path.join(sdkRoot, "openapi.json")).text()
  );

  const names = new Set(Object.keys(document.components.schemas));

  return [...names]
    .filter(
      (name) => name.startsWith("New") && names.has(name.slice("New".length))
    )
    .toSorted()
    .map((name) => `${name}=Create${name.slice("New".length)}Request`);
};

const configFolder = path.join(cacheRoot, "generator");

await mkdir(configFolder, { recursive: true });

await Bun.write(
  path.join(configFolder, `${language.name}.json`),
  `${JSON.stringify(language.options, null, 2)}\n`
);

const mappings = language.name === "go" ? await goModelNames() : [];

await runInContainer({
  arguments: [
    "generate",
    "--input-spec",
    "/sdk/openapi.json",
    "--generator-name",
    language.generator,
    "--output",
    `/sdk/${language.name}`,
    "--config",
    `/cache/generator/${language.name}.json`,
    "--git-host",
    "github.com",
    "--git-user-id",
    "peal-social",
    "--git-repo-id",
    language.gitRepoId,
    // The generator's tests are empty stubs.
    "--global-property",
    "apiTests=false,modelTests=false",
    ...(language.library === undefined ? [] : ["--library", language.library]),
    ...(mappings.length === 0
      ? []
      : ["--model-name-mappings", mappings.join(",")]),
  ],
  image: generatorImage,
  quiet: true,
  workdir: "/sdk",
});

// Apache-2.0 asks every copy to carry the license and the notice.
await Promise.all(
  ["LICENSE", "NOTICE"].map(async (file) => {
    await copyFile(path.join(sdkRoot, file), path.join(output, file));
  })
);

await finish(language, output);
