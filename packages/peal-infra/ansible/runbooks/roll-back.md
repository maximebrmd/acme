# Roll back a release

To roll back, release the previous commit (`release.yml`, as the
[README](../README.md#releases) says). Migrations do not run backwards: the
previous release runs against the database this one migrated. Some
releases store what the one before ignores or cannot read; before rolling
back past one of them, run its checks below, and roll back only once they
find nothing.

Run every command on the server, as `ops`, through the tunnel
(`ssh ops@ssh.peal.social`, or `ssh ops@sandbox-ssh.peal.social` for the
sandbox). The checks only read.

A roll-back that also restores the database (`restore-database.md`) turns
the media sweeps off first, as that runbook's step 7 says: the restored
database does not know the files uploaded after its restore point. A
roll-back of the release alone leaves them on; a release older than the
media sweeps has none, and ignores `PEAL_MEDIA_SWEEPS`.

## Past per-channel posts

The release that gives a channel media of its own on a post and takes one
channel off a scheduled post (`post_targets.dropped`, migration
`post-targets-dropped`) stores two things the release before it misreads:

- an override's `media` (in `text_overrides` and the parts' `overrides`):
  the release before ignores the key, so that channel would get the post's
  own media, never checked for it and not what was approved, and a write of
  the post, a copy or a recycled occurrence would drop the key for good; a
  file only that channel shows could be deleted from the library
  meanwhile;
- a target taken off its post (`dropped`): the release before counts it in
  the post's outcome (`partiallyPublished` for a post that went out
  everywhere else), fails the claim of a missed post that has one, and
  keeps it on a draft.

1. **Posts still to go out that give a channel media of its own:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT id FROM publishing.posts WHERE status IN ('scheduled', 'awaitingApproval', 'publishing') AND (text_overrides @? '\$[*].media' OR follow_ups @? '\$[*].overrides[*].media')"
   ```

2. **Posts still to go out with a channel taken off:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT DISTINCT p.id FROM publishing.posts p JOIN publishing.post_targets t ON t.post_id = p.id WHERE t.dropped AND p.status IN ('scheduled', 'awaitingApproval', 'publishing')"
   ```

3. **Drafts, and the sources of recycling rules, that give a channel media
   of its own:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT p.id, p.workspace_id, p.status, r.id AS rule FROM publishing.posts p LEFT JOIN publishing.recycling_rules r ON r.source_post_id = p.id AND r.status IN ('active', 'paused') WHERE (p.text_overrides @? '\$[*].media' OR p.follow_ups @? '\$[*].overrides[*].media') AND (p.status = 'draft' OR r.id IS NOT NULL)"
   ```

4. **Checks 1 or 2 list a post:** do not roll back yet. Wait until those
   posts have gone out, or have their workspace take them back to draft
   (the web app's **Back to draft**, or `POST …/posts/{postId}/unschedule`),
   then run the checks again. A post taken back to draft moves to check 3.
   Never change the rows by hand.

5. **Check 3 lists a post:** checks 1 and 2 only cover posts already on
   their way. While the release before runs, anything scheduled, duplicated
   or recycled from content with a channel's own media sends the post's
   own media to that channel, and a copy loses that channel's media for
   good; an active rule does so on its next occurrence with nobody acting.
   Before rolling back, have the workspaces of the active rules listed
   pause them (`PATCH …/recycling/{ruleId}` with `"paused": true`, or
   **Pause** in the web app) and keep the paused ones paused, and tell the
   workspaces of the drafts listed not to schedule or duplicate them until
   this release is back. Keep the roll-back short, and run the checks
   again before releasing this one once more.

## Past X's pass-through

The release that bills X at X's rates (migration `x-usage-settings`)
writes, on a server that bills only, two states the release before cannot
read: a post target failed as `paymentMethodRequired` or
`xCeilingReached`, and a notice `XSpendCeiling`. The release before fails
to decode a post or a notice holding one. A server that does not bill
(production today) writes neither, and the new table is ignored.

1. **Targets that failed for X's meter:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT t.post_id, t.id FROM publishing.post_targets t WHERE t.failure_reason IN ('paymentMethodRequired', 'xCeilingReached') OR EXISTS (SELECT 1 FROM publishing.publication_attempts a WHERE a.target_id = t.id AND (a.detail::text LIKE '%paymentMethodRequired%' OR a.detail::text LIKE '%xCeilingReached%'))"
   ```

2. **Notices of X's ceiling:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT id, workspace_id FROM notifications.notices WHERE kind = 'XSpendCeiling' OR event->>'_tag' = 'XSpendCeiling'"
   ```

3. **Either lists a row:** do not roll back past this release; release a
   fix forward instead. Never change the rows by hand.
