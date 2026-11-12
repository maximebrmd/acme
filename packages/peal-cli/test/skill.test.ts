import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { errorCatalogue } from "peal-contract/errors";

import { commandPaths, usageOf } from "./command-tree.ts";
import { contractEndpoints, pathPattern } from "./contract-endpoints.ts";

// The agent skill in packages/peal-skills/skills/peal teaches the command line and the API: it
// stays true only while every command, flag, path and code it names
// exists. This reads it as an agent would, and checks each against the
// command tree and the contract.

const skillFolder = path.join(
  import.meta.dirname,
  "../../peal-skills/skills/peal"
);

const read = (file: string): string =>
  readFileSync(path.join(skillFolder, file), "utf-8");

const skill = read("SKILL.md");

const references = readdirSync(path.join(skillFolder, "references")).flatMap(
  (file) => (file.endsWith(".md") ? [`references/${file}`] : [])
);

const documents = ["SKILL.md", ...references];

// The frontmatter: `key: value` lines, and one level of them under a key
// that has no value (`metadata:`).
const frontmatterOf = (text: string) => {
  const [, block = ""] = /^---\n(?<block>[\s\S]*?)\n---\n/u.exec(text) ?? [];
  const top = new Map<string, string>();
  const nested = new Map<string, Map<string, string>>();
  let parent = "";

  for (const line of block.split("\n")) {
    const found = /^(?<indent>\s*)(?<key>[A-Za-z-]+):\s*(?<value>.*)$/u.exec(
      line
    );

    const { indent = "", key = "", value = "" } = found?.groups ?? {};
    const unquoted = value.replace(/^"(?<inner>.*)"$/u, "$<inner>");

    if (indent === "" && value === "") {
      parent = key;
      nested.set(key, new Map());
    } else if (indent === "") {
      top.set(key, unquoted);
    } else {
      nested.get(parent)?.set(key, unquoted);
    }
  }

  return { nested, top };
};

// What a fenced block holds, a command on each line: a line ending with a
// backslash goes on with the next.
const commandLines = (text: string): string[] =>
  [...text.matchAll(/```[a-z]*\n(?<body>[\s\S]*?)```/gu)].flatMap((block) =>
    (block.groups?.["body"] ?? "")
      .replaceAll(/\\\n\s*/gu, " ")
      .split("\n")
      .map((line) => line.trim())
  );

// A command line's words, as a shell splits them: quotes group, and go;
// `$'…'` (ANSI-C quoting) is one word too.
const wordsOf = (line: string): string[] =>
  [
    ...line.matchAll(
      /\$'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|'[^']*'|[^\s"']+/gu
    ),
  ].map(([word]) =>
    word
      .replace(/^\$'(?<inner>[\s\S]*)'$/u, "$<inner>")
      .replace(/^(?<quote>["'])(?<inner>[\s\S]*)\k<quote>$/u, "$<inner>")
  );

const everyLine = documents.flatMap((file) =>
  commandLines(read(file)).map((line) => ({ file, line }))
);

const pealLines = everyLine.filter(({ line }) => line.startsWith("peal "));
const curlLines = everyLine.filter(({ line }) => line.startsWith("curl "));

// The command a line names: the longest path of the tree its words start
// with, and the words left.
const commandOf = (words: readonly string[]) => {
  const length = [3, 2, 1].find((count) =>
    commandPaths.includes(words.slice(0, count).join(" "))
  );

  return length === undefined
    ? undefined
    : { command: words.slice(0, length).join(" "), rest: words.slice(length) };
};

// What is wrong with a line's flags and arguments, for the command it names.
const problemsOf = (line: string) =>
  Effect.gen(function* problems() {
    const found = commandOf(wordsOf(line).slice(1));

    if (found === undefined) {
      return [`${line}: no such command`];
    }

    const usage = yield* usageOf(found.command);
    const wrong: string[] = [];
    let given = 0;
    let skip = false;

    for (const word of found.rest) {
      const [flag = ""] = word.split("=");

      if (skip) {
        skip = false;
      } else if (!word.startsWith("-")) {
        given += 1;
      } else if (usage.flags.has(flag)) {
        skip = !usage.switches.has(flag) && !word.includes("=");
      } else {
        wrong.push(`${line}: ${found.command} takes no ${flag}`);
      }
    }

    const required = usage.arguments.filter((argument) => argument.required);

    const most = usage.arguments.some(({ variadic }) => variadic)
      ? Number.POSITIVE_INFINITY
      : usage.arguments.length;

    if (given < required.length || given > most) {
      wrong.push(
        `${line}: ${found.command} takes ${String(usage.arguments.length)} arguments, not ${String(given)}`
      );
    }

    return wrong;
  });

const decodeStatus = Schema.decodeUnknownSync(Schema.NumberFromString);

describe("the peal skill", () => {
  it("has the frontmatter the Agent Skills format asks for", () => {
    const { nested, top } = frontmatterOf(skill);
    const name = top.get("name") ?? "";
    const description = top.get("description") ?? "";
    const compatibility = top.get("compatibility") ?? "";

    assert.isTrue(skill.startsWith("---\n"));
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    assert.isAtMost(name.length, 64);
    assert.strictEqual(name, path.basename(skillFolder));
    assert.isAbove(description.length, 0);
    assert.isAtMost(description.length, 1024);
    assert.match(description, /Use when /u);
    assert.isAbove(compatibility.length, 0);
    assert.isAtMost(compatibility.length, 500);
    assert.strictEqual(top.get("license"), "Apache-2.0");
    assert.include(read("LICENSE"), "Apache License");

    for (const key of [...top.keys(), ...nested.keys()]) {
      assert.include(
        [
          "name",
          "description",
          "license",
          "compatibility",
          "metadata",
          "allowed-tools",
        ],
        key
      );
    }

    assert.deepStrictEqual([...nested.keys()], ["metadata"]);
    assert.isAbove(nested.get("metadata")?.size ?? 0, 0);
  });

  it("stays short, and links only to files it has, one level deep", () => {
    assert.isBelow(skill.split("\n").length, 500);

    const linked = [...skill.matchAll(/\]\((?<target>[^)#]+)\)/gu)].flatMap(
      (link) => {
        const target = link.groups?.["target"] ?? "";

        return target.startsWith("http") ? [] : [target];
      }
    );

    assert.isAbove(linked.length, 0);

    for (const target of linked) {
      assert.match(target, /^references\/[a-z-]+\.md$/u);
      assert.include(references, target);
    }
  });

  it.effect("names only commands that exist, with flags they take", () =>
    Effect.gen(function* commands() {
      assert.isAbove(pealLines.length, 25);

      const wrong: string[] = [];

      for (const { file, line } of pealLines) {
        for (const problem of yield* problemsOf(line)) {
          wrong.push(`${file}: ${problem}`);
        }
      }

      assert.deepStrictEqual(wrong, []);
    })
  );

  it.effect("would catch a command, a flag or an argument that is not", () =>
    Effect.gen(function* catches() {
      assert.deepStrictEqual(
        yield* problemsOf("peal posts show <post-id> --json"),
        []
      );
      assert.lengthOf(yield* problemsOf("peal posts get <post-id>"), 1);
      assert.lengthOf(
        yield* problemsOf("peal posts show <post-id> --dry-run"),
        1
      );
      assert.lengthOf(yield* problemsOf("peal posts show"), 1);
      assert.lengthOf(yield* problemsOf("peal nothing"), 1);
    })
  );

  it("calls only paths the contract has, with their method", () => {
    assert.isAbove(curlLines.length, 15);

    const unknown = curlLines.flatMap(({ file, line }) => {
      const words = wordsOf(line);
      const method = words[words.indexOf("-X") + 1];
      const address = words.find((word) => word.startsWith("$PEAL_API_URL"));

      const [called = ""] = (address ?? "")
        .replace("$PEAL_API_URL", "")
        .split("?");

      const wanted = {
        method: words.includes("-X") ? method : "GET",
        path: pathPattern(called),
      };

      return contractEndpoints.some(
        (endpoint) =>
          endpoint.method === wanted.method && endpoint.path === wanted.path
      )
        ? []
        : [`${file}: ${String(wanted.method)} ${called}`];
    });

    assert.deepStrictEqual(unknown, []);
  });

  it("lists only error codes the API has, with their status", () => {
    const [, table = ""] =
      /\n#+ Error codes\n\n(?<table>(?:\|.*\n)+)/u.exec(skill) ?? [];

    const rows = [
      ...table.matchAll(/^\| `(?<code>[a-z_]+)`\s*\| (?<status>\d{3})\s/gmu),
    ].map((row) => ({
      code: row.groups?.["code"] ?? "",
      status: decodeStatus(row.groups?.["status"] ?? ""),
    }));

    const known = errorCatalogue().map(({ code, status }) => ({
      code,
      status,
    }));

    assert.isAbove(rows.length, 10);

    for (const row of rows) {
      assert.deepInclude(known, row);
    }
  });
});
