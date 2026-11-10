# Analytics

- Analytics follows the targets that publishing's `PublishedTargets`
  (`publishing/application`) lists, from the latest one it follows (see
  below), in `analytics.tracked_posts`, and keeps each reading in
  `analytics.metric_snapshots`: ids and counts, never content. A workspace's
  go with it (`AnalyticsRecords`), and a reading saved after its post was
  erased keeps nothing (`saveReading` updates the post first). Erasing
  records the workspace's id in `analytics.erased_workspaces`, and `track`
  passes those over, under a transaction advisory lock erasures share and
  following holds alone, so a run that listed a workspace's posts before
  it was erased follows none of them after.
- TikTok reads public posts' counts with the Display API's video query, 20
  ids a call, with the channel's token when its scopes include
  `video.list`; a post known by its `publish_id` (not digits) is missing
  without a call.
- Instagram reads each post's media insights (`views`, `likes`,
  `comments`, `shares`), one call a post, on the connection's host, when the
  channel's scopes include its insights permission
  (`instagram_business_manage_insights`, or `instagram_manage_insights`
  through a Page), `paused` otherwise. Code 100 is missing; a rate limit
  halts; any other refusal, the token's included, fails the post and
  halts, so analytics never marks a channel to reconnect for insights it
  may not read.
- Google Business Profile has no reader and gets none: Google withdrew
  local posts' insights (`localPosts.reportInsights`, February 2023) with
  no replacement, and its Performance API counts a location's days, never
  a post.
- LinkedIn reads a company page's posts with
  `organizationalEntityShareStatistics`, one finder call for the posts
  asked, which needs `rw_organization_admin` and the page's ADMINISTRATOR:
  a profile's channel, and a page LinkedIn answers 403 for, are
  `unsupported`. Clients say "LinkedIn pages" where they list the counted
  platforms.
- Platforms without a reader (X, Threads and Facebook Pages so
  far) answer
  `ChannelUnreadable` `unsupported`: their posts end at their first turn,
  with no warning, and the reports leave them out. The platforms with one
  are `countedPlatforms` (`analytics/domain/counted-platforms.ts`), which
  the contract copies, kept equal by `test/analytics/api/contract.test.ts`,
  so a post's page says the others have no counts. A platform that gains a
  reader joins that list in the same change, or the reader is never asked.
- `CollectMetrics` runs on the `analytics.collect-metrics` cron, hourly at
  minute 7: a post is read every hour for 48 hours, then every day until it
  is 30 days old (`analytics/domain/collection-schedule.ts`), each next read
  counted from the run's scheduled time (`ClusterCron.CurrentScheduledTime`).
- Counts are likes, reposts, replies, and quotes and impressions as Options:
  none, where a platform does not give one, is not zero. A count is at most
  2^31 − 1 (`maxCount`), what its column holds: a server saying more fails
  to decode, rather than fail the run's insert.
- Reads go through the `MetricsReader` port. `GatedMetricsReader` sends each
  one, 25 posts at most, through the channel's `ChannelGate` (`ReadMetrics`),
  whose handler runs the readers in `analytics/infrastructure/platforms/`:
  reads take turns with publishing. `publishingWorkers` takes the readers;
  publishing's tests get `UnreadMetrics`.
- Mastodon reads one status at a time, with the channel's token from
  `ChannelAccess` when its scopes include `read:statuses` (asked since
  analytics; an app registered without it is registered again), without one
  otherwise. A read stops at 429, 60 requests left or 30 seconds, or at a
  post it failed on (an error, no answer, or one that does not decode). Only
  a 401 or 403 with Mastodon's JSON error refuses the token: a proxy's page
  must not mark the channel to reconnect, which stops its publishing.
  Bluesky reads the public AppView's `getPosts` without the session, whose
  scope stays what posting needs. YouTube reads `videos.list` statistics,
  50 ids a call, with the channel's token (`youtube.readonly`): views are
  impressions, comments replies, reposts 0; only a 401 with Google's JSON
  error refuses the token, and a 403 (quota) or 429 halts the read.
  Pinterest reads pins/analytics, one Pin a call (60 a minute for each
  account with Standard access), over the 90 days up to today: impressions,
  saves as reposts, reactions as likes and comments as replies, no quotes;
  a 404 is a missing Pin, a 429 halts, and only a 401 with Pinterest's own
  error refuses the token.
- A halted read leaves the rest due for the next run; a missing post, one a
  read `failed` on (so one the server cannot show never stays first due),
  or a channel off or to reconnect, waits for its next turn; a disconnected
  channel's posts, and a post still unread a day past its window, end.
- Each run follows the publications after the latest one it follows, then
  looks back 15 minutes for those that settled late, 20 pages of 500 each
  at most, so it moves on however many went live together. It then reads
  every post due, with no cap: a page of 500 channels at a time, those
  whose post waited longest first and each channel once a run
  (`TrackedPosts.dueChannels`, then `dueOn`: 1,000 posts a channel at
  most), so a channel put off, or a platform that is down, never holds the
  others back. `CollectionPaceRef` paces it: 16 channels at once
  (`PEAL_ANALYTICS_CONCURRENCY`), each one call at a time through its
  gate, and no read starts later than 50 minutes after the run's scheduled
  time. What a read found is saved in one statement a table
  (`saveReadings`, `saveSchedules`), never a transaction a post. A run
  sets `peal.analytics.collection.duration` and `.left`, and one out of
  time logs a warning and counts in `.unfinished`.
- Summaries take the posts published over a range of days in an IANA zone:
  the domain computes each day's start with `fromWallClock`, and Postgres
  buckets snapshots with those instants (`width_bucket`), never its zones.
- Test `CollectMetrics` on the in-memory store
  (`test/analytics/fakes/memory-tracked-posts.ts`). Postgres tests write under
  a workspace of their own, at instants no other suite uses, and delete it
  after (`forgetWorkspace`): the collection reads every row that is due.
  Run it on Postgres on the real clock, at an instant earlier than every
  other suite's (`collection-scale.test.ts`): a virtual clock set decades
  back replays every tick of the pool's timers and never returns.
