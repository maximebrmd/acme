# Tags, signatures, channel sets, queues and channels' names

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
signature becomes text of the post, under its last part when it has
`--then` parts, counted against each platform's limit, and is never added
twice. A channel without `--options` takes the set's
options, then its default options. Create or change a signature, a set or
default options (`peal signatures create`, `peal sets create`, `peal
channels defaults set`) only when the user asked for it.

## A channel's name, and turning it off

`disabled` means someone turned a channel off, and `peal channels enable`
turns it back on. A channel's `label` is
the name the workspace gave it, beside its `handle`; `--search` finds a
channel by either, and a filter makes `--json` answer a page (`items`,
`nextCursor`, `counts` by status):

```sh
peal channels list --platform youtube --status active --search "client a" --json
peal channels rename <channel-id> "Client A" --json
peal channels disable <channel-id> --json
peal channels enable <channel-id> --json
```

Turn a channel off only when the user asked: nothing is deleted, but a post
that reaches its time on it meanwhile fails there (`channelDisabled`) and is
not sent later. Once it is back on, schedule such a post anew.

## Queues

A queue is a weekly timetable of slots in a time zone. Queue a post when the
user wants it to go out "on the next slot" rather than at a time they name:
Peal decides the slot when the post is sent, the first one free after that
moment, so two posts sent together never take the same one. Preview first,
and say back the slot the post will take:

```sh
peal queues list --json
peal queues preview Weekdays --count 5 --json
peal post "An evergreen tip." --queue --dry-run --json
peal post "An evergreen tip." --queue=Weekdays --json
peal posts queue <post-id> --queue Weekdays --json
peal posts list --queue Weekdays --json
```

- `--queue` alone takes the workspace's default queue; give another with
  `=`, as `--queue=Weekdays`. It replaces `--at` and `--now`. Without
  `--channel` or `--set`, the post goes to the queue's channels.
- `queue_has_no_room` means the queue has no slot (`noSlots`) or every slot
  of the next 366 days is taken (`full`): tell the user, never pick a time
  yourself. A full month in the plan is `plan_limit_reached`.
- `peal queues create` and `update` change what every member's posts are
  queued into: only when the user asked. Changing slots moves no post.
