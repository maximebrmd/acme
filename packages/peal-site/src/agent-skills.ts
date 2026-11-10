import { createHash } from "node:crypto";

// The agent skills this site serves for discovery ("Agent Skills Discovery
// via Well-Known URIs", version 0.2.0): an index at
// /.well-known/agent-skills/index.json, and each skill's SKILL.md beside
// it. A skill is published as its single SKILL.md (`skill-md`), which is
// written to be enough on its own.
//
// The skills live in the repository's skills/ folder, under their own
// licence. The site builds from its own folder alone, so what it serves is
// committed under public/.well-known/agent-skills, written from the skills
// by `bun packages/peal-site/src/write-agent-skills.ts`.
// test/agent-skills.test.ts fails while those files are stale.

/** The discovery draft's schema for the index. */
export const indexSchema =
  "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

/** Where the index and the skills are served, and kept under public/. */
export const skillsRoot = "/.well-known/agent-skills";

/** The file every skill is served as. */
export const skillDocument = "SKILL.md";

/** The skills served, by the name of their folder in skills/. */
export const servedSkills = ["peal"] as const;

/** The description a SKILL.md's frontmatter gives. */
export const descriptionOf = (document: string): string => {
  const [, frontmatter = ""] = /^---\n(?<block>[\s\S]*?)\n---\n/u.exec(
    document
  ) ?? [""];

  const [, description = ""] = /^description:[ \t]*(?<description>.+)$/mu.exec(
    frontmatter
  ) ?? [""];

  return description.trim();
};

/** The SHA-256 of a served file's bytes, as the index writes it. */
export const digestOf = (served: Uint8Array): string =>
  `sha256:${createHash("sha256").update(served).digest("hex")}`;

/** A skill as it is served: its name, and its SKILL.md's bytes. */
export interface ServedSkill {
  readonly document: Uint8Array;
  readonly name: string;
}

/** The index: one entry for each skill, with the digest of what is served. */
export const skillsIndex = (skills: readonly ServedSkill[]) => ({
  $schema: indexSchema,
  skills: skills.map(({ document, name }) => ({
    description: descriptionOf(new TextDecoder().decode(document)),
    digest: digestOf(document),
    name,
    type: "skill-md",
    url: `${skillsRoot}/${name}/${skillDocument}`,
  })),
});

/** The index as the file served holds it. */
export const indexText = (skills: readonly ServedSkill[]): string =>
  `${JSON.stringify(skillsIndex(skills), null, 2)}\n`;
