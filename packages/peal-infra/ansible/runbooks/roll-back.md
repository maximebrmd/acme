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

## Past first comments and polls

The release that sends a post's first comment on Facebook Pages,
Instagram, LinkedIn pages and YouTube, and a post's poll on X, Mastodon
and Threads (`posts.poll`, migration `post-polls`), stores two things the
release before it misreads:

- a poll (`publishing.posts.poll`): the release before ignores the
  column, so the post goes out without it, its question alone, and a
  copy or a recycled occurrence it makes has none; the approval subject
  it writes leaves the poll out, so a post that waits for an approval is
  asked for one again rather than released;
- a first comment (the one part in `follow_ups` on those four
  platforms): the release before takes those platforms for ones that
  take a post alone, so the router refuses the comment
  (`partsNotSupported`) once the post is live, and the channel ends
  **Failed**, the post partly published, never sent again from Peal.
  Scheduling a draft with one refuses it (`tooManyParts`), which the
  member sees, and a recycling rule whose source has one ends at its
  next occurrence (`contentRejected`), for good;
- the flags of first comments (`post_targets.first_comment`,
  `parts_left_out`) and the listing index (`post_targets_listed`, on
  `listed_at`): the release before lists only published targets, so a
  post whose first comment failed is no longer followed by analytics or
  the inbox while it runs, and one a member published without its
  comment reads as published, which it is.

1. **Posts still to go out that ask a poll:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT id FROM publishing.posts WHERE status IN ('scheduled', 'awaitingApproval', 'publishing') AND poll IS NOT NULL"
   ```

2. **Posts still to go out with a first comment:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT DISTINCT p.id FROM publishing.posts p JOIN publishing.post_targets t ON t.post_id = p.id JOIN channels.channels c ON c.id = t.channel_id WHERE p.status IN ('scheduled', 'awaitingApproval', 'publishing') AND NOT t.dropped AND jsonb_array_length(p.follow_ups) > 0 AND c.platform IN ('facebook', 'instagram', 'linkedin', 'youtube')"
   ```

3. **Drafts, and the sources of recycling rules, that ask a poll:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT p.id, p.workspace_id, p.status, r.id AS rule FROM publishing.posts p LEFT JOIN publishing.recycling_rules r ON r.source_post_id = p.id AND r.status IN ('active', 'paused') WHERE p.poll IS NOT NULL AND (p.status = 'draft' OR r.id IS NOT NULL)"
   ```

4. **Recycling rules whose source has a first comment:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT DISTINCT r.id AS rule, r.workspace_id, r.status FROM publishing.recycling_rules r JOIN publishing.posts p ON p.id = r.source_post_id JOIN publishing.post_targets t ON t.post_id = p.id JOIN channels.channels c ON c.id = t.channel_id WHERE r.status IN ('active', 'paused') AND jsonb_array_length(p.follow_ups) > 0 AND c.platform IN ('facebook', 'instagram', 'linkedin', 'youtube')"
   ```

5. **Checks 1 or 2 list a post:** do not roll back yet. Wait until those
   posts have gone out, or have their workspace take them back to draft,
   then run the checks again. Never change the rows by hand.

6. **Checks 3 or 4 list a post or a rule:** while the release before
   runs, a draft scheduled with a poll goes out without it, an active
   rule's next occurrence too, and a rule whose source has a first
   comment ends. Have the workspaces of the active rules listed pause
   them (`PATCH …/recycling/{ruleId}` with `"paused": true`, or **Pause**
   in the web app) and keep the paused ones paused, and tell those of the
   drafts listed not to schedule them until this release is back, as for
   per-channel posts above.

## Past X's pass-through

The release that bills X at X's rates (migration `x-usage-settings`)
writes, on a server that bills only, states the release before cannot
read: a post target failed as `paymentMethodRequired`, `paymentFailed`,
`perAccountPricingRequired`, `xCeilingReached` or `xThreadCut` (in the
target and its attempts), a `PostFailed` notice holding one of those
reasons (a notice outlives its post), and a notice `XSpendCeiling`. The
release before fails to decode each of them on every read: the
workspace's posts and the user's notices answer 500 until the release is
rolled forward. A server that does not bill (production today) writes
none of them, and the new table is ignored.

1. **Targets that failed for X's meter:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT t.post_id, t.id FROM publishing.post_targets t WHERE t.failure_reason IN ('paymentMethodRequired', 'xCeilingReached', 'paymentFailed', 'perAccountPricingRequired', 'xThreadCut') OR EXISTS (SELECT 1 FROM publishing.publication_attempts a WHERE a.target_id = t.id AND a.detail::text ~ 'paymentMethodRequired|xCeilingReached|paymentFailed|perAccountPricingRequired|xThreadCut')"
   ```

2. **Notices of X's ceiling, and failure notices holding those reasons:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT id, workspace_id FROM notifications.notices WHERE kind = 'XSpendCeiling' OR event->>'_tag' = 'XSpendCeiling' OR (event->>'_tag' = 'PostFailed' AND event->>'reason' IN ('paymentMethodRequired', 'xCeilingReached', 'paymentFailed', 'perAccountPricingRequired', 'xThreadCut'))"
   ```

3. **Either lists a row:** do not roll back past this release; release a
   fix forward instead. Never change the rows by hand.

## Past websites and articles

The release that connects WordPress sites and sends articles to them
(migration `articles`) stores what the release before cannot read:

- a channel of a website (`channels.channels.platform = 'wordpress'`):
  the release before reads every channel as a social network's, so the
  workspace's channels, and the jobs that walk every channel (analytics'
  collection, the inbox's, the warnings that a channel must be
  reconnected soon), fail on that row for every workspace;
- the events and notices that name one: a webhook event of a website's
  channel (`channel.connected`…, `article.published`, `article.failed`)
  and a notice that it must be reconnected, which the release before
  fails to decode where it reads them;
- articles (`publishing.articles`, `publishing.article_calls`,
  `publishing.article_files`) and their
  jobs (`PublishArticleV1`), which the release before ignores: an article
  waiting to go out is not sent while it runs.

1. **Channels of websites:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT id, workspace_id FROM channels.channels WHERE platform = 'wordpress'"
   ```

2. **Events and notices that name a website, or an article:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT 'event' AS kind, id FROM webhooks.events WHERE type LIKE 'article.%' OR data->>'platform' = 'wordpress' UNION ALL SELECT 'notice', id FROM notifications.notices WHERE event->'channel'->>'platform' = 'wordpress'"
   ```

3. **Articles waiting to go out:**

   ```sh
   sudo peal-compose exec postgres psql --username peal --dbname peal --command \
     "SELECT id, workspace_id, status FROM publishing.articles WHERE status IN ('scheduled', 'publishing')"
   ```

4. **Checks 1 or 2 list a row:** do not roll back past this release;
   release a fix forward instead. Never change the rows by hand.

5. **Check 3 lists an article, and nothing else does:** rolling back
   leaves it unsent until this release is back, when its job runs, late
   or missed past an hour (`missed`). Tell its workspace, or wait until it
   has gone out.
