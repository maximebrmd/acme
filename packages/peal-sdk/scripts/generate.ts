// Generates one language's SDK from openapi.json:
// `bun scripts/generate.ts <language>`. Fern's CLI runs the language's
// generator in Docker and replaces the SDK's folder with what it writes,
// keeping only the files the folder's .fernignore names, which are ours. The
// SDKs' license and notice then go in, and scripts/finish.ts fills what the
// generator leaves out of the package's manifest.
import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { $ } from "bun";
import { Schema } from "effect";

import { cacheRoot, sdkRoot, workspaceRoot } from "./container.ts";
import { finish } from "./finish.ts";
import { languageNamed } from "./languages.ts";

const language = languageNamed(Bun.argv[2]);
const { generator } = language;
const output = path.join(sdkRoot, language.name);
const specification = path.join(sdkRoot, "openapi.json");

// Fern would empty the SDK's folder and then fail without the document.
if (!(await Bun.file(specification).exists())) {
  throw new Error(
    "packages/peal-sdk/openapi.json is missing: generate through Nx (`bun run sdk:generate`), which writes it first."
  );
}

const cliFolder = path.join(workspaceRoot, "node_modules", "fern-api");

const decodeCliManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ version: Schema.String }))
);

// A fern.config.json naming another version makes the CLI download that one.
const cliVersion = decodeCliManifest(
  await Bun.file(path.join(cliFolder, "package.json")).text()
).version;

// A Fern workspace per language, so Nx can run the eight at once. Fern wants
// the paths in generators.yml relative to it.
const fernFolder = path.join(cacheRoot, "fern", language.name, "fern");

await mkdir(fernFolder, { recursive: true });

await Bun.write(
  path.join(fernFolder, "fern.config.json"),
  `${JSON.stringify({ organization: "peal", version: cliVersion }, null, 2)}\n`
);

// JSON is YAML, which generators.yml is.
await Bun.write(
  path.join(fernFolder, "generators.yml"),
  `${JSON.stringify(
    {
      api: {
        specs: [{ openapi: path.relative(fernFolder, specification) }],
      },
      groups: {
        [language.name]: {
          generators: [
            {
              config: generator.config,
              name: generator.image,
              output: {
                location: "local-file-system",
                path: path.relative(fernFolder, output),
              },
              version: generator.version,
            },
          ],
        },
      },
    },
    null,
    2
  )}\n`
);

// Fern runs <image>:<version>, which Docker takes from its own images when it
// has one: the pinned image goes there under that name.
const pinned = `${generator.image}@${generator.digest}`;

await $`docker pull --quiet ${pinned}`.quiet();

await $`docker tag ${pinned} ${generator.image}:${generator.version}`;

// Fern copies the SDK's folder, builds included (a Rust `target/` weighs
// gigabytes), into temporary folders it never deletes: it gets a folder of
// its own, emptied before and after each run, even one that failed or was
// killed.
const temporaryFolder = path.join(cacheRoot, "fern", language.name, "tmp");

const removeTemporaryFolder = async () => {
  await rm(temporaryFolder, { force: true, recursive: true });
};

await removeTemporaryFolder();

await mkdir(temporaryFolder, { recursive: true });

// --generate-tests makes Fern write the whole project (manifest, build
// files, its unit tests) rather than the client's source alone.
const result = await (async () => {
  try {
    return await $`node ${path.join(cliFolder, "cli.cjs")} generate --local --group ${language.name} --version ${language.version} --generate-tests --force --no-prompt --log-level warn`
      .cwd(path.dirname(fernFolder))
      .env({
        ...process.env,
        FERN_DISABLE_AUTO_BOOTSTRAP: "true",
        FERN_DISABLE_TELEMETRY: "true",
        FERN_DISABLE_UPGRADE_CHECK: "true",
        FERN_NO_VERSION_REDIRECTION: "true",
        FERN_TELEMETRY_DISABLED: "true",
        TMPDIR: temporaryFolder,
      })
      .quiet()
      .nothrow();
  } finally {
    await removeTemporaryFolder();
  }
})();

if (result.exitCode !== 0) {
  process.stderr.write(result.stdout);
  process.stderr.write(result.stderr);
  throw new Error(`Fern could not generate the ${language.name} SDK`);
}

// Apache-2.0 asks every copy to carry the license and the notice.
await Promise.all(
  ["LICENSE", "NOTICE"].map(async (file) => {
    await copyFile(path.join(sdkRoot, file), path.join(output, file));
  })
);

await finish(language, output);
