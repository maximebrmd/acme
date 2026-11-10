// Checks the API against the last released one, or records a release.
//
//   bun scripts/compat.ts             fails when a client written against
//                                     released/openapi.json could break
//                                     against openapi.json (peal-sdk:spec
//                                     writes it first)
//   bun scripts/compat.ts --release --date 2026-12-01 --title "…"
//                                     after the same check, adds what
//                                     changed to the changelog the API
//                                     serves (peal-contract's
//                                     api-changelog.json), makes
//                                     openapi.json the released document,
//                                     with its SHA-256 beside it, and
//                                     empties the exceptions
//
// released/accepted-changes.json lists the breaking changes that were
// decided on, each with its reason: a change of the API that is not an
// addition goes there on purpose, never by accident. An entry that no
// longer matches a change fails the check too, so the list stays true.
import path from "node:path";

import { Schema } from "effect";

import { apiChanges, lineOf, operationCount } from "./api-changes.ts";

const root = path.join(import.meta.dirname, "..");
const current = path.join(root, "openapi.json");
const released = path.join(root, "released", "openapi.json");
const accepted = path.join(root, "released", "accepted-changes.json");

// The SHA-256 of released/openapi.json, written with it by a release: the
// baseline changes only when a release is recorded.
const fingerprint = path.join(root, "released", "openapi.sha256");

const changelog = path.join(
  root,
  "..",
  "peal-contract",
  "src",
  "api-changelog.json"
);

const decodeDocument = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.JsonObject)
);

const AcceptedSchema = Schema.fromJsonString(
  Schema.Array(
    Schema.Struct({
      // The change, as the check prints it.
      change: Schema.String,
      // Why it was made, and what clients do about it.
      reason: Schema.NonEmptyString,
    })
  )
);

// The changelog's entries, kept as they are: this script only adds one.
const ChangelogSchema = Schema.fromJsonString(Schema.Array(Schema.Json));

const read = async (file: string) => await Bun.file(file).text();

if (!(await Bun.file(current).exists())) {
  throw new Error(
    "packages/peal-sdk/openapi.json is missing: run `nx run peal-sdk:spec`, which this check depends on."
  );
}

const sha256 = (text: string) =>
  new Bun.CryptoHasher("sha256").update(text).digest("hex");

const baseline = await read(released);

// Every document passes against a baseline that lists nothing, and one
// edited by hand no longer is what was released.
if (operationCount(decodeDocument(baseline)) === 0) {
  throw new Error(
    "packages/peal-sdk/released/openapi.json lists no operation: it is not the released API. Restore it from Git."
  );
}

if (sha256(baseline) !== (await read(fingerprint)).trim()) {
  throw new Error(
    "packages/peal-sdk/released/openapi.json is not the document the last release recorded (released/openapi.sha256): only `bun scripts/compat.ts --release` writes it. Restore it from Git."
  );
}

const changes = apiChanges(
  decodeDocument(baseline),
  decodeDocument(await read(current))
);

const exceptions = Schema.decodeUnknownSync(AcceptedSchema)(
  await read(accepted)
);

const breaking = changes.filter(({ kind }) => kind === "breaking").map(lineOf);

const unaccepted = breaking.filter(
  (line) => !exceptions.some(({ change }) => change === line)
);

const stale = exceptions.filter(({ change }) => !breaking.includes(change));

const count = (kind: (typeof changes)[number]["kind"]) =>
  changes.filter((change) => change.kind === kind).length;

console.log(
  `${String(changes.length)} changes since the last release: ${String(count("addition"))} additions, ${String(count("deprecation"))} deprecations, ${String(breaking.length)} breaking (${String(breaking.length - unaccepted.length)} accepted).`
);

if (unaccepted.length > 0) {
  console.error(
    [
      "",
      "These changes could break a client written against the last released API:",
      ...unaccepted.map((line) => `  ${line}`),
      "",
      'The API only grows (the docs\' "API conventions", Versioning): add a field, an operation or a value beside the old one, and deprecate the old one. A break that is decided on goes into packages/peal-sdk/released/accepted-changes.json with its reason.',
    ].join("\n")
  );
}

if (stale.length > 0) {
  console.error(
    [
      "",
      "These accepted changes no longer match any change: remove them from released/accepted-changes.json.",
      ...stale.map(({ change }) => `  ${change}`),
    ].join("\n")
  );
}

if (unaccepted.length > 0 || stale.length > 0) {
  process.exit(1);
}

// The value given after a flag.
const valueOf = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);

  return index === -1 ? undefined : process.argv[index + 1];
};

if (process.argv.includes("--release")) {
  const date = valueOf("--date");
  const title = valueOf("--title");

  if (
    date === undefined ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(date) ||
    title === undefined ||
    title.trim() === ""
  ) {
    throw new Error(
      'A release takes its day and what it is: --release --date 2026-12-01 --title "…"'
    );
  }

  // The operations a release adds or deprecates are named by their id.
  const operationsOf = (kind: "addition" | "deprecation", ending: string) =>
    changes
      .filter((change) => change.kind === kind && change.what.includes(ending))
      .map(({ where }) => where);

  const entries = Schema.decodeUnknownSync(ChangelogSchema)(
    await read(changelog)
  );

  await Bun.write(
    changelog,
    `${JSON.stringify(
      [
        ...entries,
        {
          additions: count("addition"),
          breaking: exceptions,
          date,
          deprecations: operationsOf("deprecation", "is deprecated"),
          operations: operationsOf("addition", "is a new operation"),
          title,
        },
      ],
      null,
      2
    )}\n`
  );

  await Bun.write(released, await read(current));
  await Bun.write(fingerprint, `${sha256(await read(current))}\n`);
  await Bun.write(accepted, "[]\n");

  console.log(
    "Recorded in the changelog: released/openapi.json is now the current document, and the exceptions are empty."
  );
}
