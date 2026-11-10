// Writes what the site serves under /.well-known/agent-skills from the
// repository's skills: each skill's SKILL.md as it is, the files it links
// to, and the index with its digest. Run it after changing a skill:
// bun packages/peal-site/src/write-agent-skills.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  indexText,
  linkedFiles,
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

  for (const linked of linkedFiles(document.toString("utf-8"))) {
    mkdirSync(path.dirname(path.join(served, name, linked)), {
      recursive: true,
    });
    writeFileSync(
      path.join(served, name, linked),
      readFileSync(path.join(repository, "skills", name, linked))
    );
  }
}

writeFileSync(path.join(served, "index.json"), indexText(skills));
