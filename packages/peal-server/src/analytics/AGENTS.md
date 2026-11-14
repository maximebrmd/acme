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
  it was erased follows none of them after. Stories are not followed:
  `PublishingPublishedPosts` asks the listing to leave them out in its
  query (`without`), so a page is never short before the end.
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
- Facebook Pages read a post in three calls with what Peal asks today
  (`shares`, the reactions edge's `summary=total_count`, the comments
  edge's summary with `filter=stream`), and its views and clicks
  (`post_media_view`, `post_clicks`) only for a Page that granted
  `read_insights`. Threads reads a post's insights for an account that
  granted `threads_manage_insights`, `paused` otherwise. Neither scope is
  asked at sign-in yet: Meta grants both after a review. Both share
  `platforms/meta/graph-read.ts`, where a refused token fails the post and
  never marks the channel.
- X bills the server's app for each post and account a read returns, once
  a UTC day for the same one. Its readers read nothing unless `X_ANALYTICS`
  is true (`#shared/infrastructure/platforms/x-analytics.ts`, which
  publishing's capabilities read too), and claim each read first from
  `PaidReads` (`analytics.paid_reads`: one row a workspace, platform, day
  and resource, under an advisory lock; `X_ANALYTICS_DAILY_READS` a
  workspace and day). What the allowance does not cover is answered `unpaid`, post by post, and waits for its next turn: a spent allowance never halts a channel, whose posts already paid for that day are read on. On a
  server that bills, `PaidReads` is `billedPaidReads` instead (chosen
  once by `BillingMode`): nothing unless the workspace turned its X reads
  on (billing's `XPassThrough`), and each resource new that day claims X's rate
  on the `xApi` meter (`userRead` for `user:<id>`, `postRead` for a
  post) in the locked transaction, the claim's room read first; what the
  meter has no room for (no payment method, the ceiling) is `unpaid` as
  above. A read X then fails is not given back: the day's row stays, so
  it costs nothing more that day. `X_ANALYTICS` stays the operator's
  switch on both, and `X_ANALYTICS_DAILY_READS` applies only where the
  server does not bill. A new
  platform that bills reads goes through `PaidReads` and `BilledReads`.
- Platforms without a reader (Google Business Profile, and LinkedIn
  profiles) answer
  `ChannelUnreadable` `unsupported`: their posts end at their first turn,
  with no warning, and the reports leave them out. The platforms with one
  are `countedPlatforms` (`analytics/domain/counted-platforms.ts`), which
  the contract copies, kept equal by `test/analytics/api/contract.test.ts`,
  so a post's page says the others have no counts. A platform that gains a
  reader joins that list in the same change, or the reader is never asked.
  The list is what Peal can read, not what a server does: the web post
  page (`PostMetrics`) takes the platforms counted from the server's
  capabilities (`GET …/platforms/capabilities`, `analytics.perPost`:
  `countedOn`), so X is named only where `X_ANALYTICS` is on, and falls
  back on the list when it may not read them.
- `CollectMetrics` runs on the `analytics.collect-metrics` cron, hourly at
  minute 7: a post is read every hour for 48 hours, then every day until it
  is 30 days old (`analytics/domain/collection-schedule.ts`), each next read
  counted from the run's scheduled time (`ClusterCron.CurrentScheduledTime`).
- Counts are likes, reposts, replies, and quotes, impressions, clicks, reach
  and saves as Options, each a nullable column of `tracked_posts` and
  `metric_snapshots`: none, where a platform does not give one, is not
  zero, in a total too. Add a count as a nullable column with a decoding
  default (`givenBySome`), so stored snapshots and gate messages still
  decode, and name it in `analytics/domain/analytics-numbers.ts`, which
  says which numbers each platform gives; the contract copies the names,
  and a channel's capabilities list them (`analytics.postCounts`,
  `accountNumbers`). A count is at most
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
- A 401 refuses a channel's token only with the platform's own JSON error
  (`isJsonRefusal`, `#shared/infrastructure/platforms/json-refusal.ts`):
  a page from something on the way halts the read, or is the platform
  not answering, and never marks the channel to reconnect.
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
- `CollectAccounts` runs on the `analytics.collect-accounts` cron, hourly
  at minute 37: it follows every connected channel (the channels context's
  `ChannelDirectory`, ids and platforms only, a page at a time) in
  `analytics.tracked_channels`, and reads each account once a day through
  its gate (`ReadAccount`, `MetricsReader.account`), the ones that waited
  longest first, saving a page in one statement a table. One snapshot a
  channel and UTC day (`analytics.account_snapshots`): the counters read
  that day, and the views and reach the platform counted for a day, which
  a later read revises. A platform that puts a read off is asked again an
  hour later, behind the others; `paused` waits a day, `unsupported` a
  week; a channel found gone is marked (`gone_at`), if its disconnection
  did not mark it already. It stops
  40 minutes after its scheduled time, and sets
  `peal.analytics.accounts.duration`, `.left` and `.unfinished`, which an
  alert rule watches. Account readers live in
  `platforms/accounts/`: only days a platform dates itself are kept
  (LinkedIn's `timeRange`, Pinterest's `date`), never an `end_time` to
  interpret.
- `PurgeAnalytics` runs on the `analytics.retention` cron, daily: posts
  and account days past `retentionOf(platform)`
  (`analytics/domain/analytics-retention.ts`: two years, less where a
  platform's terms cap it, as LinkedIn's, Pinterest's and Google's do),
  the days and the posts of a channel gone `disconnectedKeptFor` (7 days,
  the strictest a platform asks: YouTube's developer policies, III.D.2,
  for a revocation made in the client), and billed reads past 35 days. The
  registry (`retentionPeriods.analytics*`), the privacy policy and the
  docs say the same: change them together. It takes its instant, and its
  Postgres test runs in 1975, before every other suite's rows.
- A post Peal deleted from its platform ends as `removed`
  (`AnalyticsRecords.postRemoved`, told by publishing in the transaction
  that settles the removal): it is read no more, its counts stay, in the
  reports too, and a read that finishes after it saves nothing
  (`saveSchedules` and `saveReadings` leave a `removed` post alone).
- A channel leaves analytics when it leaves its workspace, not when a
  collection finds out: the channels context tells
  `AnalyticsRecords.channelGone` in the transaction that deletes the
  channel (`analyticsChannelEvents`). The row is made if the channel was
  never followed, so its posts are purged with it; it is no longer read,
  and the reports leave its account out (`gone_at IS NULL`). A platform's
  data deletion request erases its numbers at once (`erase`). The same
  account connected to the workspace again within the week takes them
  back under its new channel (`channelBack`, matched by `account_ref`,
  the SHA-256 of the platform and the account's id, kept only while the
  channel is gone). A new place that deletes a channel tells
  `ChannelEvents.disconnected`, or its numbers stay.
- The dashboard (`AnalyticsQueries.dashboard`, put together by the pure
  `dashboardOf`) answers a range beside the one before it
  (`previousRange`), by channel and by platform, with followers
  (`followerChange`: from the last read before the range, or the first in
  it). A range is `days` (7, 30, 90, ending today in the zone) or `from`
  and `to`. Exports stream (`exportRows`, `Stream.paginate` over keyset
  pages of 500; `HttpServerResponse.stream`), as RFC 4180 CSV whose cells
  never start a formula (the shared `csvLine`, `#shared/api/csv.ts`: every text
  quoted, and an apostrophe before one a spreadsheet would take for a
  formula, at its start or after a semicolon, full-width signs included),
  or one JSON object a line. Account days are UTC
  days, written under the range's calendar day of the same name.
  A comparison says whether its range before is still all kept
  (`previousKept`, from `keptSince` with each platform's `retentionOf`):
  the clients show no change where it is not, never one against figures
  the retention job deleted.
- `AnalyticsQueries.acrossWorkspaces` is the report across workspaces:
  the dashboard's reads for several workspaces at once
  (`AnalyticsAcrossReads`, ids as one parameter), each put together by
  `comparisonOf`, which runs `dashboardOf` on that workspace's rows, so a
  workspace's line never differs from its own dashboard
  (`test/analytics/infrastructure/analytics-across.test.ts` asserts it).
  It checks analytics:read of every actor it is given.
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
