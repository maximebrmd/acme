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
peal analytics best-times --channel <channel-id> --days 90 --json
peal analytics export posts --output posts.csv --days 30
```

A thread's counts are its first part's. A number a platform does not give
is `null`, never zero.

`best-times` describes when one channel's posts did best in the past, by
weekday and hour: never a prediction, and never compare one channel's with
another's, as platforms count differently. With `enough: false` the
channel has too few posts and nothing is ranked: say so, rather than pick
an hour. With `counted: false` its platform gives no counts to weigh.

Across the workspaces a person belongs to, `peal overview` says what needs
attention in each, `peal agenda` what goes out, and `peal report` how each
did beside the days before (`--csv report.csv` saves it). They need a person
signed in: a key belongs to one workspace.

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
and posts. The home workspace and the account's totals come with the first
page only; the command prints the one for the next page, with the same
days. A customer offboarded since
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

## Short links

On a server that has short links (`peal short-links status`), a post can
ask for its links to go out shortened: each link written with `http://`
or `https://` and longer than a short address becomes one, per channel,
which counts its clicks. The text kept stays as written, Pinterest, Instagram
and TikTok keep links as written, as does a link to a channel's own
platform, and an edit of a live post sends the text as written.
Without a flag, a post takes the workspace's default (`byDefault` in
`peal short-links status`) when it is made, whatever makes it. Pass
`--shorten-links` when the user wants clicks counted, and
`--no-shorten-links` when links must go out exactly as written:

```sh
peal post "Read https://example.com/a/long/landing/page" --channel <channel-id> --at 2026-11-20T09:00:00Z --shorten-links --json
peal drafts save --text "Read https://example.com/a/long/landing/page" --shorten-links --json
peal post "Read https://example.com/a/long/landing/page" --channel <channel-id> --at 2026-11-20T09:00:00Z --no-shorten-links --json
```

Then read the clicks by UTC day (30 days by default, 92 at most; needs
analytics:read):

```sh
peal short-links list --post <post-id> --json
peal short-links show <link-id> --from 2026-11-01 --to 2026-11-30 --json
```

Counts are approximate: automated readers and link previews are left
out by their names, and nothing about visitors is kept. Say so when you
report them. No command shortens an address outside a post.
