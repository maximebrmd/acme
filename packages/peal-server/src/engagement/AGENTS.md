# Engagement (the inbox)

- The context is `engagement`; the product, the API group and the pages
  say "inbox" (`/api/workspaces/:workspaceId/inbox`, `peal inbox`,
  `…/inbox`), as "notices" already names a user's notifications. This
  slice is comments on posts Peal published; direct messages, mentions and
  reviews will build on it. Nothing here answers by itself: no automation,
  and no assistant prompt ever reads a comment.
- A `Thread` is the comments under one published target; a `Comment` is
  what its platform gave (its id there, the comment it answers, its
  author's id, handle and display name, plain text, when); a `Reply` is
  what a member sent. Comments are other people's personal data: read
  nothing more of an author, use comments only to show and answer them,
  and never put a comment's text or author in a log, a trace, a notice, a
  webhook event or the cluster tables. `forgetComment` erases text and
  author once the platform no longer shows a comment (a complete read
  that misses it, or a post gone), which a table check enforces.
- Retention: comments are read for `defaultWindow` (30 days,
  `PEAL_ENGAGEMENT_WINDOW_DAYS`, 90 at most) after a post went live, and a
  thread is deleted `keptAfterCollection` (30 days) after its collection
  ended (`engagement.retention` cron, `PurgeEngagement`). The contract
  copies both (`inboxWindowDays`, `inboxRetentionDays`), the registry
  states them (`inbox` in `peal-contract/data-processing`), and the
  privacy policy's table and the docs' Inbox page follow: change them
  together. A platform may bound how long what it gives is kept without
  being read again: the gate puts its bound on every batch
  (`refreshWithin`, from `keptWithoutRefresh` in
  `platform-engagement.ts`; YouTube's 29 days), `recordCollection` stamps
  the thread's `refresh_by` at each read, and `PurgeEngagement.forgetExpired`
  (hourly, `engagement.refresh-bound`, and before each daily purge)
  forgets, under the thread's lock and while the bound is still past, the
  comments of a thread no read reached in time (`expireComment`: the
  `deleted` shape, with `expired_at`, shown as `forgotten: "expired"`); a
  later read writes them back. A channel gone (`ChannelEvents.disconnected`,
  through `engagementChannelEvents`) forgets at once its threads' comments
  that carry a bound (`EngagementRecords.channelGone`); the others end at
  their next read and keep their retention. Erasing a workspace deletes its threads and records it in
  `engagement.erased_workspaces` under the following lock, as analytics
  does; a closed account leaves its replies without an author
  (`EngagementRecords.forgetUser`), and its export lists the replies it
  sent, never the comments.
- A thread whose post Peal deleted from its platform ends as `removed`
  (`EngagementRecords.postRemoved`, told by publishing when it settles the
  removal): it is read no more, and its comments stay for
  `keptAfterCollection`, never forgotten for it; a read that finishes
  after it leaves it ended.
- `CollectComments` runs on the `engagement.collect-comments` cron, every
  ten minutes from minute 2: it follows publishing's `PublishedTargets` (`FollowedPosts`)
  as analytics does, stories and Facebook reels left out by the listing's
  query (stories leave after a day, and Peal reads none of their replies;
  a reel is published under its video's id, not read yet), then reads the
  threads due, the channels that waited
  longest first, 10 threads a call (`CommentSource`, through the channel's
  gate: `ReadComments`), 30 threads a channel a run, 8 channels at once
  (`PEAL_ENGAGEMENT_CONCURRENCY`), and starts no read 8 minutes after the
  run's time. A thread is read every run for a day, hourly for a week,
  then every six hours (`collection-schedule.ts`). A platform that is down
  or slows a channel postpones its threads half an hour, so they never
  hold the queue's front. A run sets `peal.engagement.collection.duration`
  and `.left`, counts `.unfinished`, and Grafana alerts on it
  (`peal-comments-behind`). `reconcile` is the one place that decides what
  a read changes; a comment by the channel's own account is not kept, and
  marks the comment it answers as answered. A post of several parts has
  one thread, under its first part: the readers walk the whole reply tree
  (Mastodon's context; Bluesky's `getPostThread` to `threadDepth`, deep
  enough for the longest post), so comments under every part are kept, a
  part is the account's own reply and never a comment, and a comment
  under a later part answers the post (`parentId` null).
- Whoever changes a thread's comments from what it read takes the thread
  first (`EngagementStore.lockThread`, in its transaction) and reads them
  after: the collection's reconcile, a member's moderation or answered
  mark, a reply settling or confirmed. None writes over what another just
  changed.
- Threads are read with a client of their own (`reader`,
  `overflow: "truncate"`): an answer ends at `maxThreadBytes` (8 MiB)
  instead of failing past a megabyte, and `threadBodyOf` keeps what it
  held whole before the cut (`closedJson`), far more than the
  `commentsPerThread` a thread keeps. A read is `complete` only when the
  answer came whole and the platform gave all it has: never for a
  truncated answer, nor for Mastodon's signed-out context once it is 60
  statuses long or 20 replies deep. Only a complete read may take a
  comment it did not see for deleted.
- A reply follows publishing's contract, under one rule: a public reply is
  never sent twice, and never sent after a person was told it did not go
  out. `EngagementReplies.reply` checks the permission, the comment, the
  channel's ability and the platform's length (`ReplyLimits`, on
  publishing's `textOverflowOn`; on Mastodon `outgoingText` puts the
  mention first), then journals the row in `engagement.replies` with the
  start of `SendReplyV1` in one transaction. `EngagementStore.journalReply`
  only inserts, and the database decides: `replies_pending_comment` (unique
  on the comment while a reply is `sending` or `unconfirmed`) refuses a
  second reply whichever request came first (`ReplyPending`), and
  `replies_key` (unique on the workspace and the SHA-256 of the
  `Idempotency-Key`, kept `replyKeyLifetime`, the contract's 24 hours)
  answers a request sent again with the reply it made, or
  `ReplyKeyReused` for another comment or text.
- A reply's status changes only through `EngagementStore.advanceReply`,
  from the state it was read in: a job, the handover and a person never
  overwrite each other. `SendReply` commits `attempted_at` before the
  call; a run that finds it set never sends: it calls
  `ReplySender.resume`, which looks the reply up by a key every run
  derives (Bluesky's record key from the reply's time and id; Mastodon's
  Idempotency-Key, the reply's id, for 50 minutes). A resume answers
  `failed` only on an answer that proves nothing was made (Bluesky: the
  record absent, then its own create refused; Mastodon: a 422 with
  Mastodon's JSON error, as it validates only a status the key did not
  make); anything else, the channel or the store unreadable included, is
  `unconfirmed`, which a person settles (`confirm`), for good. Meta takes
  no idempotency key, so on Facebook and Instagram `resume` never sends:
  it lists every reply under the comment (`foundAmong`) and answers
  `sent` only when exactly one by the account, written since the reply
  was (a minute of clock skew), has its text; none, two, or a list it
  could not read whole is `unconfirmed`.
- The gate (`platform-engagement.ts`) claims the call
  (`EngagementStore.claimCall`, `call_claimed_at`) immediately before the
  platform request, and makes none for a reply that is not `sending`: one
  settled or handed over while its call waited its turn is not sent, nor
  looked up. A reply still `sending` an hour after it was written
  (`strandedAfter`), with no call claimed in the last `callBound` (10
  minutes, far past a call's 20-second timeout), is handed to a person as
  `unconfirmed` (`SendReply.settleStranded`, from the collection's cron),
  and its job is interrupted in the same transaction (`ReplyJobs.cancel`),
  so it cannot wake later. `SendReplyV1` (payload `replyId`, activity
  `send`) is persisted contract.
- Acting needs `engagement:reply`, which is in `publishingPermissions` (an
  OAuth client needs `workspace:publish`) and in
  `withheldWhileImpersonating`, with `engagement:read`: staff neither read
  nor answer comments. The approval policy does not apply to replies: an
  approval covers a post's content before it goes out, and a reply is a
  short answer to a live thread that the same roles may publish at once.
  Writes of the `inbox` group and the inbox tools that change something
  go through the ConnectionJournal, as a reply is content.
- What a channel can do is `abilitiesOf(platform, scopes, inbox)`
  (`engagement-abilities.ts`): `available`, `reconnect` (only for the
  abilities in `askedAtSignIn(platform, inbox)`, whose scopes the sign-ins
  ask for) or `unsupported`; `inbox` is `CurrentInboxPlatforms`, which the
  use cases read when built. Mastodon: read, reply, withdraw; a favourite takes
  `write:favourites`; nobody hides or deletes another account's reply.
  Bluesky: read (public AppView, no session), reply, withdraw; a like and a
  hidden reply (the post's thread gate, written keeping its `allow`) take
  `repo:app.bsky.feed.like` and `repo:app.bsky.feed.threadgate`. Those
  three scopes are not asked at sign-in yet: add one to its authorizer and
  to `askedAtSignIn` together. Use cases check the ability before any
  call; actions that set a state (`ReplySender.moderate`, `withdraw`) are
  safe to ask twice, and a failure changes nothing in Peal.
- A platform joins by implementing `EngagementPlatform`
  (`infrastructure/platforms/engagement-platform.ts`) and entering
  `engagedPlatforms`, `abilitiesOf` and the registry in
  `platform-engagement.ts`, which does not compile without it; the
  contract's `inboxPlatforms` and the docs' table follow.
- Facebook Pages and Instagram are read only where `PEAL_INBOX_PLATFORMS`
  names them (`#shared/infrastructure/inbox-platforms.ts`, read once into
  `CurrentInboxPlatforms`; another name, or a platform without its app,
  stops the server), because their permissions need Meta's App Review for
  accounts the app's own people do not manage. Off, the gate calls nothing
  there (`readsCommentsOn`), the abilities are `unsupported` and the
  sign-ins ask what they asked before, byte for byte; on, Facebook Login
  asks `pages_read_user_content` (read) and `pages_manage_engagement`
  (reply, withdraw, hide) for Pages, `instagram_manage_comments` for
  Instagram, and Instagram Login `instagram_business_manage_comments`
  (read, reply, withdraw, hide), all optional. The adapters
  (`infrastructure/platforms/meta/`) cite Meta's pages and the date read,
  read 25 comments a page (Facebook `filter=stream`; Instagram's top-level
  comments with their replies, then a comment's further replies), carry
  `appsecret_proof` through Facebook Login and none through Instagram
  Login, and take a missing permission (Graph code 10, 200 to 299:
  `GraphRefusal`'s `permission`) as nothing to reconnect: on a batch's
  first thread it pauses the channel, on a later one (Meta answers 210
  "User not visible" for one object) only that thread fails. Code 100
  subcode 33 also means "cannot be loaded due to missing permissions", so
  it proves nothing alone: a thread is `missing` only while the same
  token loads the account's own node (otherwise the channel is paused,
  nothing erased), and a hide or a withdrawal is done on it only while the
  token loads the thread's post (`confirmedAction`, which also reads
  `success` in a 2xx). A read stops for the run once Meta's usage headers
  pass `commentsUsageCeiling` (50 %), as the Page's or account's calls
  are shared with its publishing. A resume never takes an id another
  reply of the thread holds (`takenIds`), and on Instagram looks under the
  top-level comment, where Meta puts a reply to a reply (which the next
  read then shows as answering the top-level comment). Facebook gives no handle (an empty
  one, which the web app does not show) and says nothing of a comment
  being hidden (`hidden` none: Peal's state stands). Their reply limits
  are the posts' own: Meta's pages state none for a comment. They were
  written from Meta's reference and never run against Meta: before the
  setting is turned on anywhere, read, answer, hide and withdraw one
  comment on a test Page and a test Instagram account, through each way
  in, a Facebook feed video's among them (followed under its video's id,
  as a reel would be, which is left out: include reels or leave videos
  out by what it shows), watch `X-Business-Use-Case-Usage` there, and
  have the privacy policy name the two platforms (the registry's `inbox`
  entry, then the legal pages, through counsel).
- YouTube is read only where `PEAL_INBOX_PLATFORMS` names it (with
  `YOUTUBE_CLIENT_ID` and its secret), as Google verifies an app for
  `youtube.force-ssl` (`youtubeCommentScope`), the one scope of every
  comment method; the sign-in asks it as optional (`googleOAuth`'s
  `optionalScopes`), off byte for byte as before. Read, reply, withdraw
  and hide take it; YouTube has no like, and only an author deletes. The
  adapter (`infrastructure/platforms/youtube/`) cites the API's pages and
  the date read: `commentThreads.list` by video (100 a page, `order=time`,
  plain text), then `comments.list` for a thread that came with fewer
  replies than `totalReplyCount`; a reply goes under the top-level comment
  (one level), hide rejects (never `banAuthor`), show publishes (the
  reference and the guide disagree whether YouTube allows it: a refusal
  changes nothing), and a rejected comment is no longer listed, so the
  next read forgets it. 403 `commentsDisabled` reads nothing and is not
  complete; 404 `videoNotFound` is `missing`; `insufficientPermissions`
  pauses the channel on a batch's first thread and fails a later one.
  Each read call spends a unit of `youtubeCommentsDailyUnits` (3,000 of
  the project's 10,000 by Pacific day, `YOUTUBE_DAILY_COMMENT_UNITS`;
  with thumbnails' 4,000 it leaves 3,000, `youtubeReservedUnits` at
  least, for what Peal does not count) in publishing's `PlatformQuota`
  ledger (`comments:youtube`, shared by every process); past it, or on
  `quotaExceeded`, which exhausts the bucket, the read halts until the
  next day. Replies, hides and withdrawals are a person's acts and are
  never held by it. A resume never sends: it lists the replies under the
  top-level comment and uses `foundAmong`
  (`infrastructure/platforms/resumed-reply.ts`, Meta's rule). Never run
  against YouTube: before the setting is turned on anywhere, read, answer,
  hide, show and withdraw one comment on a test channel (a reply to a
  reply among them), and watch the project's quota for a day; have the
  privacy policy name YouTube, and Google verify the scope.
- Threads of a platform that is off end `unsupported` at their first
  read, and stay ended when the setting is turned on: only posts published
  afterwards are read. They are not reopened, because a thread does not
  know its platform (the channels context does) and reopening every
  `unsupported` thread would read each other platform's again at every
  start; the docs' Inbox page says so.
  Platform events will name threads to read through `CommentSource`: what
  a platform pushes is an id to fetch, never content to trust.
- Adapters reach platforms through `publicHttpClient` and `ChannelAccess`
  only, fail with `TokenRejected` only for the platform's own refusal, and
  are tested against loopback servers
  (`test/engagement/infrastructure/*-engagement.test.ts`). Bluesky's
  session, DPoP sender, record keys and facets are in
  `#shared/infrastructure/platforms/bluesky/`, for publishing and
  engagement both. Mastodon's HTML becomes plain text (`#shared/domain/html-text.ts`, which feeds share):
  clients render a comment as text, never as markup.
- The workspace is told through `EngagementOutcomes`, in the transaction
  that records the fact: `comment.received` once per comment and
  `comment.replied` for a reply sent (ids only), and the `CommentsReceived`
  notice once per thread and UTC day (key `comments:<thread>:<day>`), to
  the post's author and the members with `engagement:reply` who follow
  every post, emailed only to those who turned `comments` on.
- `InboxWaiting` counts, for several workspaces at once, the threads the
  inbox's `unanswered` filter lists (comments, one waiting), for the
  overview across workspaces: a count of threads, never a comment's text
  or author, ids as one `anyUuid` parameter, no permission checked.
- Test use cases on the in-memory world (`test/engagement/fakes/world.ts`),
  the store on Postgres at instants no other suite uses (2043; the purge
  in 2031; the refresh bound in 1923, before the test clock's start, as
  moving it forward past the pool's timers stalls the pool), deleting the
  workspace's rows after.
- Every string a platform gives is cleaned before anything keeps or
  compares it (`storableReading`, on `#shared/domain/platform-text.ts`):
  no NUL, no lone surrogate, no control character, a bounded text, name,
  handle and id, and a permalink only when it is a web address. `reconcile`
  cleans first, as ids are matched as they are kept, and `receiveComment`
  and `refreshComment` clean again whatever they are handed. One thread
  never stops a run: `recordOrPutOff` puts off a thread the database
  refuses or a fault breaks on, counts it (`failed`,
  `peal.engagement.collection.thread_failures`, alert
  `peal-comments-thread-failing`) and logs its id, never the failure
  itself, which may quote what people wrote.
