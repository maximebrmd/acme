# Publishing

The cluster that runs these workflows, and what of them is persisted contract,
are in the server's guide, [`../../AGENTS.md`](../../AGENTS.md).

- `PublishPostV1` sleeps durably until the instant, claims the post for its
  schedule revision, runs one `PublishTargetV2` per channel, then finishes the
  post. Each attempt writes and commits its journal row
  (`publishing.publication_calls`) before calling the platform. Jobs are
  started at `postJobVersion` (2); one stored at `codeVersion` 1 keeps the
  `PublishTargetV1` children its history may hold, which stays registered
  until they have ended: start nothing with it.
- A post's content is its first part (`text`, `media`, `overrides`) and
  `followUps`, the parts after it (`PostPart`: text, media, texts by
  channel, `delaySeconds` up to a day; 24 at most), in
  `publishing.posts.follow_ups`. Content from before decodes as one part:
  keep `fixtures/persisted/posts/follow-ups.json` decoding. Read parts with
  `partsOn`, every file with `shownMedia`; an approval's subject covers
  them, written for a post of one part as it was before.
- `platformRules[platform].followUps` says what parts become there
  (`thread`: X, Bluesky, Mastodon; `comment`: none yet) and how many; the
  contract's copy and the capabilities' `followUps` follow it. Scheduling
  checks each part as a post of the platform (violations carry `part`, its
  place from 1) and refuses parts elsewhere (`tooManyParts`). A platform
  joins only with an adapter that reads `OutgoingPost.replyTo`: the router
  refuses a later part to any other (`partsNotSupported`).
- `PublishTargetV2` (`workflows/publish-parts.ts`) sends a target part by
  part: `claim-target` answers the parts left, then for each `delay/<part>`
  (a durable sleep), `publish/<part>/<n>` with `retry/<part>/<n>`, and
  `record-part/<part>`, which appends the part to `post_targets.live_parts`
  before the next is sent. All persisted contract
  (`fixtures/persisted/PublishTargetV2`). Each part has its own journal rows
  (`publication_calls.part`, 0 for the post). The first part that fails, is
  cancelled or has an unknown outcome ends the round: never send a part
  after it. A published target is its first part's id and permalink;
  `liveParts` stay on a failed, unconfirmed or cancelled one, which makes
  the post `partiallyPublished`. A repost sends from `nextPartOf`, never a
  live part; a member confirming an unconfirmed part that was not the last
  fails the target as `partsNotSent`, as a part found by hand has no id
  the next could reply to. `partsNotSent` (that, a parent gone from the
  platform, `replyTargetGone`, or the router's own refusals) is never
  reposted (`isRepostable`): every surface says the rest cannot be sent
  from Peal, and none offers to send it again. The router gives a later part the
  ids of the first part and of the one before it (`ReplyReference`), and
  refuses it (`replyTargetUnknown`) when Peal has no id for one.
- A cancel between two parts sets `cancelRequested`: the part that waits is
  not sent, and the target settles only when its wait ends. That wait
  never keeps the workspace from being erased (see the erasure rule below).
- Thread adapters: Mastodon sends `in_reply_to_id` under the attempt's key;
  X sends `reply.in_reply_to_tweet_id`, and looks a lost reply up among the
  account's replies, taking it only when it answers the same parent;
  Bluesky names root and parent as strong references whose `cid` it reads
  back from the PDS, and refuses a part whose parent is gone
  (`replyTargetGone`). Threads' `reply_to_id` needs
  `threads_manage_replies`, which Peal does not ask for: no parts there.
- X documents that an app on self-serve access may reply only under a post
  whose author mentioned or quoted the replying account, and gives no code
  for the refusal: a 403 naming a reply, on a part after the first, is
  `repliesNotAllowed` (a failure reason of its own, never reposted). The
  operator turns X threads off with `X_THREADS=false`
  (`CurrentThreadedPlatforms`, read when AccountRules, the router and
  PostingCapabilities are built): scheduling refuses parts on X
  (`tooManyParts`, maximum 1), the router refuses a part already
  scheduled (`partsNotSupported`), and the capabilities give X no
  `followUps`.
- `PublishedTargets` lists a target once it is published, a post of
  several parts as its first part (id and permalink): one row a target,
  whatever its parts, so analytics counts, and X bills, one post, and the
  inbox has one thread, whose reader walks every part (the parts are the
  account's own replies, never comments). A target stopped midway
  (`liveParts` on a failed, unconfirmed or cancelled one) is not listed
  until a repost or a member completes it. The listing is ordered by
  `post_targets.listed_at`, which `listedFrom` sets: when the target went
  live, or, for one a member confirmed by hand (published at its
  `attemptedAt`, hours before), when they did, as followers read on from
  the latest they know and never look back that far. The first part's
  reply count includes the second part: say so where counts are explained.
- A post whose outcome is unknown is marked unconfirmed, never retried blindly:
  the user checks the platform before reposting.
- Erasing a workspace's posts (`PostRecords`) stops its scheduled jobs in the
  same transaction, and is refused only while a call to a platform is in
  flight for one of its posts (`WorkspacePostStore.lockRounds`: a journal
  row begun and not ended, read under the targets' locks, which a call's
  journal row needs before it can begin). A post that is publishing but
  only waits, between two parts of a thread or before another try, is
  erased, and its jobs are stopped with it (`PublicationScheduler.cancel`
  and `cancelRound`); one that wakes all the same finds its target gone
  and ends `superseded`, sending nothing.
- A post keeps how it was created and last scheduled (`PostAttribution`,
  `#publishing/domain/post-origin.ts`): in the web app, with an API key or
  through an OAuth application (`Actor.subject.clientId`), with the key's or
  the application's id and the name it had then (`PostOrigins`, backed by
  the workspace context's `CredentialNames`), and which member scheduled it
  (`scheduled_by`). `created_via` and `scheduled_via` are JSON the domain
  decodes: persisted contract (`fixtures/persisted/posts/origins.json`).
  The post view shows it, the export holds it without who, `forgetAuthor`
  clears `scheduled_by`, and no adapter is handed any of it.
- `PostScheduling.send` (`posts.send`, `create_post`, `peal post`) creates
  and schedules in one call; "now" is the current instant, through every
  rule a later time goes through. With an `Idempotency-Key`
  (`IdempotencyKeys`, `publishing.idempotency_keys`: SHA-256 of the key and
  of the request's canonical JSON, per workspace, never either), the same
  key and body within 24 hours (`idempotencyKeyLifetime`) answer the first
  post, checked before anything else so a retry after the post went out is
  not told its time passed; another body is `IdempotencyKeyReused`. The key
  is claimed in the transaction that saves the post, so requests sent
  together make one. The `publishing.idempotency-retention` cron purges.
- Scheduling answers every violation at once: the platforms' rules and the
  accounts' own (`AccountRules`) in one `PostContentRejected`.
- A post's author is the member who created it (`authorId`, none for an API
  key). Drafts are listed newest first (`PostQueries.listDrafts`) and
  discarded by deleting them, which needs post:delete, or post:update for
  their author (`mayDiscard`). `PostScheduling.unschedule` takes a scheduled
  post back to draft: its revision goes up and its job is interrupted. A job
  that wakes for a post or target since deleted, by a member or by erasure, is
  superseded.
- `PostFollowUp` reposts a failed or unconfirmed target, in its next round:
  a `PublishTargetV2` with no parent (`PublicationScheduler.repost`), which
  reopens a finished post; the last target to settle finishes its post, in
  `recordTargetRun`, or cancelling it does when nothing is left to send. A
  repost's rate-limit deadline counts from the repost. `confirm` records
  what a member found for an unconfirmed target and revises the outcome.
  Both call `PublicationOutcomes.resolved`.
- Every way of scheduling passes the `ApprovalGate` in the transaction that
  saves the post: `schedule`, `scheduleDraft`, `reschedule` and `send` (so
  `posts.send`, `create_post`, `publish_post` and `peal post` too) ask
  `mayAsk`, then `throughGate` before `roomInMonth`. A held post takes its
  month's room and gets no job; `PostEvents.scheduled` is told only for a
  post that is scheduled (`announce`), and `HeldPosts.release` tells it once
  the post is approved, so no `post.scheduled` webhook goes before. An
  application is answered the post with `awaitingApproval`, never a
  refusal. Approving is publishing (`post:approve` is in
  `publishingPermissions`): an OAuth client needs `workspace:publish`.
  What happens in a review reaches webhooks through `ReviewOutcomes`
  (`webhookReviewOutcomes`: `post.approval_requested`, `post.approved`,
  `post.changes_requested`, by kind of reviewer, never a name or a
  comment).
- Refusals Peal makes itself, before any platform call (a channel
  disconnected or turned off, media deleted), carry the codes of
  `#publishing/domain/own-refusals.ts`; the policy maps them to their own
  failure reasons (`failureReasonOf`). Add a reason to the domain, the
  contract, the notices' events, the email catalogues and the web strings
  together.
- Platform calls go through the `PlatformPublisher` port, one at a time per
  channel through `ChannelGate`, whose calls are volatile: post content never
  lands in the cluster tables. The gates run `RoutedPlatformPublisher`, which
  reads the post, takes its text on the channel and hands it to the
  platform's `PlatformClient`; tests use `FakePlatformPublisher`. A whole
  publish runs inside the gate: uploads, processing waits, token renewal,
  the post and its confirmation.
- Platform adapters live in `publishing/infrastructure/platforms/<platform>/`
  (Mastodon, Bluesky, LinkedIn, X, TikTok, YouTube, Pinterest and Google
  Business Profile, and Threads, Instagram and Facebook Pages in `meta/`),
  beside `ChannelGate`, and implement the steps of
  `publishing/application/publication-steps.ts`, which `sequenced` runs:
  `prepare` uploads the media (safe to repeat: media alone shows nowhere),
  `poll` waits while the platform processes it (15 minutes at most),
  `commit` is the one request that makes the post live (fail with
  `OutcomeUnknown` when it may have), and `confirmation` says how to read the
  post back: `lookUp` by a key chosen before the commit (Bluesky's record
  key) or by what `prepare` made when the run still has it (a Meta
  container, published once at most: `PUBLISHED` found, `FINISHED` absent),
  or by a search that answers `found` or `unknown`, never `absent`, so the
  post is never sent again (X's recent posts, by text, links and files;
  Facebook Pages', by text, as they keep no key); `resend` with the
  attempt's idempotency key within the window the platform keeps it
  (Mastodon: 50 minutes of its hour); or `none`, unconfirmed at once
  (LinkedIn members' posts cannot be read back).
- YouTube's adapter (`platforms/youtube/`) uploads with the resumable
  protocol, in parts of a multiple of 256 KiB from the media stream
  (`fromByte` skips what YouTube already has). It journals the session URL
  (`UploadSessions`, `publishing.upload_sessions`, keyed by the call's
  idempotency key and cascading with it) and commits it before any byte,
  marks `final_part_sent` before the part holding the last byte, and
  records the video id once made, clearing the URL. Its `lookUp` reads that
  journal and asks the session (`bytes */size`): 308 or no row is `absent`
  (the commit then resumes from the `Range`), 200/201 `found`, an expired
  session `absent` only while no last part left, and a journal it cannot
  read, or a status YouTube refused for the moment (a rate limit),
  `unknown`. After the upload only YouTube's `failed`/`rejected` refuse the
  post: nothing that could make a retry upload twice. Each upload first spends a unit of the server-wide
  ledger (`PlatformQuota`, `publishing.quota_usage`, by Pacific day,
  `YOUTUBE_DAILY_UPLOADS`); past it, or on `quotaExceeded` and
  `uploadLimitExceeded`, it fails as `RateLimited` with that code
  (`dailyLimitCodes`) until Pacific midnight, which the policy ends as
  `quotaExceeded`. A video YouTube made private against the options is
  `Published.keptPrivate`, kept on the target and shown on its page.
- Google Business Profile's adapter (`platforms/google-business/`) makes a
  local post with one request, `POST /v4/{location}/localPosts` on
  `mybusiness.googleapis.com` (the My Business API v4, the one API with
  local posts): the text as `summary`, the options' `topicType`, `event`,
  `callToAction` and `offer`, and each photo as a `PHOTO` media item with a
  public URL (`MediaForPublishing.publicUrl`, two hours); no video.
  Requests carry `X-GOOG-API-FORMAT-VERSION: 2`, for the detail of
  validation errors. Google keeps no idempotency key, so `lookUp` lists the
  location's posts (100 a page, three pages) and takes the one made since
  the attempt started with its type, its text and its event's title:
  `found` when exactly one is, `unknown` otherwise, never `absent`. A 5xx
  on the create call is `OutcomeUnknown`. Once Google answered the post,
  only its `state` `REJECTED` (`postRejected`) fails the attempt: a post
  still `PROCESSING` after the confirmation delays is published.
  `google-business-refusal.ts` reads Google's `status`, `ErrorInfo` reasons
  and the numeric `ErrorCode` ranges (photos 1000 to 1099, operations 1300
  to 1399, as a location that may not post), never a message or a `value`;
  its codes (`googleBusinessRefusalCodes`) are stored in the journal. A 403
  is `TokenRejected` only for a scope the token lacks: the API not enabled
  is the operator's (`PlatformUnavailable`, logged as an error), any other
  the Google user's lost permission (`BadRequest` `permissionDenied`).
  Reviews, questions and a location's metrics are not built: they would be
  a context of their own, reaching Google through `ChannelAccess`.
- Pinterest's adapter (`platforms/pinterest/`) makes a Pin with one
  request, pins/create: an image by the public media URL Pinterest fetches
  (`MediaForPublishing.publicUrl`, two hours), two to five as a carousel
  (`multiple_image_urls`), or a video registered first (media/create), sent
  to the address and with the form fields the answer gives, then polled.
  That upload is one multipart request to an object store, which needs its
  `Content-Length`: `multipartBody` frames the media stream, the form's
  fields first in Pinterest's order, and `streamedBody` names its length,
  after the file took its upload slot (`media.held`).
  Pinterest has no idempotency key: `lookUp` searches the Pins of the
  board, or of its section, made since the attempt started
  (`pinterest-pin-match.ts`: title, description, link, kind of media), and
  answers `found` or `unknown`, never `absent`. Refusals are read from the
  status and whether the body is Pinterest's own (`pinterest-refusal.ts`):
  only a 401 with it is `TokenRejected`.
- A confirmation that searches the platform (Pinterest's board, a LinkedIn
  page's newest posts, a location's local posts) adopts a post only through
  `attemptAmong` (`platforms/attempt-match.ts`): the one match the channel
  is not already recorded to have made (`RecordedPosts`, the targets'
  `platform_post_id`), so another attempt's identical post is never taken
  for this one's; several matches, or a post nothing tells apart (no text,
  no title, no link), answer `unknown`. A create call that ends in a
  server's error or a timeout is `OutcomeUnknown`, never a retry.
- No adapter holds a whole file: large uploads go in parts read one at a
  time from the media stream (`inParts` in `platforms/byte-parts.ts`:
  LinkedIn's video parts, X's 4 MiB appends, TikTok's and YouTube's
  chunks), and a file a platform takes in one request is streamed with
  `streamedBody` (`#shared/infrastructure/platforms/public-http.ts`), in a
  form with `multipartBody` (Mastodon, Pinterest's videos; LinkedIn's
  documents go as they are), never `Stream.mkUint8Array` or
  `FormData` (only Bluesky's images, 2 MB at most, are read whole).
  `streamedBody` names the length, which the public client's fetch sends
  as Content-Length: Effect's fetch client drops that header, and a body
  sent chunked is refused by some servers. `limitedUploads`
  (`publishing/infrastructure/upload-slots.ts`) opens so many files above
  16 MiB at once (`PEAL_MAX_CONCURRENT_UPLOADS`, by default one per GiB of
  memory, 2 to 8); the others wait inside their gate, where no timeout
  runs before the upload begins. LinkedIn calls name `Linkedin-Version`
  (`LINKEDIN_API_VERSION`, a default a test keeps within ten months, read
  from `#shared/infrastructure/platforms/linkedin-version.ts` by every
  context that calls LinkedIn), and
  send the member's token to LinkedIn's hosts only.
- LinkedIn's adapter posts as the account's URN (`authorUrnOf`: a page's
  account id is its URN) and builds two `sequenced` clients: a member's
  post is confirmed by `none`, a page's by a `lookUp` that searches the
  page's newest posts for the same commentary (`linkedin-confirmation.ts`),
  `found` or `unknown`. Rest.li 2.0 lists keep their parentheses and commas
  and encode each URN: write such a query whole, in a string URL, as
  `setUrlParams` would encode the parentheses. On LinkedIn's versioned
  API, only a 401 is a token to renew for a read (lookups, statistics): a
  403 is about scopes or roles, and must never mark a channel to
  reconnect.
- A LinkedIn mention is data beside the text (`LinkedInOptions.mentions`:
  the page's exact name and URN): the text keeps `@Name`, readable, which
  counts as written, and `littleTextOf` writes `@[Name](urn)` where
  `mentionSpans` finds it, every reserved character of little text escaped.
  Pages only: no API open to Peal finds a member's URN. A link card is
  LinkedIn's article (`linkUrl` with `linkTitle`; one image becomes its
  thumbnail), and a PDF goes through the Documents API, alone
  (`linkedin-documents.ts`).
- Meta's adapters hand Meta public media URLs (`MediaForPublishing.publicUrl`,
  two hours), check the daily publishing quota before Threads and Instagram
  containers (Instagram's on the host its channel's connection names, from
  `PublishingAccount.connection`, the same container flow on both), and read Graph refusals with
  `#shared/infrastructure/platforms/graph-refusal.ts`, whose rate limits wait
  as long as `X-Business-Use-Case-Usage` says.
- Derive whatever an adapter sends from the request's `idempotencyKey` and
  `startedAt`, which every run of an attempt shares.
- An adapter whose publish is several requests that the `sequenced` steps
  cannot model implements `PlatformClient` itself and journals its progress
  on the call's row (`PublicationProgress`, `publication_calls.progress`:
  ids and states, never content), committed before each request that can
  make the post live; a resumed run reads it. TikTok's
  (`platforms/tiktok/`): a FILE_UPLOAD goes live only with its last 10 MB
  chunk, so `uploading` starts over and `finishing` polls status/fetch; a
  PULL_FROM_URL init is the commit, so `pulling` without an answer is
  unconfirmed, `pulled` polls. Its steps (`TikTokProgressSchema`) are
  persisted contract (`fixtures/persisted/publication-calls`). TikTok's
  post ids are int64s: read them from the answer's text, never as JSON
  numbers. A post only its creator sees has no public id: it is published
  under its `publish_id`, without a permalink.
- Scheduling asks `AccountRules` what each channel's own account refuses
  (TikTok's creator info: audiences, interactions, longest video; photos on
  a server without `TIKTOK_MEDIA_URL_PREFIX`), and lets the post through
  when the platform cannot say: the adapter checks again. Tests that need
  none pass `AccountRules.none`, `publishingWith`'s default.
- Adapters get tokens only through `PlatformCredentials`, which
  `ChannelAccess` backs (`ChannelAccessCredentials`), and media only through
  `MediaForPublishing`, which the media context's `MediaForPlatforms` backs:
  ready assets of the post's workspace. Fail with `TokenRejected` only when
  the platform refused the token before doing anything: the token is renewed
  and the call made once more. Mastodon's adapter takes a 401 or 403 as a
  refused token only with Mastodon's JSON error; without it, a proxy on the
  way answered, and the call is `PlatformUnavailable`.
- Adapters reach platforms only through `publicHttpClient`,
  `publicHttpClientWith({ timeout })` for uploads, or `publicStreamedPost`
  for a whole file sent in one request of a declared length. Test them against the
  loopback fakes in `test/publishing/fakes/` (and the sign-in flows against
  `test/channels/fakes/`).
- A journal row found in flight is resumed (`PlatformPublisher.resume`, the
  gate's `Resume`), never sent again blindly: Bluesky looks the record up and
  creates it only when absent, Mastodon resends under the same key while its
  window holds, checked again just before the post goes out, X searches the
  account's recent posts and Pinterest the board's Pins, and an adapter that cannot tell (LinkedIn) answers
  unconfirmed. A resume refuses a post only when nothing can have gone live,
  and a target whose cancel was requested is never resumed.
- Tell how each target ended through `PublicationOutcomes`, once, in the
  transaction that settles it (`recordTargetRun`, and `claimPostRun` for
  missed targets). `NotifiedPublicationOutcomes` keys the notice by target and
  round, and a bug in telling is logged, never stops publishing.
- A post's text and media are checked against each platform with
  `#publishing/domain/text-length.ts`, `content-rules.ts` and
  `platform-rules.ts` when it is scheduled, never while it is a draft.
  `peal-contract/post-text` is the clients' copy, kept equal by
  `test/publishing/api/contract.test.ts`: change both together. Compare video
  durations in whole milliseconds, as the media API shows them.
- X's weighted count, `countLinks` and X's search for a lost post find links
  as twitter-text's `extractUrlsWithIndices` does, ported in
  `#publishing/domain/x-links.ts` (copied, identical, in
  `peal-contract/src/x-links.ts`): with or without a scheme, on a top-level
  domain of its list, so `peal.social` is a link and `localhost` is not. Its
  patterns are Unicode-aware, so it reads the long s and the Kelvin sign as
  letters that fold onto no ASCII one, and starts a bare domain after a
  character outside the Basic Multilingual Plane as twitter-text's UTF-16
  units do. `test/publishing/domain/x-links.test.ts` runs twitter-text's
  conformance cases (`x-conformance.ts`); an emoji counts 2 by Unicode's
  current list (`RGI_Emoji`), longest first. The twitter-text package is not
  a dependency: the domain cannot import it, and it pulls core-js 2 and a
  2019 emoji list.
- A post's target carries options only its channel's platform knows
  (`TargetOptionsSchema`, `#publishing/domain/target-options.ts`), tagged by
  `platform`, in `publishing.post_targets.options` (JSON the domain decodes;
  null on rows from before options and on platforms that take none). A
  platform's options are one `Schema.Class` in its own file
  (`youtube-options.ts`, `tiktok-options.ts`, `pinterest-options.ts`,
  `google-business-options.ts`): every field optional, so a
  draft holds them unfinished, a `platform: Schema.tag(...)`, and a
  `problems()` method listing what the platform would refuse (`missing`,
  `tooLong`, `invalid`, by field). Adding a platform's options is adding its
  class to that union, its copy to `peal-contract/src/target-options.ts`
  (kept equal by `test/publishing/api/contract.test.ts`), its fields to the
  web app's `#posts/target-options.ts`, and their strings to the
  `Posts.Options` catalogues. Drafts refuse only options of another platform
  or channel; scheduling refuses what `problems()` lists
  (`optionMissing`, `optionTooLong`, `optionInvalid`). Options change only
  with the draft, and an update replaces them all. Adapters read their own
  from `OutgoingPost.options`, with
  `post.options.pipe(Option.filter(Schema.is(YouTubeOptions)))`; keep stored
  options decoding (`fixtures/persisted/post-targets/options.json`).
- Mastodon, Bluesky, Threads and X take options too (`mastodon-options.ts`,
  `bluesky-options.ts`, `threads-options.ts`, `x-options.ts`). A thread is
  one target: each adapter sends **thread-wide** options with every part
  (Mastodon's all; Bluesky's languages, and its label on a part with media;
  X's paid partnership, and its AI label on a part with media) and **root**
  options with part 0 only (X's reply settings, community and sharing), and
  sends a field only when it says more than the platform's default, so a
  post without options goes byte for byte as before. A rule between an
  option and the post's media (Threads' link attachment, text-only) lives
  in `mediaOptionViolationsOn` (`content-rules.ts`, run by
  `checkPublishable`, so checks and scheduling share it), never in
  `problems()`, which sees options alone. A Mastodon content warning counts
  in the text's limit (`countedText`, `counted-text.ts`; the contract's
  `countedText` is the clients' copy): `violationsOn`, `previewOn` and the
  composer's counter measure it. X documents no tier for its options: a
  400 or 403 on a post that carried any is `BadRequest` `optionRefused`
  (`platforms/option-refusal.ts`), never retried, X's words never kept,
  only when X's answer points at an option (`blamesOptions` in
  `x-refusal.ts`: the parameter, field or resource it names, or its words
  naming the field); any other refusal keeps X's problem type as its code.
- Bluesky's gates (`replies`, `disableQuotes`) are records of their own,
  a threadgate under the thread's first post's key and a postgate under
  each post's, written with the post in one `com.atproto.repo.applyWrites`
  (all or nothing, so `lookUp` by the record key still tells the truth); a
  post without gates keeps `createRecord`. They need scopes channels
  connected before Peal asked for them lack: `AccountRules` refuses them
  there (`optionInvalid`, `gateViolationsOn`) and `AccountStandings`
  describes them (`optionNeedsReconnect`), both from `ChannelGrants`; a
  403 on a gated write is `optionRefused`, never a refused token.
- A field the web composer shows only for some values of another (an
  event's dates) says so with `shownWith` in `#posts/target-options.ts`:
  `isShown` hides it and `optionsOf` leaves its value out, as the domain's
  `problems()` refuse it there. A day and a time on a clock that is not the
  reader's (Google Business Profile's `startsAt`, on the location's) is a
  `localTime` field, text as `2026-11-27T09:00`, never an instant.
- Posts show only ready media of the workspace: `LibraryAttachableMedia`
  reads each asset through the media context's `MediaLibrary`, and anything
  else answers `UnknownMedia` when a draft is saved or scheduled.
- Workflow tests (`test/publishing/infrastructure/harness.ts`): set `TestClock`
  before building a cluster (`onServerAt`); wait until a job is parked
  (`isSuspended`, `isTargetWaiting`) before moving time; count calls with
  `callsOn` for your own channels. `test/publishing/posts-server.ts` runs the
  use cases and workflows on an in-memory cluster. `AppLive` gives publishing
  an engine that runs no job, so scheduling through it fails. Only
  `test/app/cluster.test.ts` runs a SQL runner.
- A time asked for is judged as of when the request came (`asReceived`):
  account-rule checks that take minutes never turn "now" into
  `ScheduleInPast`.
- An adapter that streams a large file takes its upload slot before the
  request is opened (`MediaForPublishing.held`), never inside it: a platform
  drops a request left waiting.

- Checking a post (`PostChecks`: `POST …/posts/validate`, `validate_post`,
  `peal post --dry-run`) and scheduling one share `violationsOf`
  (`publishing/application/publishability.ts`): add a rule there, never to
  one of the two. A check writes, claims and locks nothing, and answers
  everything at once (channels and media that are not the workspace's,
  violations by channel, the time, the plan's room, duplicates) with what
  each channel receives (`previewOn`). Its connection is not journaled
  (`checksOnly` in `#workspace/api/security.ts`). A check reads every part
  of a thread, as scheduling does: `checkRequestFrom` decodes `followUps`
  with the first part, their media are looked for with it (`shownMedia`),
  a violation of a later part names it by `part`, and each channel's
  preview lists the later parts with their own counts (`parts`), whether
  or not its platform takes any.
- A post made in one call (`PostScheduling.send`: `posts.send`, bulk,
  import, `create_post`, `peal post`) is refused (`DuplicateContent`, 409
  `DuplicatePost`) when another post of the workspace sends the same content
  (`contentOn`: the channel's text, NFC and trimmed, and its media ids,
  for every part of a thread in order, a post of one part reading as
  before parts so the digests kept still match) to
  one of its channels less than `duplicateWindow` from its time: 23 hours,
  the shortest day, so a post that repeats daily passes (the contract's
  `duplicateWindowHours`, kept equal by the contract test). `allowDuplicate`
  lets it through. `admit` (`duplicate-guard.ts`) checks under a transaction
  advisory lock per channel and digest; `remember` keeps
  `post_targets.content_digest` (a SHA-256, never content) whenever a post is
  scheduled or moved. Scheduling a draft, moving a post and reposting are
  never refused, and only posts that go out or went out count (scheduled,
  publishing or finished, on a target pending, publishing, published or
  unconfirmed). It is apart from idempotency keys: a replay answers before
  it.
- `PostOutcomes.await` (`posts.send?wait=`, `GET …/posts/:id/outcome`,
  `await_post`, `create_post`'s `waitSeconds`, `peal post --wait`) only
  reads the post again every half second, 60 seconds at most
  (`maxOutcomeWait`): no transaction or lock is held while a request waits,
  and the durable job stays the only thing that publishes. A process lets
  `maxWaitingRequests` wait at once, `maxWaitingPerWorkspace` of them for
  one workspace, and answers one more as if its time had run out. A
  thread has its result on a channel once every part went out or one
  ended the round: between two parts its target is `publishing`, with
  its `liveParts`, so a wait shorter than a part's delay runs out first. Keep the bound under what every proxy waits. In tests, never move virtual time while a
  send is in flight, as a job that is starting can lose its wake-up: wait on
  a post already sent, and move time until the waiting fiber answers.
- A CSV row is a post of one part with one text for all its channels: no
  column carries a thread's parts, texts by channel or options (an
  unknown column refuses the file), which go through `send` or `bulk`,
  whose items take `followUps` like any post.
- Several posts in one request (`PostBatches`: `posts.bulk`, 50 at most,
  `create_posts`; `posts.import`, 100 CSV rows) are each one
  `PostScheduling.send`, in its own transaction, in order, one at a time:
  never one transaction for all, so the month's count and the duplicate
  check hold across them. They answer 200 item by item, a refusal being what
  `send` answers, as data (`PostRefusalSchema`); only a request without
  post:schedule, or one that cannot be read, fails whole. An item's key is
  its own, or the request's with its kind and place joined by NUL (`keyAt`),
  which no header or cell can hold. The import reads the file in the domain
  (`csv.ts`, `post-import.ts`: RFC 4180, local times through
  `fromWallClock`), checks every row (`PostBatches.check`, which skips a row
  its key already made) and makes nothing unless all are valid. A time of
  its own on each channel is several items: a post has one schedule. Media
  of its own on a channel is not built: a post has one media list. The web
  app has no bulk screen yet: it would call these.
- `PostSearch` (`posts.search`, `list_posts`, `peal posts list`) pages by
  keyset on `(scheduled_at, id)` or on `id`, which orders by creation
  (UUIDv7), never by offset; a cursor is opaque (`PostPositionSchema`) and
  continues its own sort only. Publishing stores no platform: the platform
  filter asks `WorkspaceChannels` about `PostRepository.channelsUsed`, so a
  disconnected channel's posts are not found by platform. `posts.list` (a
  range of 62 days) stays for calendars. Add a filter to `PostFilter`,
  `pageConditions`, the contract's query, `list_posts` and the CLI together.

- The approval gate holds on every way of making a post: `send`, each
  post of a batch and each row of an import go through
  `PostScheduling.send`, and whoever the gate lets ask (`mayAsk`) may
  send several as one. A held post takes its room in the month, counts
  for the duplicate refusal as one that goes out, and gets no job, so a
  wait for its outcome answers at once. `PostChecks` says a post would be
  held (`awaitsApproval`, from `ApprovalGate.holds`, which records
  nothing): it refuses nothing.

## Capabilities and lookups

- Clients ask what a channel takes rather than learn each platform:
  `GET …/platforms/capabilities` and `GET …/channels/:channelId/capabilities`
  (`PostingCapabilities`, channel:read, API keys and read-only OAuth clients
  included) answer `capabilitiesOf`
  (`#publishing/domain/platform-capabilities.ts`): `platformRules` with
  Peal's own ceilings, the options field by field, the rules between them,
  the lookups, and whether analytics counts posts there (`CountedPlatforms`,
  which `AnalyticsCoverage` backs). The description has a version
  (`capabilitiesVersion`): add fields, platforms, lookups and restrictions
  under it, and raise it only when a field changes meaning or leaves.
- A platform's description is that of any of its channels; a channel's
  follows the way in it came through (`ChannelConnections`, which
  `ListedChannelConnections` backs from the channels context). A lookup
  only one way in has names it (`connection` on its definition:
  `linkedinOrganizations` on `linkedinPage`), so `lookupsOn` and
  `lookupNamed` leave it out for the others (404 `LookupNotFound`), and
  `CountedPlatforms.onChannel` (`countsChannel` in analytics' domain) says
  a LinkedIn profile's posts are not counted while `countedPlatforms`
  lists LinkedIn. A lookup that cannot run without a field says so
  (`required`).
- Lookups spend the platforms' allowance: `pacedLookups`
  (`publishing/application/paced-lookups.ts`) lets a channel's reach its
  platform `lookupRunsPerMinute` times a minute (30), failing past it as
  `RateLimited` (`lookupPace`, 429 with `retryAfterSeconds`), and answers
  the same query on the same channel from its last answer for
  `lookupAnswerLifetime` (a minute), in this process; a failure is never
  kept. Every run also takes one of the platform's `lookupDailyRuns`, for
  the whole server (`PlatformQuota`, bucket `lookups:<platform>`, by UTC
  day; past them `RateLimited` `lookupBudget`), since a channel's pace
  bounds neither all channels together nor ever new inputs; an answer the
  platform gives every channel alike (`shared` in `lookups`: YouTube's
  categories) is kept for all of them for `sharedAnswerLifetime` (a day).
  An adapter added to `PlatformLookupsLive` is paced with the rest; give
  its platform its `lookupDailyRuns`. Whatever else reads a platform
  for a member's GET goes through the same paced lookups, as a channel's
  standing does (`AccountStandings` runs the `tiktokCreator` lookup):
  never a platform call per request.
- Nothing in a description is written twice. A field's type and values come
  from its schema (`describeFields`), `required` from what `problems()`
  misses in options with nothing chosen, and the rest (`maxLength`,
  `ifLeftOut`, `forbiddenCharacters`, `pattern`, `lookup`) from the options
  class's static `notes`, built on the constants `problems()` uses; rules
  between two options are its static `constraints`
  (`OptionConstraint`: `needsOneOf` and `notWith` between yes-or-no
  options, `neededWith` and `onlyWith` for an option that depends on
  another's value, as Google Business Profile's on its post type; the
  contract's union and the CLI's `constraintLine` list each kind). A new option gets its
  entry in `notes`, typed by the class's fields;
  `test/publishing/domain/platform-capabilities.test.ts` fails on a field
  left undescribed, and `test/publishing/api/capabilities.test.ts` keeps the
  figures equal to `peal-contract/post-text` and the fields to the
  contract's options.
- What an account narrows is an `AccountRestriction`, read by
  `AccountStandings` when the channel is described (TikTok's
  `creatorRestrictions`, which say beforehand what `creatorViolationsOn`
  refuses: change both together). A platform that cannot be asked answers
  `unread` with the reason, never an error.
- A lookup is account data an option refers to
  (`#publishing/domain/lookup.ts`): a name prefixed by its platform, an input
  struct of optional fields with its `notes` (`required` names those the
  lookup cannot run without, as the board of `pinterestBoardSections`:
  `query` answers none without them), a `LookupQuery` and a
  `LookupResult` member (`items` and `nextCursor`), and one adapter in
  `platforms/platform-lookups-live.ts`, whose registry does not compile
  without it. `ChannelLookups` checks channel:read, the platform and the
  input before the platform is asked. The contract copies the names, one
  flat `LookupInputSchema` holding every lookup's fields, and the result
  union (`test/publishing/api/lookups.test.ts` keeps them equal). An option
  filled by a lookup names it in its `notes`.
- Lookup adapters call the platform through `PlatformCredentials.withToken`
  and `publicHttpClient`, not the channel's gate: a member waits for the
  answer, and a gate may hold a long upload. They fail with `TokenRejected`
  only for the platform's own refusal of the token, `RateLimited`,
  `PlatformUnavailable`, or `LookupInputRejected` when the platform refused
  what the input asked (a cursor it never gave); they never change anything
  on the platform. Test them against the loopback fakes.
- `GET …/channels/:id/tiktok-creator` stays, for the composer; the
  `tiktokCreator` lookup answers the same view.

## Tags, signatures, channel sets and default options

What a workspace saves to stay organised is workspace content, kept in
publishing's schema, naming nobody: each goes with its workspace
(`WorkspacePostStore.deleteAll`), and none is ever handed to an adapter.

- A tag (`#publishing/domain/tag.ts`, `PostTags`) is a name, one per
  workspace whatever its case, and a colour of the palette
  (`TagColourSchema`: names each client draws with its own theme, never a
  CSS value). A post's tags are `Post.tagIds` (`posts.tag_ids`, a uuid
  array with a GIN index): no part of what it says, so they change whatever
  its status (`tagPost`), and are written on their own
  (`PostRepository.setTags`), never with the post's status, so a job that
  settles the post never undoes a tagging. Deleting a tag takes it off its
  posts in the same transaction, and tagging a post or saving a draft
  with tags claims the workspace's tags (`TagStore.claim`) before it reads
  them and locks the post, in that transaction: no post keeps the id of a
  tag deleted meanwhile. Reading needs post:read; writing a tag
  and tagging a post, post:update. An update of a draft that says nothing
  of tags keeps them. Add a filter on tags as any other (`PostFilter`).
- A signature (`signature.ts`, `Signatures`) is text a workspace ends its
  posts with, meant for the workspace, a platform or one channel, one
  default per scope. Applied, it is text of the post: `signed` puts it
  under a text, a blank line between, and never under a text that ends
  with it already, so the platforms' limits count it when the post is
  scheduled and nothing is added twice. `withDefaultSignatures` signs the
  post's text with the workspace's default, and gives a channel whose own
  or platform's default is another a text of its own (an override) signed
  with that one; `withSignature` signs every text with one signature. A
  post in several parts is signed under its last part (the post itself
  when none follows), every other part kept; the web composer signs by
  hand the same way (`withSignatureUnderLastPart`). The contract's `signedText` is the clients' copy
  (`test/publishing/api/saved-items-contract.test.ts` keeps it, and every
  limit, equal).
- A channel set (`channel-set.ts`, `ChannelSets`) is channels kept under a
  name, with the options posts take on some. It keeps the channels it was
  given: one disconnected since stays listed (`unavailable`), is left out
  of a post that names the set and told to whoever made it
  (`PostWithTargets.dropped`, the view's `warnings`), never silently; a
  post left with no channel is `UnknownChannels`. Saving a set takes
  connected channels only.
- A channel's default options (`ChannelDefaults`,
  `publishing.channel_defaults`) are what a new post takes on the channel
  when it gives none there. They are a starting point: saved unfinished as
  a draft's may be, and checked by `problems()` when a post that took them
  is scheduled, as options it wrote itself.
- `PostPresets.fill` is the one place a post is filled in from all of
  these, before it is checked and kept as any other: `PostDrafts.create`
  and `update`, `PostScheduling.send` (after the idempotency replay, so a
  retry never fails on a set deleted since) and `PostChecks.check` call it
  with what the request names (`PresetAsk`: `channelSets` by id or name,
  `defaultSignatures`, `signatureId`). Options are taken in this order:
  the post's own, a named set's, the channel's defaults; only a new post
  takes defaults, never a draft that is changed. Nothing is applied unless
  the request asks, but default options: an API caller's text is never
  signed unasked.
- `PostDrafts.duplicate` copies a post, whatever its status, into a new
  draft of whoever asked, every part included: what the workspace no
  longer has (a channel, a media, a tag) is left out rather than refused.
