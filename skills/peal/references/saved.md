# Tags, signatures and channel sets

What a workspace saves to file and write its posts with, from the command
line. Read [SKILL.md](../SKILL.md) first: its rules about drafts,
scheduling and publishing apply here unchanged.

## Tags

A workspace files its posts under tags, which say nothing to the platforms.
A tag is named by its id or its name:

```sh
peal tags list --json
peal tags create "Spring campaign" --colour green --json
peal drafts save --post <post-id> --tag "Spring campaign" --json
peal posts tag <post-id> --tag "Spring campaign" --json
peal posts list --tag "Spring campaign" --json
```

`posts tag` sets a post's tags, whatever its status, instead of those it
had; without `--tag` it takes them all off. `drafts save --post` keeps a
draft's tags unless `--tag` is given.

## Signatures, channel sets and default options

A workspace also saves signatures (texts to end posts with), channel sets
(selections of channels under a name) and a channel's default options. A
signature and a set are named by id or by name:

```sh
peal signatures list --json
peal sets list --json
peal channels defaults show <channel-id> --json
peal drafts save --text "Spring catalogue is out" --set Launch --default-signatures --json
peal post "Spring catalogue is out" --set Launch --signature "Sign-off" --at 2026-11-20T09:00:00Z --json
```

`--set` stands for the set's connected channels, so `peal post` needs no
`--channel` with it. A channel of the set that is no longer connected is
left out: the answer says so in `warnings`, and the user should hear it. A
signature becomes text of the post, counted against each platform's limit,
and is never added twice. A channel without `--options` takes the set's
options, then its default options. Create or change a signature, a set or
default options (`peal signatures create`, `peal sets create`, `peal
channels defaults set`) only when the user asked for it.
