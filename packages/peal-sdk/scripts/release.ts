// Reads a release tag, sdk-<language>-v<version>:
// `bun scripts/release.ts sdk-python-v0.1.0`. It refuses a tag whose version
// is not the one scripts/languages.ts gives the language, so a tag never
// publishes a package whose manifest says another version. In GitHub
// Actions, it hands the language and the version to the next steps.
import { appendFile } from "node:fs/promises";

import { languageNamed } from "./languages.ts";

const tag = Bun.argv[2] ?? "";

const parts =
  /^sdk-(?<language>[a-z]+)-v(?<version>\d+\.\d+\.\d+(?:-[\d.A-Za-z-]+)?)$/u.exec(
    tag
  )?.groups;

const { language: name, version } = parts ?? {};

if (name === undefined || version === undefined) {
  throw new Error(
    `A release tag reads sdk-<language>-v<version>, not "${tag}".`
  );
}

const language = languageNamed(name);

if (language.version !== version) {
  throw new Error(
    `${tag} releases ${language.name} ${version}, but scripts/languages.ts gives it ${language.version}: change it there, regenerate, and tag that commit.`
  );
}

const outputs = process.env["GITHUB_OUTPUT"];

if (outputs !== undefined) {
  await appendFile(outputs, `language=${language.name}\nversion=${version}\n`);
}

process.stdout.write(`${language.name} ${version}\n`);
