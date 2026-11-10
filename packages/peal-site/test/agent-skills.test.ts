// The agent skills this site serves for discovery are the repository's
// own, byte for byte, and their index says so: each one's description, as
// its frontmatter gives it, and the SHA-256 of the file as it is served.
// The served files are committed under public/: after changing a skill,
// write them again with
// bun packages/peal-site/src/write-agent-skills.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  descriptionOf,
  indexText,
  servedSkills,
  skillsIndex,
} from "../src/agent-skills.ts";

const repository = path.join(import.meta.dirname, "../../..");

const served = path.join(
  import.meta.dirname,
  "../public/.well-known/agent-skills"
);

const source = (name: string) =>
  readFileSync(path.join(repository, "skills", name, "SKILL.md"));

const servedDocument = (name: string) =>
  readFileSync(path.join(served, name, "SKILL.md"));

const skills = servedSkills.map((name) => ({
  document: servedDocument(name),
  name,
}));

const index = skillsIndex(skills);

describe("the agent skills the site serves", () => {
  it("serves each of the repository's skills as it is", () => {
    for (const name of servedSkills) {
      expect(servedDocument(name).equals(source(name))).toBe(true);
    }
  });

  it("serves the index of what it serves", () => {
    expect(readFileSync(path.join(served, "index.json"), "utf-8")).toBe(
      indexText(skills)
    );
  });

  it("lists the skill as the discovery draft asks", () => {
    const [entry] = index.skills;

    expect(index.$schema).toBe(
      "https://schemas.agentskills.io/discovery/0.2.0/schema.json"
    );
    expect(index.skills).toHaveLength(1);
    expect(Object.keys(entry ?? {}).toSorted()).toStrictEqual([
      "description",
      "digest",
      "name",
      "type",
      "url",
    ]);
    expect(entry?.name).toBe("peal");
    expect(entry?.type).toBe("skill-md");
    expect(entry?.url).toBe("/.well-known/agent-skills/peal/SKILL.md");
  });

  it("gives the digest of the bytes it serves", () => {
    const [entry] = index.skills;

    expect(entry?.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(entry?.digest).toBe(
      `sha256:${createHash("sha256").update(servedDocument("peal")).digest("hex")}`
    );
  });

  it("describes the skill as its frontmatter does", () => {
    const [entry] = index.skills;

    const [, description = ""] =
      /^description: (?<description>.+)$/mu.exec(
        source("peal").toString("utf-8")
      ) ?? [];

    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(entry?.description).toBe(description);
    expect(descriptionOf("no frontmatter")).toBe("");
  });
});
