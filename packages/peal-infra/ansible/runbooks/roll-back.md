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

## Past per-channel posts

The release that gives a channel media of its own on a post and takes one
channel off a scheduled post (`post_targets.dropped`, migration
`post-targets-dropped`) stores two things the release before it misreads:

- an override's `media` (in `text_overrides` and the parts' `overrides`):
  the release before ignores the key, so that channel would get the post's
  own media, never checked for it and not what was approved, and a write of
  the post would drop the key for good; a file only that channel shows
  could be deleted from the library meanwhile;
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

3. **Either one lists a post:** do not roll back yet. Wait until those
   posts have gone out, or have their workspace take them back to draft
   (the web app's **Back to draft**, or `POST …/posts/{postId}/unschedule`),
   then run the checks again. Never change the rows by hand.
