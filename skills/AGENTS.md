# Agent skill

- `skills/peal/` (Apache-2.0, with its own `LICENSE`) is the agent skill, in
  the Agent Skills format: `SKILL.md` under 500 lines, more in
  `references/`. `test/skill.test.ts` checks its frontmatter, that every
  `peal` command line and flag in its code blocks exists, that every HTTP
  path of its curl reference is in the contract, and that the error codes it
  lists are the catalogue's: change a command, the skill and the docs'
  command line page together. The site publishes it at
  `/.well-known/agent-skills/` (a draft's path: index 0.2.0, a `skill-md`
  with its SHA-256), from copies under `packages/peal-site/public/` that
  `bun packages/peal-site/src/write-agent-skills.ts` writes and a test
  keeps equal.
