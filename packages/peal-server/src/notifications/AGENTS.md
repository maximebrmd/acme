# Notifications

- Emails go through the `Mailer` port: Resend when `RESEND_API_KEY` is set,
  otherwise SMTP at `SMTP_URL`, from `MAIL_FROM`. Requests never wait for
  them.
- Render every email from `notifications/domain/english.ts` and `french.ts`,
  in the reader's locale. Account emails go through `SendAuthEmail`.
- Notices are events, not sentences: the context stores what happened as
  typed data (`NoticeEventSchema`: a post published, failed with its reason,
  or unconfirmed; a channel to reconnect now or soon), the web app writes it
  from its catalogues, and emails are rendered when they go out. Add members
  and fields to an event; never rename or remove one, since notices are
  stored with it.
- Other contexts tell people through `Notify`, with a key that names the
  event, such as `post-target:<id>:<round>`: a key seen before
  (`notifications.sent_notices`) notifies nobody. Keys hold ids and instants,
  never content. Notify runs in a TransactionRunner transaction that joins
  the caller's, so the key, the notices and the start of `DeliverNoticeV1`,
  which emails them after the commit, go together. Publishing calls it
  through `PublicationOutcomes`, the channels context through
  `ChannelNotices`.
- Who hears about an event is `recipientsOf`: for a channel, the members who
  can act on it (`audienceOf`: `channel:connect`); for a post, its author
  (`NoticeRequest.author`), whatever their role, and the members with
  `post:schedule` who chose `everyPost`, off by default; for a post without
  an author, or whose author left the workspace, every member with
  `post:schedule`; for billing, every member with `billing:manage`. Every
  notice reaches the app; `NotificationPreferences` say which are also
  emailed (failed and unconfirmed posts, channels to reconnect and
  deliveries failing on a webhook endpoint, `webhookFailing`, and a
  recycling rule that ended, `recyclingEnded`, and a feed that stopped,
  `feedStopped`, by default,
  not published posts; billing's and a webhook endpoint turned off always,
  as no preference covers them). A preferences change writes only what it names.
- `Notify.resolve(key)` says an event was dealt with: its notices are marked
  read for everyone and its pending emails skipped. Publishing resolves a
  round once a member confirms or reposts it.
- `DeliverNoticeV1` is persisted contract: its tag, its payload (`key`), its
  activities `send/<n>` and `abandon`, its clocks `retry/<n>`. It retries a
  transport that refuses for now over about five hours, and skips readers who
  left the workspace (or, for a channel, may no longer connect channels:
  `readerPermissionOf`) or turned the email off meanwhile.
- The inbox belongs to a user, and `authorizeInbox` decides who acts on it:
  the user, or an OAuth client not bound to a workspace, with
  `workspace:read` to read and `workspace:write` to change; staff
  impersonating the user only read.
- The weekly digest (`SendWeeklyDigests`, `notifications.weekly-digest`,
  Mondays 06:19 UTC) is an email, never a notice: notices hold no
  content, and the digest names posts by the start of their text. It
  goes to those who turned `email.weeklyDigest` on (off by default)
  and only to them, paged by user id on the partial index
  `notification_preferences_weekly_digest`, so a server where nobody
  did reads one page of nobody. `DigestSources`
  (`ContextDigestSources`) reads each one's workspaces through the
  workspace context's `ActorsNow` (as a request of theirs would be
  decided now), publishing's `PostAttention.week` where they hold
  post:read, analytics' totals where they hold analytics:read: the
  workspace's own posts, counted and the first five of each week
  (`digestListed`), never a comment or its author. Weeks and days are
  UTC (`digestWeekOf`), as readers' zones are not known. The week is
  claimed in `notification_preferences.weekly_digest_week` before the
  email goes (`claimDigest`, which also reads they still want it), never
  as a notice key, as `sent_notices` keeps keys forever and the
  preferences row goes with the account: a run again sends no second,
  and one refused for good is not sent again that week. Emails go one
  at a time, a refusal for now tried again (`DigestPaceRef`). It ends
  with the link to the notification preferences, which turn it off.
