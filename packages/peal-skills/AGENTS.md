# Agent skills

`peal-skills` (Apache-2.0) holds the agent skills, in the Agent Skills
format, one folder each under `skills/`. A skill is installed by copying its
folder, so each keeps its own `LICENSE`. The package has no build: the Nx
project exists so that `peal-cli` and `peal-site`, which read the skills,
depend on it (`implicitDependencies`).

- `skills/peal/` is the agent skill: `SKILL.md` under 500 lines, more in
  `references/`. `packages/peal-cli/test/skill.test.ts` checks its
  frontmatter, that every `peal` command line and flag in its code blocks
  exists, that every HTTP path of its curl reference is in the contract, and
  that the error codes it lists are the catalogue's: change a command, the
  skill and the docs' command line page together. The site publishes it at
  `/.well-known/agent-skills/` (a draft's path: index 0.2.0, a `skill-md`
  with its SHA-256), from copies under `packages/peal-site/public/` that
  `bun packages/peal-site/src/write-agent-skills.ts` writes and a test
  keeps equal.
- A new skill goes in `skills/<name>/` with its own `LICENSE`, in the site's
  `servedSkills` if the site serves it, and in this package's README.
