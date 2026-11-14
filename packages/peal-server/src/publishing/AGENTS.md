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
- An override (`TextOverride`, any part's) may give its channel media of
  its own (`media`, absent for the part's, written only when given, so
  subjects and digests of posts without stay as they were). Read a
  channel's through `partsOn` or `sentTo` (the content as the channel gets
  it: what `checkPublishable`, the account rules and the preview check),
  never `content.media` for a channel. `shownMedia` lists every channel's,
  so `mediaFor`, `MediaInPosts` (`showingMedia`'s SQL reads
  `text_overrides` and the parts' `overrides`) and copies see them; a
  change of an override keeps its media (`changedOverride`), a recycling
  variant too (`sayingVariant`), and a deletion that leaves one none
  gives the channel the part's media again. An override's `text` stays
  required: a channel given media alone carries the post's text.
- `PostScheduling.dropTarget` (`removeTarget`, `remove_post_target`, `peal
  posts remove-target`) takes a pending target off a scheduled or held
  post (`target-removal.ts`): cancelled with `dropped`
  (`post_targets.dropped`), the channel's overrides in every part gone
  with it (`withoutChannelOf`), the last one refused (`LastTargetLeft`),
  one dropped already answered as it is (a retry is safe), under the
  post's then the targets' locks, so a job's claim is either before
  (refused) or after (it skips the cancelled target). A scheduled post
  passes the gate as a move does (`throughGate`, its job stopped when it
  is held); a held one keeps its request, which takes the new subject
  (`ApprovalGate.follow`). Dropped targets count for nothing in
  `outcomeOf`, the approval subject, a review (`keptTargets`), copies,
  `post.scheduled`, the search's channel filter and the staff console's
  count; they stay cancelled when a post is missed. Every way back to
  draft (`unschedule`, `HeldPosts.sendBack`, a late `release`) saves
  through `saveBackToDraft`, which deletes them and their channels'
  overrides, and `targetsOn` never reuses one, so a channel chosen again
  starts pending. Webhooks hear `post.cancelled` naming the target alone,
  `scope: "target"` (`PostEvents.dropped`). Stored shapes:
  `fixtures/persisted/posts/text-overrides.json` and the dropped row in
  `post-parts-storage.test.ts`; rolling back past them is in the server
  guide.
- `platformRules[platform].followUps` says what parts become there
  (`thread`: X, Bluesky, Mastodon; `comment`: Facebook Pages, Instagram,
  LinkedIn pages, YouTube, one first comment) and how many; the
  contract's copy and the capabilities' `followUps` follow it. Scheduling
  checks each part as a post of the platform, a comment by its own
  `comment` rules (`partRulesFor`: text alone, its limits; violations
  carry `part`, its place from 1) and refuses parts elsewhere
  (`tooManyParts`), on a LinkedIn profile too (`followUpsThrough`, by the
  channel's connection, which the router and the capabilities read). A
  platform joins only with an adapter that reads `OutgoingPost.replyTo`:
  the router refuses a later part to any other (`partsNotSupported`).
- A first comment takes the inbox's comment permission, so the server
  sends comments only where `PEAL_INBOX_PLATFORMS` names the platform
  (`threadedPlatformsWith`, in `XThreadsLive`, beside `X_THREADS`; the
  reference's default sends none): elsewhere it is a part too many, and
  the capabilities give `followUps` null. A channel whose grant lacks the
  scope (`commentScopesOn`, `domain/first-comments.ts`, the inbox's
  constants) is refused `partsNeedReconnect` by `AccountRules`, and
  `AccountStandings` says so (`partsNeedReconnect` restriction). The
  adapters wrap the platform's client in `withFirstComments`
  (`platforms/first-comment.ts`): part 0 is the post, part 1 a comment
  under `replyTo.root` through `sequenced` steps whose commit is the one
  comment call (Facebook's and Instagram's `POST /{id}/comments`,
  LinkedIn's socialActions comments as the page, YouTube's
  `commentThreads.insert`, 50 units of the project's quota, uncounted by
  `PlatformQuota` as the inbox's replies are) and whose `lookUp` lists
  the post's newest comments (`commentAmong`: the only one by the account
  since `startedAt` less a minute with the same text, `found` or
  `unknown`, never `absent`; a list a next page may extend past the
  attempt's start settles nothing). A comment's refusal fails the part
  alone, never the token: only LinkedIn's 401 in its own words, YouTube's
  401 and Meta's invalid token (not a missing permission) are refused
  tokens (a bare 401 or 403 without Meta's error code is not); a LinkedIn 403 (a content administrator, whom LinkedIn does not
  let comment: `comment.needs`, `commentNeeds` in the capabilities) is
  `permissionDenied`, its 429 waits a minute, and a LinkedIn comment is
  kept by its URN. A comment that fails after the post went live leaves
  the target failed with its live post, the post `partiallyPublished`
  (its notice says only the comment did not go out: `PostFailed.notSent`),
  and a repost sends the comment alone. The router marks a target with a first comment
  `post_targets.first_comment` when it sends the post itself
  (`markFirstComment`), so `PublishedTargets` lists it by its first live
  part from then on (`listed_at`, kept by `listedOf`, on the
  `post_targets_listed` index), whatever the comment became.
  `PostFollowUp.leaveOutRest` (`withoutRest`) publishes a failed or
  unconfirmed target whose first part is live as that part,
  `partsLeftOut`, sending nothing; it serves threads too. A post scheduled
  with a first comment where the server sends comments no more is refused
  at part 0 (`firstCommentsOff`), never sent without its comment.
  Scheduling refuses a first comment on a YouTube video made for kids
  (`commentsTurnedOff`). None of the
  four platforms deletes or edits a live post from Peal; the day one does,
  its adapter must delete the comment with the comment call
  (`first-comment-live-post.test.ts` fails first).
- A post's poll (`PostContent.poll`, `domain/poll.ts`, in
  `publishing.posts.poll`, null without one) goes with its first part:
  `platformRules[platform].poll` (X, Mastodon with its defaults, Threads,
  whose duration is its own: `platformDecides`) bounds it, and
  `pollViolationsOn` (run by `checkPublishable`) refuses it elsewhere
  (`pollNotSupported`) and past each bound, a file beside it included.
  Choices are trimmed when decoded (`Schema.Trim`), so the choice
  measured is the one sent, and a repeated one is `pollChoiceRepeated`.
  The approval subject and the duplicate digest add it only when there is
  one; copies, signatures, recycling variants, media removal and the
  export keep it, as every `new PostContent` must (it defaults to none).
  The router hands it to part 0 (`OutgoingPost.poll`) and refuses one the
  platform's rules do not take (`pollNotSupported`); X sends `poll`,
  Mastodon `poll` without `media_ids`, Threads `poll_attachment` on a
  text container. LinkedIn's poll (a question of its own) and Instagram's
  (Facebook Login only) are not sent yet.
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
- `LivePostChanges` (`application/live-post-changes.ts`) unpublishes a
  live post: it deletes a published target from its platform, every part
  of a thread the last first, so a run that stops midway leaves a thread
  that reads from its start. It takes `livePostChangePermission`
  (`post:publish`, `domain/live-post-change.ts`: an OAuth client needs
  `workspace:publish`, staff impersonating never have it), and refuses
  before any call (`removable`, then `LivePostHolds`): `notPublished`,
  `alreadyRemoved`, `changeInProgress`, `channelUnavailable` (from
  `PlatformCredentials.account`), `notSupported`, `noPlatformId`,
  `boostRunning` (`AdsLivePostHolds`: a boost of the ads context that is
  not over). The change (`publishing.live_post_changes`, ids and platform
  ids, never content) is inserted with its job (`ChangeLivePostV1`, payload
  `{ changeId }`) in one transaction under the post's and the target's
  locks; a partial unique index keeps one pending change a target, so
  requests sent together make one. A failed change keeps its `partsLeft`,
  which the next request takes up. Nothing is reposted or reopened: a
  removed target stays `published` with `removedAt` (the month's count,
  the usage and X's metered count stay), and `PublishedTargets` lists it
  no more. X bills each deletion: nothing counts it yet; the priced half
  of usage must.
- `ChangeLivePostV1` (`workflows/change-live-post.ts`, persisted contract:
  `claim`, `call/<part>/<n>`, clocks `retry/<part>/<n>`, `settle`) deletes
  part by part through the channel's gate (`RemoveLivePost`, volatile like
  every gate call). Each call writes `call_started_at` and commits before
  the platform is called, so an erasure sees it in flight; a run that
  finds a call begun calls again, as deleting is safe to repeat and "not
  found" is success (`alreadyGone`, but not after a call of Peal's that
  never ended, which may have deleted it: `beginCall` answers `resumed`). So, unlike a publish, a call that
  failed is retried (`decideRemoval`, `domain/removal-decision.ts`): the
  policy's `unavailableBackoff`, its rate-limit bounds, then `failed` with
  a code. `settle` writes the change, the target's `removedAt` and tells
  `LivePostEvents` (`ToldLivePostEvents`: the webhooks'
  `post.unpublished` and `post.unpublish_failed`, and analytics' and the
  inbox's `postRemoved`, which end their collection as `removed` and keep
  what they read) in one transaction. Erasure stops pending changes'
  jobs and is refused while a call is in flight
  (`LivePostChangeStore.lockOpen`).
- `livePostSupport` (`domain/live-post-support.ts`) says per platform
  whether Peal deletes there, or why not (`noApi`, `permission`,
  `unverified`): the one table the capabilities (`livePost`), the use case
  and the docs' table read (`test/publishing/domain/live-post-docs.test.ts`
  compares). Deleting adapters are `<platform>/<platform>-live-post.ts`, in
  `platforms/live-post-clients-live.ts`'s registry, which does not compile
  without an entry per platform (`notDeleting` where none);
  `test/publishing/platforms/live-post-clients.test.ts` keeps it equal to
  the table. Each refuses an id it cannot tell is the account's before any
  call (`invalidPlatformId`). Mastodon's 404, Pinterest's 404 and a 401 or
  403 count only with the platform's own JSON error, X's "gone" only
  with its `resource-not-found` problem (a bare 404 is X unreachable, and
  no message's words count); Bluesky's PDS answers
  a record gone with no `commit`; LinkedIn and Facebook Pages stay
  `unverified` until their permission for a deletion is confirmed. The
  boost hold (`AdsLivePostHolds`, `boostRunning`) is read under the post's
  and the target's locks, which creating a boost does not take, and a
  target with a pending change is still promotable: before Facebook or
  Instagram deletes, make boost creation lock the target (post first) and
  refuse one with a pending change, and leave such targets out of
  `PromotablePosts` (`test/publishing/domain/live-post-boost-hold.test.ts`
  fails the day one does).
- An edit is a kind of change too (`kind` `edit`): `LivePostChanges.editTarget`
  replaces the text of one part (`part`, from 0) on one channel. It takes
  the same permission, and is refused `approvalRequired` to a member the
  approval gate holds (`ApprovalGate.holds`; unpublishing stays open to
  them); `editable` answers the part or the reason (a failed removal
  leaves the target editable; a part not live is `noPlatformId`). The text
  is made storable (`storableText`), checked as scheduling checks that
  part (`editViolationsOn`, `domain/live-post-edit.ts`: `violationsOn` on
  `partAlone`, options counted, empty refused), and held on the change
  (`live_post_changes.text`) only while it is pending: `finishChange` and
  `failChange` clear it, and the job's history, its payload and the gate's
  call (`EditLivePost`, `{ changeId, channelId, platformPostId }`) never
  hold it; the gate's side reads it, and the target's options, through
  `LivePostEdits`. The job is `ChangeLivePostV1`, its call decided by
  `decideRemoval` (`edited` beside `removed`: an edit is safe to repeat),
  under the same activity and clock names (`fixtures/persisted/
  ChangeLivePostV1/edit-call.json`). Settling makes the text that part's
  own on the channel (`PostRepository.amendText`, which writes the part's
  overrides alone, never `update`), sets `post_targets.edited_at`
  (`markEdited`), keeps the new digest (`remember`) and tells
  `post.edited` or `post.edit_failed` (with `part`, never the text; the
  webhooks only). Peal keeps no earlier text. The registry's entry per
  platform is `{ remove, edit }`, each an adapter or a marker
  (`notDeleting`, `notEditing`), and `livePostClientsWith` refuses on the
  blocker of the kind asked (`livePostSupport[platform].edit`, a test keeps
  both equal). Mastodon's editor reads the status first (`read:statuses`;
  a 403 with Mastodon's JSON is `permissionDenied`, the channel to
  reconnect) and sends `media_ids`, `spoiler_text` and `sensitive` again
  as the status read has them (never the target's options, which may be
  stale: only the text changes), and no `language`, which Mastodon keeps,
  as Mastodon clears whatever else an edit leaves out, refusing a status
  with a poll (`pollNotEditable`), which the edit would destroy; a 404 of
  the read is `postGone` only once `verify_credentials` accepts the token
  (401 there is `TokenRejected`); Google's patches
  `summary` under `updateMask=summary`. A post gone from the platform is
  `BadRequest` `postGone` (a 404 counts only with the platform's own JSON).
  LinkedIn, Facebook Pages, Pinterest and X stay `unverified` for edits.
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
- X bills the server for each post. Each part sent to X while the parts
  before it are live (so every part of a round) checks first that the
  meter has room for it and every part after it (`PostMeter.fits`, a
  check, not a hold: one more meter read a part), then is claimed as it
  is sent (`PostMeter.claim`; `MeteredXPostsLive`: `postCreate`, or
  `postCreateWithUrl` when the text sent holds a link by `countLinks`, from
  billing's `XPassThrough.rates`, on the `xApi` meter; a poll is one post).
  Refused, nothing is sent, in the standing's own words:
  `paymentMethodRequired` (no payment method), `paymentFailed` (its last
  payment failing), `perAccountPricingRequired` (a legacy plan),
  `xCeilingReached` (the `x` ceiling or the cap before a first paid
  invoice); a part refused once parts of the thread are live (the standing
  changed, or room another claim of the account took since: another post
  or X channel, X's reads) fails as `xThreadCut`, the thread cut there. All
  are reposted once fixed. A typed failure of the client gives the claim
  back; an unconfirmed outcome keeps it, as X may have billed it, and so
  does a claim whose part never went out because the process stopped or
  the give-back met a database failure (logged): a repost claims again.
  Each retry claims again and gives back, so a meter may see pairs. On a
  server that does not bill the meters are unmetered and X goes out as
  before. Tests provide `PostMeter.unmetered`. Checking a post with a
  time (`PostChecks`, `posts.validate`, the composer's previews) warns of
  its channels on X the meter has no room for now (`unbilledOn`, warning
  `xNotBilled` with the reason): a warning, never a refusal, as the
  standing may change before it is due. `publishingWith` and
  `publishingBehind` give scheduling `PostMeter.unmetered`; the server's
  `PublishingLive` gives it `MeteredXPostsLive`.
- Platform calls go through the `PlatformPublisher` port, one at a time per
  channel through `ChannelGate`, whose calls are volatile: post content never
  lands in the cluster tables. The gates run `RoutedPlatformPublisher`, which
  reads the post, takes its text on the channel and hands it to the
  platform's `PlatformClient`; tests use `FakePlatformPublisher`. A whole
  publish runs inside the gate: uploads, processing waits, token renewal,
  the post and its confirmation.
- A post's `shortenLinks` (`posts.shorten_links`, carried by `copyOf`,
  kept by an update only when the request names it) is decided when the
  post is made: a new post that does not say (`PostDrafts.create` and
  `PostScheduling`'s `scheduleNew`, so feeds, the API, MCP, the CLI and
  imports alike) takes the workspace's default through
  `ShortLinkDefaults` (`ShortLinksShortLinkDefaults`, the shortlinks
  context's `ShortLinkSettings.defaultFor`: false on a server without a
  base), and keeps it; `false` said wins. Tests take
  `ShortLinkDefaults.none` (in `ReferencesTest` and `posts-server.ts`).
  It is read in one place: `outgoing`, where the routed publisher replaces the links
  `linksToShorten` takes (`domain/short-links.ts`: written with a scheme,
  shortenable as the shortlinks context's rule says, a copy kept equal,
  longer than a short address, never on Pinterest, whose help page
  refuses shorteners) by the addresses `LinkShortener` answers
  (`ShortLinksLinkShortener`, the shortlinks context's `ShortLinks.issue`:
  one per target, part and destination, so a resume sends the same
  text). A link is never replaced by something longer, so the text sent
  is never longer than the text written and no check (`violationsOf`,
  `previewOn`, the duplicate digest) changes; the text stored is never
  touched. A table that cannot be written fails the attempt as
  `databaseDown`: a post never goes out with long links for that. A
  server without a base, and an edit of a live post, send the text as
  written. Tests take `LinkShortener.none` unless they test this.
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
  (LinkedIn members' posts cannot be read back). A `lookUp` that knows
  the platform holds the post, not live yet, answers `pending`: unsettled
  while publishing, and on a resume read again after each of
  `confirmDelays`, then unconfirmed `stillProcessing` (only Facebook's
  reels and video stories answer it).
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
  ledger (`PlatformQuota`, `publishing.quota_usage`, whose days a week past `publishing.quota-retention` deletes daily, and whose buckets never name a person: a bucket by member is a keyed digest, `Pseudonyms.ofPlatformMember`; by Pacific day,
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
  unconfirmed, `pulled` polls. Its steps (`TikTokProgressSchema`), and
  Facebook's reels' and stories' (`FacebookFormatProgressSchema`), are
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
- Every place a post becomes `finished` tells `PostEvents.finished` with
  its targets, in that transaction: `finishIfSettled` (the last target
  settling, `completePostRun`), `claimPostRun`'s missed targets, a cancel
  that leaves nothing to send, and `confirm` revising the outcome. The
  webhook keys it by the highest target round and the outcome, so a
  repost that ends, or a confirmation that changes the outcome, tells
  `post.finished` again, and a second settling never does.
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
- Instagram and Facebook take options too (`instagram-options.ts`,
  `facebook-options.ts`), and YouTube and TikTok more. An option may name
  a file of the library (`thumbnailMediaId`, `coverMediaId`): its notes
  give `contentTypes` and `maxByteSize`, which make it a `media` field in
  the capabilities. Such a file is not media the post shows: `shownMedia`
  stays what platforms get, and `referencedMedia` (`named-media.ts`) is
  every file the post depends on, which `mediaFor`, `PostChecks`,
  duplication and `PostRepository.showing` (so `MediaInPosts`) read; an
  account's own rules read the shown files only. `checkSavedOptions`
  refuses a named file in a channel set or a channel's defaults, and
  `keepingMedia` drops one gone from a copy or a released draft.
  `mediaOptionViolationsOn` checks the named file's type and size and
  every rule tied to the media (a reel's fields on one video, TikTok's
  video and photo fields, a frame within the video, Facebook's title on a
  video), given all the files.
- YouTube sets a thumbnail after the video is up and processed
  (`withThumbnail`, after `processed` and on a `found` lookup): it spends
  a unit of `PlatformQuota` bucket `thumbnails:youtube` by Pacific day
  (`YOUTUBE_DAILY_THUMBNAILS`), streams the image to thumbnails.set, and
  journals `upload_sessions.thumbnail_set`, so a resumed run neither
  sends nor pays again once that is written. A run cut between the call
  and the journal spends a second unit and calls again (setting a
  thumbnail twice changes nothing), and a send lost on the network keeps
  its unit: accepted,
  as it only makes the ledger count more than YouTube did and never
  passes the budget; journal "call begun" before the call, as the upload
  does, if that ever matters. Nothing about it fails the post: a refusal, the
  budget spent or the file gone is `Published.thumbnailNotSet`, kept in
  `post_targets.thumbnail_not_set` beside `keptPrivate`. New YouTube
  fields, TikTok's cover frame and photo fields, Instagram's reel fields,
  collaborators (on the post's own container, never a carousel item) and
  Facebook's video title are sent only when chosen; Instagram's alt text
  goes on images and a carousel's images. Meta names no parameter in a
  code: a container refused while it names collaborators keeps Meta's
  code, never `optionRefused`.
- A post format is a kind of post whose rules differ from a feed post's,
  chosen by the options' `format` and never guessed from the files
  (`post-format.ts`, `postFormatOf`: `feed` and nothing are none): an
  Instagram `story`, a Facebook `story` or `reel`. Its rules are
  `platformRules[platform].postFormats[format]` (`PostFormatRules`, each
  figure cited with its page), whose media, count of files, need of one
  and parts replace the platform's whole; `sendsText: false` (a story)
  sends, counts and checks no text, and the check's preview says
  `textNotSent`, a note, never a violation. Read the rules a post follows
  only through `rulesFor(platform, options)` (`violationsOn`,
  `mediaViolationsOn`, `partViolationsOn`, `previewOn`, `followUpsOn` and
  the router), never `platformRules[platform]` for a post; the contract's
  `rulesFor` is the clients' copy, which the contract test compares format
  by format. The capabilities give `postFormats` only on platforms that
  have formats, under the same version. A story refuses a feed post's
  options in `problems()` (with `onlyWith` constraints on `format`), so
  `mediaOptionViolationsOn` skips them there. The duplicate digest adds
  the format when there is one, so a feed post's digests stay as they were
  and a story is never the feed post's duplicate. `PublishedTargets` rows
  carry their `format`; `from(cursor, limit, without)` leaves formats out
  in its query, so a page stays full: analytics and the inbox leave out
  stories there, and ads offer feed posts only.
- Instagram's story is a container with `media_type=STORIES` and its one
  file, no caption, alt text or collaborators, published without a
  permalink; its `lookUp` reads the held container only (a resumed run
  answers `unknown`), never the caption search. Facebook's reels and video
  stories (`meta/facebook-formats.ts`) start on `video_reels` or
  `video_stories`, have Meta fetch the file on the upload host
  (`MetaHosts.facebookUpload`, the Page's token in the `Authorization`
  header, which traces redact), poll `?fields=status` until the
  `uploading_phase` is done (`video_status` says `processing` mid-upload
  too), and publish with the `finish` phase (`finishPhase`), then read the
  status again: Published only once `publishing_phase` is done; a
  non-null `processing_phase` error, before or after the finish, is
  MediaRejected `processingFailed` (a lookUp answers `refused`); still
  processing, it is confirmed over `videoPublishingWait` (10 minutes,
  `videoStepTiming`), then unconfirmed `stillProcessing`, never sent
  again. A photo story uploads its
  photo unpublished in `prepare`, every run its own, and publishes it with
  `photo_stories`. Their `prepare` journals a first step
  (`preparing`, with a random `run` id, over nothing, or over what the
  resume that called it read) before any upload, and their `commit` the
  video's or the photo's id (`finishing`) over that run's own first step
  only (`PublicationProgress.replace`, a compare-and-set), before the
  finish or `photo_stories`; a journal it cannot write sends nothing
  (`PlatformUnavailable`), and a run whose first step another run wrote
  over sends no finish (unconfirmed `interrupted`). Their `lookUp` reads
  what the run holds, or on a resume what the journal names, and never
  rules a post out from Meta's answers (its samples show `not_started`
  after an upload, and `publish_status: "published"` before a story is):
  a reel is `found` when its `publishing_phase` is done, a video story
  when that phase is done and the Page's `stories` list it by its
  `media_id`, a video still being made live `pending` (and on a resume a
  look that failed for the moment too: a resumed run reads it on over
  the same looks, then answers unconfirmed `stillProcessing`, which may
  also mean a finish that never went), a photo story `found` by the
  listing or `unknown`. A resumed call whose journal holds a `preparing`
  step and no finish answers `absent`: the finish never went, so it
  uploads and finishes anew (a second upload shows nowhere). A call begun
  with nothing journaled (by a release before this one, which may have
  sent its finish), under another key, or with a journal this release
  cannot read, is `unknown`, unconfirmed `interrupted`. So a story or a
  reel is never sent twice. A reel is published under its
  video's id, a story under its `post_id` only (a finish without it is
  confirmed by the listing), neither with a permalink. Meta's 30 reels a Page a day have no endpoint or
  documented code: its refusal keeps Meta's code.
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
- Test files share one database and run together: a test that runs a
  purge of every workspace (`forgetExpiredKeys`) does so at virtual days
  well before every other test's (2025), so it deletes nothing of theirs.
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
  of its own on a channel is that channel's override's `media`. The web
  app's import page (`…/posts/import`) calls `posts.import`, a dry run
  then the import; it has no bulk screen.
- `PostAttention` counts several workspaces' posts at once for the
  overview across workspaces (scheduled in the next 7 days, awaiting an
  approval, finished in the last 7 days `failed` or `partiallyPublished`,
  or `unconfirmed`, as the search's `outcome` filter names them) and lists
  their agenda by `(scheduled_at, id)`, an excerpt of each text
  (`excerptOf`, 140 characters as a reader counts them): ids as one
  `anyUuid` parameter, no permission checked, as the caller decided.
  Each count is its own read on an index that bounds it
  (`posts_workspace_scheduled_at`, `posts_workspace_awaiting_approval`,
  `posts_workspace_finished_attention`), so its cost follows what is
  counted, never the posts a workspace keeps: read such a plan on a
  database with long histories (about 20,000 posts a workspace), which
  `seed-scale.ts`'s 90 a workspace does not show. The agenda is a keyset per
  workspace (a lateral read on `posts_workspace_scheduled_at` from the
  cursor, a page at most each), the text and channels read for the page's
  rows alone.
  `PostAttention.week` gives one workspace's week and the week after it
  for the weekly digest, by each post's time: three reads of
  `posts_workspace_scheduled_at` over the fortnight (the counts, then the
  first `listed` that went out and the first planned), whatever else the
  workspace keeps (`weekStatements`, whose plans
  `post-attention.test.ts` reads among years of posts).
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
- A queue (`queue.ts`, `Queues`, `publishing.queues`) is a weekly timetable
  of slots (a weekday and a wall-clock time, through `fromWallClock`) in an
  IANA zone, for some channels and one channel set at most; one per name
  whatever its case, `maxQueuesPerWorkspace` (20), one default (a partial
  unique index): the first queue is the default, saving one as the default
  takes it from the other, written first. Its limits are constants of
  `queue.ts`, copied in the contract and kept equal by
  `saved-items-contract.test.ts`. A slot is taken while a post with that
  `posts.queue_id` is scheduled, awaiting approval or publishing at exactly
  its instant (`QueueStore.takenFrom`): nothing else is stored, so moving,
  unscheduling or cancelling frees a slot with no write, a slot change
  moves no post, and a hand move keeps `queueId`. `PostRepository.update`
  writes `queue_id` only when a placement changed it, so a write that
  settles a post never brings back a queue deleted meanwhile; deleting a
  queue clears its posts' `queue_id` under the queue's lock, deleting a
  channel set clears `queues.channel_set_id`.
- A post is placed (`Placement`: now, at, queue) by `PostScheduling`: for a
  queue, the slot is decided inside the transaction that saves the post
  (`onQueue`: `QueueStore.lock`, the queue read again, `nextFreeSlot` from
  `received`, the post's own slot left out), then every rule of a time
  chosen by hand applies, `roomInMonth` in the slot's month (never a later
  one). Lock order, always: the idempotency key's claim, the queue, the
  post's row, then the month and what the gate takes; `enqueue` locks the
  queue before the post, as a queue's deletion holds the queue and then
  writes its posts. A request naming no channel and no set goes to the
  queue's (`queueChannelsDropped` for those disconnected since).
  `PostChecks` computes the slot unlocked. `QueueHasNoRoom` (`noSlots`,
  `full` within `queueHorizonDays`). Recycling reuses `onQueue` and
  `move`: add no other way of placing a post.
- `PostScheduling.reshuffle` moves a queue's waiting posts (scheduled or
  awaiting approval, after `received`) onto its slots as they now are,
  hand-moved ones included: `reshufflePlan` (`domain/queue-reshuffle.ts`)
  gives post n, in time-then-id order, the n-th slot no publishing post
  holds, ignoring where waiting posts are, so the plan is the same however
  often it is made and two posts on one instant end apart. Planned once
  under `QueueStore.lock` (`queuedFrom`), then batches of
  `reshuffleBatchSize`, one transaction each: the queue's lock, the queue
  read again (a changed timetable, `sameTimetable`, stops it `changed`, and
  so does a slot of the batch held by a post the plan did not see, one
  added between batches),
  the posts' rows in id order, then each move through `moved`, in a
  savepoint of its own so a `PlanLimitReached` (it stops `planLimit`)
  keeps the moves before it. A post on its slot is not written; one moved,
  sent back or cancelled since the plan is left alone; a scheduled post
  that someone who only asks cannot move is `unchanged`. Each move is a
  hand move's but for the gate: a held post is moved `keepingHeld`
  (`ApprovalGate.follow`: its request follows the new time, still the
  requester's), so a reshuffle never releases one, whoever runs it; only a
  hand move (`reschedule`, `admitting`) by someone whose posts need no
  approval schedules a held post.
- `PostDrafts.duplicate` copies a post, whatever its status, into a new
  draft of whoever asked, every part included: what the workspace no
  longer has (a channel, a media, a tag) is left out rather than refused.
- A recycling rule (`domain/recycling-rule.ts`, `Recycling`,
  `publishing.recycling_rules`) makes a source post (scheduled, publishing
  or finished, unpublished since or not) repeat. Its due instants count
  from the source's time (`anchorAt`) in its zone (`recycling-interval.ts`:
  `dueAt`, a month shorter than the day on its last day), never from the
  step before; a missed one is skipped (`plannedAt`). The next post is
  made once the latest one's time (`lastDueAt`) passed: one ahead. Each
  occurrence is a new post (`posts.recycling_id` and `occurrence`, unique
  together), copied with `copyOf` (`post-copies.ts`, which `duplicate`
  shares) and sent by `PostScheduling.sendOccurrence`: no preset, signature
  or default option filled in, `remember` instead of the duplicate refusal,
  a queue's slot at or after the due instant (from a millisecond before),
  the rule's lock (`claimed`) first in the transaction and the rule written
  after the insert (`made`), so a send that rolls back leaves the rule as
  it was. It acts as the starter now (`RecyclingActors`, backed by the
  workspace context's `ActorsNow`): gone, or no longer able to ask, ends
  the rule `starterGone`; `lockedOut` waits. Any other refusal ends it with
  its reason and `RecyclingNotices` (`RecyclingEnded`, keyed by the rule
  and its `resumptions`), in one transaction under the rule's lock.
  `makeDue` (cron `publishing.recycling`, every ten minutes from 4) pages
  by `(last_due_at, id)`, makes one occurrence a rule a run, skips a rule
  another run holds (`FOR UPDATE SKIP LOCKED`), and the cron sets
  `peal.publishing.recycling.overdue` (active rules whose latest time, a
  queue's slot included, passed over 30 minutes ago, less those the run
  left to wait: a starter locked out, a source awaiting approval), which
  an alert watches. Lock order: the rule's row, then the queue, the
  post's row, the gate, the month and the duplicate guard's advisory lock;
  nothing locks a rule after those. Deleting a queue leaves its rules
  alone: the next run ends them `queueGone`. Erasure deletes rules before
  posts; `forgetAuthor` clears `started_by`, and the next run ends the
  rule.
- A follow-up rule (`domain/follow-up-rule.ts`, `FollowUpRules`,
  `publishing.follow_up_rules`) acts on one post, or on every post a
  channel publishes after it started, once it has `likes` likes: its
  `comment` under the post, a repost, or both, once each a target
  (`follow_ups` unique on target and kind but for those `cancelled`,
  whatever rules act on it: a rule stopped leaves the kind to the next,
  and a post rule another rule already follows up in full is refused
  `alreadyFollowedUp`),
  within `followUpWindow` (7 days) of the post going live there,
  `maxFollowUpsPerChannelDay` (10) a channel and UTC day. What each
  platform carries is `followUpSupport` (`domain/follow-up-support.ts`,
  from each platform's pages: LinkedIn's terms forbid both), and a
  channel's own abilities `followUpsOn` (the operator's X threads, the
  Bluesky repost scope from `ChannelGrants`, which sign-in never asks:
  a repost rule on a channel without it says `reconnect`, and the
  reconnect with `reposts=true` asks it, as chat's; analytics' coverage):
  `FollowUpNotPossible` refuses a rule no channel can carry, or whose
  comment is too long for one that could. `FollowUps.arm` arms a target
  in the transaction that settles it (`armedOutcomes`, around
  `PublicationOutcomes.settled`), and `armPublished` a post already out
  when its rule starts or a change gives it a kind. The `publishing.follow-ups` cron (every ten
  minutes from 9) reads the likes analytics last counted
  (`FollowUpCounts`, analytics' `PostLikes`: never a platform call, so a
  rule never makes a read happen, X's paid ones included; a resumed X
  comment does list the account's recent posts, `client.resume`, Peal's
  own unmetered cost as for posts), expires what
  its window passed with why, and triggers the rest one transaction each
  under the follow-up's lock (`FOR UPDATE SKIP LOCKED`), as the starter
  is now (`RecyclingActors`: gone ends the rule `starterGone`), only when
  the rule is approved or the starter's posts need no approval
  (`mayAct`, `ApprovalGate.holds`: a rule the policy comes to hold waits
  for `approve`, which approves any rule not approved, and expires
  `notApproved`; a change by a member in person who approves posts and
  is not held approves it), on a post still live, the channel still
  able, the channel's day counted under its lock (`claimChannelDay`).
  A channel's rule whose channel was disconnected ends `channelGone`.
  Staff acting as a member start and change none. `SendFollowUpV1`
  (payload `followUpId` and `attempt`, keyed by both, so a follow-up
  armed again runs as a new execution; activity `send`, persisted
  contract) checks `mayAct` again just before the call, putting it off
  as a passing refusal when it no longer holds, then sends it as
  engagement sends a reply: the row is the
  journal (`attemptedAt` committed before the call), a resume never sends
  blindly, and the gate (`SendFollowUp`, `ResumeFollowUp`, ids only)
  claims the call first (`claimCall`). `RoutedFollowUpPublisher` hands a
  comment to the platform's `PlatformClient` as the post's next part
  (`replyTo` the last live part and the first, the follow-up's id as the
  idempotency key, with `:<attempt>` after the first, X's claimed on
  `PostMeter`), a repost to
  `PlatformReposts` (`platforms/platform-reposts-live.ts`: Bluesky's
  `app.bsky.feed.repost` record under a key from the attempt, read back
  on a resume; Mastodon's reblog, which Mastodon answers once). A refusal
  that passes (the platform unreachable, a rate limit) arms it again; any
  other fails it with the platform's code. A follow-up still `sending`
  an hour on is handed over by the cron (`settleStranded`). The account
  export holds the rules with their follow-ups, never who started or
  approved one; erasing a member clears `started_by` and the approval's
  `approvedBy`. Erasure deletes the rules with what they armed; a call already under way when
  its workspace is erased may still go out (a gate claims no call for a
  row gone, so the window is the call itself).
- A feed (`domain/feed.ts`, `Feeds`, `publishing.feeds`) is a web feed a
  workspace follows: RSS 2.0, Atom 1.0 or JSON Feed 1.1, told from the
  body (never the content type), read through `FeedSource`
  (`infrastructure/feeds/http-feed-source.ts`: `publicHttpClientWith`, a
  byte past `maxFeedBytes` read so a longer answer is `tooLarge`, three
  redirects followed here, each through the guard, 20 seconds for the
  whole read, no credentials, its spans off and logs by host only, the
  validators of the last read sent back, a 304 `notModified`). XML is
  parsed by sax in strict mode (`feeds/xml-tree.ts`): it never expands an
  entity a DOCTYPE declares nor fetches an external one, an unknown entity
  fails the parse, and depth and element bounds stop a hostile document;
  each format's mapping is a pure function tested on fixtures. What an
  item says is made storable (`storableLine`, `textOfHtml` then
  `storableText`), its addresses absolute and HTTP(S) only, and its
  identity kept as its SHA-256 (`feed_items`, unique per feed), never the
  text: no log, trace, notice, webhook or cluster table holds what a feed
  says. Adding a feed, moving it or resuming it reads it at once and
  records what it holds as `skipped` `existing`, and `since` keeps an
  item dated before from being made. Each read of an address a member
  gives takes one of `feedReadsPerHour` (`FeedReads`, `feed_reads`).
- `Feeds.poll` (cron `publishing.feeds`, every ten minutes from 6) pages
  the due feeds by `(next_check_at, id)`, four at once, starts no read
  past `runBudget` (eight minutes) and says what it left; it takes each
  feed with a lease (`leaseFeed`: `next_check_at` moved `readLease` on
  under `FOR UPDATE SKIP LOCKED`), so no transaction is held over a read.
  The starter is resolved as a recycling rule's is (`RecyclingActors`,
  `mayChangeStarted` in `started-by.ts`): gone stops the feed
  `starterGone`, locked out keeps the last validators so the items come
  back. New items (`newItems`: unseen, oldest first, `maxItemsPerRun` a
  run, `maxItemsPerDay` a UTC day, the rest `tooMany`) become, in draft
  mode, a draft (`PostDrafts.create`, in one transaction with the item's
  record; a channel gone makes a draft for none), in queue mode a post
  sent by `PostScheduling.send` after its item is recorded `claimed` in a
  statement of its own, keyed `feed:<feed id>:<digest>` (key and
  fingerprint), so a run that finds a claim younger than `claimLifetime`
  (23 hours) sends it again and is answered the first post; an older claim
  is `abandoned`. What `send` refuses becomes a draft (`heldBack` with the
  reason); a queue gone does too, and stops the feed `queueGone`. A failed
  read postpones the feed (the host's `Retry-After`, else as long as it
  has failed, an hour to a day); a 410 stops it `gone`, seven days of
  failing `unreachable` or `notAFeed`. Stopping tells `FeedStopped`
  (`FeedNotices`, keyed by the feed and when it stopped) in the
  transaction that stops it; the cron sets `peal.publishing.feeds.overdue`,
  which an alert watches. A feed keeps its 500 newest items: the
  idempotency retention's run prunes the rest and read counts a day old.
  Erasure deletes feeds before posts; `forgetAuthor` clears `started_by`.
- Feeds and the guard: a name that resolves to a public address when the
  guard checks it and to another when fetch connects is not caught (the
  guard says so). Pinning the connection to the checked address while
  keeping the Host and SNI is not done: Bun's fetch and Node's (where the
  tests run) take no common option for it, and Peal reaches every host
  through the one fetch client. HTTPS on port 443 with certificate
  validation narrows it to a host holding a valid certificate for the
  outside name.
- With `attachPicture`, an item's picture is imported through
  `FeedPictures` (`LibraryFeedPictures`, the media context's
  `MediaLibrary.importMedia`, as the starter, who needs media:upload)
  before the item's transaction, and attached, described by the item's
  title, only when it is a ready image; anything else leaves the post
  without it and writes `feed_items.picture_skipped`. The import takes
  `kinds: ["image"]`, so a video or a document is refused from its first
  bytes and never stored. A crash after the import leaves an asset
  unattached in the library: accepted. A claim sent again imports again.
