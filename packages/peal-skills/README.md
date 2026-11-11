# Agent skills

This package holds skills in the [Agent Skills](https://agentskills.io) format:
instructions an AI agent loads when a task calls for them.

- [`skills/peal/`](skills/peal/SKILL.md) teaches an agent to use Peal safely, through the
  `peal` command line and the HTTP API: signing in or using a workspace API
  key, drafting, scheduling and publishing posts, reading how they went, and
  handling errors and rate limits.

To install one, copy its folder to where your agent reads skills. Peal's
site also serves it for discovery, at
`https://peal.social/.well-known/agent-skills/index.json`.

## Licence

The skills are under the Apache License 2.0, unlike most of the repository:
each has its own `LICENSE`, so anyone may install, change and share them.

## Keeping them true

[`packages/peal-cli/test/skill.test.ts`](../peal-cli/test/skill.test.ts) checks every `peal` command and flag,
every HTTP path and every error code a skill names against the command line
and the API's contract. Change a skill and the command line together.
