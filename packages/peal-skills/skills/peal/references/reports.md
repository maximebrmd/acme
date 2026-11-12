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

## Short links

On a server that has short links (`peal short-links status`), a post can
ask for its links to go out shortened: each link written with `http://`
or `https://` and longer than a short address becomes one, per channel,
which counts its clicks. The text kept stays as written, Pinterest keeps
links as written, and an edit of a live post sends the text as written.
Ask only when the user wants clicks counted:

```sh
peal post "Read https://example.com/a/long/landing/page" --channel <channel-id> --at 2026-11-20T09:00:00Z --shorten-links --json
peal drafts save --text "Read https://example.com/a/long/landing/page" --shorten-links --json
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
