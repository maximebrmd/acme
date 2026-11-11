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
  together. Erasing a workspace deletes its threads and records it in
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
  as analytics does, then reads the threads due, the channels that waited
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
  `unconfirmed`, which a person settles (`confirm`), for good.
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
- What a channel can do is `abilitiesOf(platform, scopes)`
  (`engagement-abilities.ts`): `available`, `reconnect` (only for the
  abilities in `askedAtSignIn`, whose scopes the sign-ins ask for) or
  `unsupported`. Mastodon: read, reply, withdraw; a favourite takes
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
  contract's `inboxPlatforms` and the docs' table follow. Facebook Pages
  need `pages_read_user_content` and `pages_manage_engagement` (App
  Review), Instagram `instagram_manage_comments`, YouTube the
  `youtube.force-ssl` scope (Google verification): none is asked today.
  Platform events will name threads to read through `CommentSource`: what
  a platform pushes is an id to fetch, never content to trust.
- Adapters reach platforms through `publicHttpClient` and `ChannelAccess`
  only, fail with `TokenRejected` only for the platform's own refusal, and
  are tested against loopback servers
  (`test/engagement/infrastructure/*-engagement.test.ts`). Bluesky's
  session, DPoP sender, record keys and facets are in
  `#shared/infrastructure/platforms/bluesky/`, for publishing and
  engagement both. Mastodon's HTML becomes plain text (`html-text.ts`):
  clients render a comment as text, never as markup.
- The workspace is told through `EngagementOutcomes`, in the transaction
  that records the fact: `comment.received` once per comment and
  `comment.replied` for a reply sent (ids only), and the `CommentsReceived`
  notice once per thread and UTC day (key `comments:<thread>:<day>`), to
  the post's author and the members with `engagement:reply` who follow
  every post, emailed only to those who turned `comments` on.
- Test use cases on the in-memory world (`test/engagement/fakes/world.ts`),
  the store on Postgres at instants no other suite uses (2043; the purge
  in 2031), deleting the workspace's rows after.
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
