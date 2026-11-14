# Engagement (the inbox)

- The context is `engagement`; the product, the API group and the pages
  say "inbox" (`/api/workspaces/:workspaceId/inbox`, `peal inbox`,
  `…/inbox`), as "notices" already names a user's notifications. This
  slice is comments on posts Peal published, and the reviews of Google
  Business Profile locations (below); direct messages and mentions will
  build on it. Nothing answers by itself but a comment rule (below), and
  no assistant prompt ever reads a comment.
  slice is comments on posts Peal published, the reviews of Google
  Business Profile locations, and the direct messages of Mastodon and
  Bluesky channels (below); mentions will build on it. Nothing here answers by itself: no automation,
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
  `platform-engagement.ts`; YouTube's 29 days), `recordCollection` moves
  the thread's `refresh_by` on a complete read only (an incomplete one sets
  it only where none is), so a comment an incomplete read missed is
  forgotten at the bound, and `PurgeEngagement.forgetExpired`
  (hourly, `engagement.refresh-bound`, and before each daily purge, whose
  deletion runs whatever it met) forgets, under the thread's lock and while
  the bound is still past, the comments of a thread no complete read
  reached in time; a thread that fails is counted
  (`peal.engagement.retention.forget_failures`, alert
  `peal-comments-forget-failing`) and the others go on (`expireComment`: the
  `deleted` shape, with `expired_at`, shown as `forgotten: "expired"`); a
  later read writes them back. A channel gone (`ChannelEvents.disconnected`,
  through `engagementChannelEvents`) on a platform that bounds keeping
  (`boundsKeeping`, `refresh-bounds.ts`) ends every thread of the channel,
  read or not, and forgets their comments (`EngagementRecords.channelGone`,
  so a read on its way finds its thread ended under the lock and keeps
  nothing); the others end at
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
- Each reply is one of the billing account's `outboundMessages`
  (`MeteredUsage`): a paused meter refuses before anything is journalled
  (`pausedOf`, unless the request has an `Idempotency-Key`: the journal
  answers the reply the key made first), and the reply journalled claims
  its message, at the reply's own instant, in the
  journal's transaction, so a refusal undoes it; a reply that ends as never
  sent (`SendReply.settle` with `failed`, or confirmed not found) gives it
  back (`messageOf`, the reply's `createdAt`). Reading is never metered.
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
  next read forgets it (the implementation guide: the API "does not provide a way to list or otherwise discover rejected comments"), which leaves `unhide` reachable only until then. 403 `commentsDisabled` reads nothing and is not
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
- LinkedIn is read only where `PEAL_INBOX_PLATFORMS` names it (with
  `LINKEDIN_PAGES_CLIENT_ID` and its secret), and on company pages only:
  `abilitiesOf` and `askedAtSignIn` take the channel's `connection`
  (`EngagedChannel.connection`), and a profile is `unsupported`, never
  `reconnect`, as LinkedIn closes the permission that reads a member's
  posts. `linkedinCommentScopes`: read ← `r_organization_social_feed`;
  reply and withdraw ← `w_organization_social_feed`; no hide, no like
  yet. The adapter (`infrastructure/platforms/linkedin/`, on
  `#shared/infrastructure/platforms/linkedin-rest.ts` and
  `linkedinVersionConfig`) cites the Comments and Social Actions pages
  and the date read: a thread's summary first (a post without comments
  answers 404 to its comments), then its comments by pages of 100 and
  each one's nested comments; a 404 on the summary is `missing` only
  while the token still reads the page itself. A comment is kept by its
  `commentUrn` as given (its thread may be an activity the post's URN is
  not) and its author by URN, with no name ("A LinkedIn member", "A
  LinkedIn page" in the clients): LinkedIn caps other members' profile
  data at a day, and the refresh bound is a day (`linkedinRefreshWithin`).
  401 renews the token, 403 pauses the channel on a batch's first thread,
  429 and 426 (logged) halt, 5xx waits. A reply goes under the top-level
  comment as the page; a resume never sends (`foundAmong`); a withdrawal
  deletes by the comment's id, inside its URN, and a 404 is done. The
  reads spend a call of `linkedinCommentsDailyCalls` (200 of the app's 500 and 40 of a member's, by UTC day, `LINKEDIN_DAILY_COMMENT_CALLS` and `_PER_MEMBER`) in `PlatformQuota` before each call, and halt when either is spent, so publishing keeps the rest of the Development tier; the member is the token's owner (`ChannelToken.tokenOwner`, the ACLs' `roleAssignee` kept in `channels.token_owner`), counted under a keyed digest of them (`Pseudonyms.ofPlatformMember`), never their identifier, so `publishing.quota_usage` names nobody, and a page connected before it was kept is counted by page. A list ends at `paging.total`; without one, at the summary's first-level count met exactly on a page shorter than one before it or than 10 (`smallestPage`, the shortest page LinkedIn's samples give), at an empty page, or at LinkedIn's 404 past the first page, never on a short page or `links` alone: a count met on a page of 10 or more as long as LinkedIn gives, or passed, reads one page more, and an empty first page against a summary that counts comments is an incomplete read. Never
  run against LinkedIn: before the setting is turned on anywhere, the
  pages app holds the Standard tier and both scopes (a pages sign-in fails
  without them), the privacy policy names LinkedIn, and one comment is
  read, answered and withdrawn on a test page, and the pages' token answer checked to list `scope` (without it, Peal records the scopes asked, which LinkedIn's all-or-nothing consent should grant). A summary without `commentsSummary` is checked against the list (a 404 there is a complete read of nothing), a 404 on a later thread's summary while the page no longer reads fails that thread only, and a resume excludes the thread's other replies by the comment id inside their URN, whichever form they are kept in.
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
  in 2031; the refresh bound in 1923, before the test clock's start, a channel gone in 2037, after the purge's, as
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
- Reviews are a model of their own beside comments: a `ReviewThread` per
  Google Business Profile channel (its location; `engagement.review_threads`,
  unique on the channel), a `Review` per review (stars, text, times, the
  reviewer's display name or none when anonymous, a photo count, never the
  photos nor a picture; the location's reply as Google shows it), and a
  `ReviewReply` journal (`review_replies`). They are read only where
  `PEAL_INBOX_PLATFORMS` names `googleBusiness` (with
  `GOOGLE_BUSINESS_CLIENT_ID` and its secret; `readsReviewsOn`); off,
  `CollectReviews` follows and calls nothing, and the sign-in is as before
  (it asks `business.manage` already, `googleBusinessReviewScope`). The
  API is its own group (`inboxReviews`, `/inbox/reviews`, in the
  ConnectionJournal's content groups), the MCP tools `*_location_review*`,
  the command line `peal inbox reviews` (read and mark only); never `EngagementReplies` or
  `SendReplyV1`, and a reply to a review claims no outbound message (the
  owner's decision 5).
- Google lets what its API gives be stored 30 days at most: a review is
  kept `reviewsKeptFor` (29 days) from its own `updateTime`, never from a
  read, so no version is held 30 days; a read lists `updateTime desc` back
  to `keptSince` (50 a page, 10 pages; past them, or a review it cannot
  read, the read is not `complete`), `reconcileReviews` decides, and only a
  complete read deletes a review it did not see. `PurgeReviews`
  (`engagement.reviews-retention`, hourly at 47) deletes reviews past the
  bound and threads no read reached in that time (a failed run is counted, `peal.engagement.reviews.retention_failures`, alert `peal-reviews-retention-failing`); a channel gone
  (`EngagementRecords.channelGone`, googleBusiness) or a workspace erased
  deletes them at once. The registry's `inboxReviews` and the privacy
  policy follow.
- `CollectReviews` runs on `engagement.collect-reviews` (hourly at 27,
  through the gates: `ReadReviews`): it follows the channels the
  directory lists (`ReviewLocations`), reads the threads due, hourly while
  a review changed in the last week, six-hourly otherwise (Google's 429 stops the run, `RateLimited`, and puts the location off as long as `Retry-After` says, an hour at least: the project's quota is shared with publishing), and records a
  read under the thread's lock in one transaction, telling
  `review.received` (ids only: never stars nor text, as an event outlives the 29 days) through `ReviewOutcomes`.
- Only a member in person answers a review or deletes its reply
  (`ReviewReplyNeedsPerson`, answered 403 `personRequired`): an API key or
  an OAuth client (MCP, the command line) reads and marks, never replies,
  as Google's policies forbid automated or triggered replies without the
  user's prior specific and express consent. A later part may let a
  workspace record that consent (who gave it, when, for which
  applications); until then keep the refusal.
- A reply to a review is a state on Google (one reply, `PUT …/reply`
  replaces it), so `SendReviewReplyV1` (payload `replyId`, activity
  `send`, persisted contract) sends, and a run that finds the call set out
  reads the review back (`resume`) and sends again only when the reply is
  not there. An outcome left unknown is `unconfirmed`, brings its
  location's read forward, and the read settles it (`settleByReading`:
  sent when the location's reply is its text, trimmed; `notSent`
  otherwise), from a read that began after the reply's call ended; one its location's reads do not reach is read back alone an hour on (`settleUnconfirmed`, gate `CheckReviewReply`, sending nothing): no person confirms it. One reply a review is on its way or
  unconfirmed at a time (`review_replies_pending`). Withdrawing deletes
  the location's reply, whoever wrote it, and marks Peal's sent replies
  `withdrawn`. Google takes 4,096 UTF-8 bytes (`maxReviewReplyBytes`) and
  a reply only for a verified location (a refusal is `refused`).
- The adapter (`infrastructure/platforms/google-business/`) cites the v4
  reference and the date read, and was never run against Google: before
  the setting is turned on anywhere, Google grants the project access (its
  quota is zero before), and one review is read, answered and its reply
  deleted on a test location.
- A comment rule (`domain/comment-rule.ts`, `CommentRules`,
  `engagement.comment_rules`) answers by itself, in public, a comment
  received after it started under a post it answers on (one post's, or
  every post of a channel's) that holds one of its keywords as a word
  (`isMatch`: folded, accents dropped, whole words). The collection's cron
  runs `CommentRules.runDue` after each read: a comment is claimed once a
  rule (`comment_rule_matches`, unique on rule and comment, cascading with
  the comment, ids and Peal's words only), answered through
  `EngagementReplies.reply` as the starter is now (`RuleStarters`, the
  workspace's `ActorsNow`) under the key `comment-rule:<rule>:<comment>`,
  so the journal, the once-a-comment index and the outbound message
  apply and a run cut short answers once; one person once a rule
  (`samePerson`), `maxRuleRepliesPerDay` (25) a rule and UTC day, a meter
  without room releasing the claim for a later run. Where it answers is
  `commentRuleSupport`, from each platform's pages: Bluesky (its bot
  guidance), X, LinkedIn and YouTube are `notAllowed`, refused when the
  rule starts (`CommentRuleNotPossible`, each channel with its reason).
  The approval policy does not apply, as it does not to a member's
  reply; staff acting as a member start none. Never a private reply, a
  like or a follow: decision 6.
- Direct messages are a model of their own beside comments and reviews:
  a `MessageBox` per channel (`engagement.message_boxes`, keyed by the
  channel: its schedule), a `Conversation` per conversation on the
  platform (`conversations`: the other accounts' id, handle and shown
  name, the platform's `revision`, whether it is a `request`, the latest
  message, the latest from someone else, `read_at`), a `DirectMessage`
  per message (`direct_messages`: text, sender's id, a file count, never
  the files) and an `OutgoingMessage` journal (`outgoing_messages`). They
  are private correspondence the workspace receives, kept as its
  processor: never their text, nor who sent them, in a log, a trace, a
  notice, a webhook event, the cluster's tables (gate payloads and
  `SendMessageV1` carry ids) or an assistant's prompt, and staff never
  read them (`engagement:readMessages` and `engagement:message` are
  withheld while impersonating). Log a failure by its ids alone, never its
  cause. Peal never starts a conversation: a conversation nobody else
  wrote in has its window shut (`replyWindowOf`).
- Reading them takes `engagement:readMessages`, held by owners, admins
  and editors, never carried by `engagement:read` or the `workspace:read`
  scope (it is in `publishingPermissions`). An application (a user actor
  with a `clientId`) lists conversations, and reads, sends, confirms or
  marks one only where an owner allowed its client id
  (`engagement.message_applications`, `MessageSettings.allowApplication`,
  `organization:secure`, in person); otherwise `MessagesNeedConsent`,
  which the MCP tools explain in words. A channel's messages are read
  only once a member turned them on for it (`engagement.message_channels`,
  `MessageSettings.switchChannel`, `channel:connect`, in person): turning
  on follows the box; turning off gives back the claims of what never
  set out and deletes the box and conversations (`channelGone`).
- They are read only where `PEAL_INBOX_MESSAGES` names the platform
  (`#shared/infrastructure/inbox-messages.ts`, read once into
  `CurrentInboxMessages`; `mastodon`, `bluesky`; another name stops the
  server). Off, `CollectMessages` follows and calls nothing, the
  abilities are `unsupported` and Bluesky's sign-in is as before, byte for
  byte. `messageAbilitiesOf` (`read`, `send`): Mastodon takes
  `read:statuses` and `write:statuses`, which its sign-in always asked;
  Bluesky the chat methods' `rpc` scopes at `did:web:api.bsky.chat#bsky_chat`
  (`blueskyChatScopes`, or `transition:chat.bsky` with
  `transition:generic`), asked only when a member turns a Bluesky
  channel's messages on: `switchChannel` refuses a channel whose read is
  not `available` (`MessageAbilityUnavailable`, `reconnect`), and the web
  app reconnects it with `messages=true`, the switch off meanwhile. A
  channel without them is never called (`platform-messages.ts`).
- `CollectMessages` runs on `engagement.collect-messages` (minutes 1 and
  21, the free minutes `test/app/cron-schedules.test.ts` leaves; 8
  minutes a run, 8 channels at once, through the gates: `ReadMessages`):
  it hands stranded messages to a person (`SendMessage.settleStranded`)
  and reads the boxes due: every run while a message came in the last day,
  hourly otherwise. The adapter is given the revisions Peal holds and
  reads back only the conversations that changed, and those not read back
  for a day (`dueForCheck`, `checkedAt`), so a deletion is seen within a
  day. A listing that reached its end (`listedWhole`, non-empty) marks
  the kept conversations it did not list (`unlisted_at`), clears those it
  lists, and deletes those the whole listing before missed too, unless a
  message to one is on its way (`dropUnlisted`): one listing alone never
  deletes, as a conversation moving up while it pages is on no page, and
  an empty one says nothing. Bluesky's listing ends at a page wholly older
  than what Peal keeps, as Mastodon's. One cut at its page cap
  deletes none and is counted (`peal.engagement.messages.listing_truncated`,
  alert `peal-messages-listing-truncated`).
  Each adapter checks the read's deadline before each read-back, so a
  read never holds the gate long past it; `reconcileMessages`
  decides (a message the platform says was deleted goes at once; only a
  `complete` read takes one it did not see, sent since the read's start,
  for deleted; no reading sent before `keptSince` is ever kept, so a
  thread read whole brings back nothing the retention deleted). Mastodon
  asks after each kept status a whole read did not show
  (`GET /api/v1/statuses/:id`, at most 10, `keptOf`): gone, it is in
  `deleted`; still there (a branch detached by a deleted status), the
  read is not `complete`. The record runs under the box's lock in one transaction,
  and tells `message.received` (ids) and the `MessagesReceived` notice
  (the channel's handle and a count, once a conversation and UTC day, to
  `engagement:message`, emailed under `comments`) only for messages
  others sent after the box was followed. A box the database refuses is
  put off and counted (`peal.engagement.messages.box_failures`, alert
  `peal-messages-box-failing`); `.left` and `.unfinished` feed
  `peal-messages-behind`.
- Mastodon (`platforms/mastodon/mastodon-messages.ts`, docs read
  2026-11-14): a message is a status of `direct` visibility;
  `/api/v1/conversations` (40 a page, 5 pages, the `Link` header's next
  page on the instance only, stopping at a page wholly past what Peal
  keeps); a changed conversation is read whole from its first status's
  context (two calls), keeping `direct` statuses only, and only those
  whose author and mentions, less the account, are the conversation's
  accounts (`exchangedWith`): a status mentioning a third account belongs
  to another conversation. A context whose first status answers one Peal
  cannot see is not `complete`. A message mentioning anyone outside the
  conversation is refused (`mentionsOutside`, `MessageMentionsOutside`). The docs say an
  authenticated context gives "private statuses" without naming `direct`:
  check it on a test account before turning Mastodon on anywhere. A
  message answers the latest message kept (`in_reply_to_id`) and mentions
  every participant first (`outgoingMessageText`), under the
  Idempotency-Key of its id; resume as a reply's (50 minutes, failed only
  on Mastodon's 422).
- Bluesky (`platforms/bluesky/bluesky-messages.ts`, the installed
  `chat.bsky.convo` lexicons): through the PDS with `atproto-proxy:
  did:web:api.bsky.chat#bsky_chat`; `listConvos` (100 a page, 5 pages),
  direct conversations only (groups are not read), a changed `rev` read
  back by `getMessages` to what Peal keeps; `deletedMessageView` is a
  deletion. `getLog` is not used: its lexicon does not say where a read
  without a cursor starts. A request is accepted (`acceptConvo`) before
  the first answer. `sendMessage` takes no key, so a resume never sends:
  exactly one of the account's messages since, with the text, and not one
  Peal already holds (`takenIds`), is `sent`; anything else
  `unconfirmed`. 1,000 graphemes and 10,000 bytes (`chatOverflow`). A 401
  or 403 without a token error pauses the read, never marks the channel
  to reconnect. Neither adapter was run against the platform: before the
  setting is turned on anywhere, read and answer one conversation on a
  test account of each, and Bluesky's granular chat scopes checked to be
  granted as asked.
- Sending (`EngagementMessages.send`, `engagement:message`, in
  `publishingPermissions`): the conversation, the channel able, the
  platform's `replyWindowOf` open (always, on these two), the text within
  5,000 characters and the platform's length (Mastodon's status through
  `ReplyLimits`), then the journal row, the meter's claim (one
  `outboundMessages`, paused refusing first unless the request has a key),
  the job (`SendMessageV1`, payload `messageId`, activity `send`,
  persisted contract) and the conversation marked read, in one
  transaction. `outgoing_messages_pending` holds one message on its way
  or unconfirmed a conversation; `outgoing_messages_key` one a key
  (`messageKeyLifetime`, 24 hours). A message that ends failed, or a
  person finds never went out (`confirm`), gives its claim back, as does
  each that never set out (`sending`, no call begun) when its channel's
  messages are turned off or found disconnected (`forgetChannelMessages`),
  its channel leaves or its workspace is erased (`EngagementRecords`, on
  the meters: `MetersContextLive` is built below the channels context in
  `src/app/server.ts` for that). Those rows are locked (`FOR UPDATE`)
  until the deletion commits, so a job that would begin one finds it
  gone. The
  gate claims the call first (`claimCall`).
- Retention: each message is deleted `conversationsKeptFor` (30 days)
  after it was sent, a settled outgoing message (`sent`, `failed` or
  left `unconfirmed`) 30 days after it settled, and a conversation once
  its last message is that old and nothing of it is `sending`
  (`direct_messages_sent`, `outgoing_messages_settled`; `PurgeMessages`,
  `engagement.messages-retention` hourly at 57; a failed run is counted,
  `peal.engagement.messages.retention_failures`, alert
  `peal-messages-retention-failing`); a channel gone, on any platform,
  deletes its box and conversations at once (`EngagementRecords.channelGone`),
  and a workspace erased with them. A closed account leaves its messages
  without an author, and its export lists the messages it sent, never
  those it received. The registry's `inboxMessages`, the privacy policy,
  the contract's `inboxMessageRetentionDays` and the docs' Inbox page
  follow: change them together. A conversation is read a page at a time
  (`maxInboxMessagesPerPage`, the cursor the message's time and id). Test the store at 2049 (the purge at
  1935).
