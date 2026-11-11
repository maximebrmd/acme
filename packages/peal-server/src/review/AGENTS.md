# Review and approval

- A post that needs an approval is `awaitingApproval` in publishing: it has
  its time, counts in its month and keeps its media (`MediaInPosts`), and
  has no job. Every use case that schedules passes the `ApprovalGate`
  (`publishing/application/approval-gate.ts`) in the transaction that saves
  the post (`throughGate`, in `PostScheduling`): a new way of scheduling
  calls it too, never `schedulePost` and `startJob` alone. The review
  context backs the gate (`ReviewApprovalGate` over `ApprovalIntake`);
  `ApprovalGate.open` is for tests. `HeldPosts` is publishing's side of a
  decision (`release`, `sendBack`), for the review context only: `release`
  starts the job, and dies unless the gate says an approval stands. It
  schedules, so it checks the plan as scheduling does (`withinPlan`): in a
  workspace that went over its channels or members while the post waited,
  the approval is refused (`PlanLimitReached`; `WorkspaceOverPlan` to a
  link's holder, who is told nothing of the plan), nothing is recorded,
  and the post keeps waiting.
- A held post moved without being asked for again (a queue's reshuffle)
  takes `ApprovalGate.follow` (`ApprovalIntake.followed`), never `admit`:
  its pending request takes the new time and keeps its requester, those
  who decide are not asked again, and the post is never admitted, whoever
  moves it.
- The policy is per workspace (`review/domain/approval-policy.ts`): `never`,
  `contributorsAndApplications`, `always`. An application is an API key or
  an OAuth client (`Actor.subject.clientId`). Where posts wait, whoever has
  post:create may ask (`maySubmit`), and acts on drafts and waiting posts
  only (`mayChange`); staff acting as a member neither ask nor approve
  (`post:approve` is withheld), and read a post's review without
  commenting or resolving: a comment shows under the member's name to
  people outside the workspace.
- An approval covers a subject, publishing's `approvalSubject`: the text,
  the media in order with their alt text, the per-channel texts, the
  channels and their options. Never the time. The review context keeps its
  SHA-256 only (`subject_hash`). Add what a new kind of content says to the
  subject, or an approval would cover a post that changed. Reviewers are
  shown all of it: `ReviewedChannel.options` (publishing's `plainOptions`)
  on the link's page and the review, which the web app writes out with
  `#review/shown-options.ts`, leaving none out.
- A decision is for what its reviewer was shown. The link's page and a
  post's review (`review.thread`, `get_post_review`, `peal review show`)
  answer the post with the request that waits, read request first, so the
  post shown is never older than the request; approving and asking for
  changes send back its id and `subjectHash` (`ShownRequest`, `asShown`),
  from every client, and another request or hash is `ApprovalChanged`
  (409): the client shows the post again. Never decide for "whatever
  waits", and render a decision's post from the answer that gave its
  request, never from another query.
- Whoever heard a post waits (`post.approval_requested`) hears what became
  of it: the same event again with its new time when it is moved (the
  request's key and its time; members are not asked twice),
  `post.approved` then `post.scheduled` unless late,
  `post.changes_requested`, `post.unscheduled` when it is taken back to
  draft, `post.cancelled`, or `post.scheduled` alone when a member who may
  schedule did. A new way for a post to stop waiting tells one of these.
- An approval after the post's time (beyond `scheduleGrace`) publishes
  nothing: `releasePost` takes the post back to draft, still approved.
- `review.approval_requests` is the record of who approved what: a decided
  row never changes. An application approves only what a member asked for
  in person (`takesApplicationApproval`), or the policy that holds
  applications would hold nothing. No route lets an application approve
  its own post: `ReviewLinks.create` refuses it a link that approves
  (`ApprovalNeedsPerson`; the command line offers view and comment only),
  and a link that names no member approves nothing an application asked
  for.
- Review links: 256 random bits (`LinkTokens`), of which only the SHA-256
  is stored; the address is `PUBLIC_URL/review#<token>`, so the token
  reaches no server's address logs, and clients send it in the
  `x-review-token` header. Never put it in a path, a query, a log or an
  error. A link shows one post through `ReviewedPosts` and nothing else of
  its workspace, and closes with the post (`LinkClosed` says why).
- `VisitorReview` is the only use case without an actor: the link's token
  is the credential. Its writes pass the `VisitorGuard` (per address and
  per link, in this process, then Turnstile when the server has keys) after
  the `ReviewVisitor` middleware (16 KiB bodies). What anyone types goes
  through `review/domain/plain-text.ts` and is stored and served as plain
  text: clients render it as text, never as markup.
- A comment's selection is kept as its quote and where it started
  (`comment-anchor.ts`); views find it again in the current text
  (`locate`), and say when it is gone.
- Tell the rest of Peal what a review did through `ReviewOutcomes`, in the
  transaction that did it. It is the seam for other listeners (outgoing
  webhooks): add them beside `NotifiedReviewOutcomes`, not in the use
  cases. Notices name who acted by kind (`ReviewParty`), never by name.
- A visitor's name is kept 24 months (`review-retention.ts`, the
  `review.retention` cron): the privacy policy and the docs' guide say so,
  change them together. Peal takes no address from a visitor and mails
  nobody without an account: anyone could name anyone's address on a
  link's page. The workspace hears of a link's comments once an hour at
  most (`commentKeyOf`), so a link's holder cannot flood its members.
- The contract copies the domain's lists and limits, kept equal by
  `test/review/api/contract.test.ts`. Test use cases on
  `test/review/support.ts` (the real gate and stores over
  `posts-server.ts`).
