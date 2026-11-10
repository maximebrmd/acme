// Writes what the site serves under /.well-known/agent-skills from the
// repository's skills: each skill's SKILL.md as it is, and the index with
// its digest. Run it after changing a skill:
// bun packages/peal-site/src/write-agent-skills.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  indexText,
  servedSkills,
  skillDocument,
  skillsRoot,
} from "./agent-skills.ts";

const repository = path.join(import.meta.dirname, "../../..");
const served = path.join(import.meta.dirname, "../public", skillsRoot);

const skills = servedSkills.map((name) => ({
  document: readFileSync(path.join(repository, "skills", name, skillDocument)),
  name,
}));

for (const { document, name } of skills) {
  mkdirSync(path.join(served, name), { recursive: true });
  writeFileSync(path.join(served, name, skillDocument), document);
}

writeFileSync(path.join(served, "index.json"), indexText(skills));
