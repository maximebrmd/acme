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

## Usage per customer

For a workspace with a partner account (owners and admins, partner:read):
what the account used across every workspace it holds, then a page of its
workspaces, each with the partner's external id, its channels, channel-days
and posts. The home workspace comes first, on the first page only; pass the
page's `next` as `--before` for the next one. A customer offboarded since
is no longer listed, and its posts leave the sums. Counts only, never
prices.

```sh
peal partner usage --from 2026-11-01 --to 2026-11-30 --json
peal partner usage --limit 100 --before <next> --json
```

A partner's own backend reads the same with its partner key (scope
workspaces:read), which the command line never holds:

```sh
curl -sS -H "Authorization: Bearer $PEAL_PARTNER_KEY" \
  "$PEAL_API_URL/api/partner/usage?from=2026-11-01&to=2026-11-30"
```
