# Reports

What went out and how it did, from the command line. Read
[SKILL.md](../SKILL.md) first: its rules apply here unchanged.

## Analytics

Counts, once a post is live:

```sh
peal analytics post <post-id> --json
peal analytics summary --from 2026-11-01 --to 2026-11-30 --json
peal analytics dashboard --days 30 --json
peal analytics channel <channel-id> --days 30 --json
peal analytics export posts --output posts.csv --days 30
```

A thread's counts are its first part's. A number a platform does not give
is `null`, never zero.

## Usage

What the workspace used of its plan, by UTC day (posts that went out,
channels, channel-days; counts only, never prices; needs billing:read):

```sh
peal usage --from 2026-11-01 --to 2026-11-30 --json
```
