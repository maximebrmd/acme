<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Web front

- Build screens from `peal-ui` components and Tailwind classes; add no other
  stylesheet.
- Add a shadcn component by running `bunx shadcn add <name>` in
  `packages/peal-ui`, which reads its `components.json`. Point the component's
  `cn` import (the CLI writes `"cn"`) at `../lib/utils` and its sibling imports
  at `./`, rewrite function components as arrow functions, take every
  user-facing string (labels such as a dialog's close button) as a prop, then
  run `bun run fix`.
- Use theme tokens (`text-muted-foreground`, not `text-gray-500`) and
  component variants and sizes rather than restyling a component; the
  `@shadcn/lint` rules check pages against peal-ui. Dark mode follows the
  operating system (`prefers-color-scheme`).
- Pages live under `src/app/[locale]/`: the auth pages (`sign-up`, `sign-in`,
  `verify-email`, `forgot-password`, `reset-password`, `invitations/[id]`),
  the contract functions anyone reaches (`cancel`, `withdraw`, and
  `contract-request`, the page of the link emailed to a request's
  address),
  the OAuth pages (`device`, `oauth/workspace`, `oauth/consent`), the
  platforms' redirect URI `connect/[platform]/callback` (which shows the
  account picker when a sign-in reached several accounts), the ad
  networks' `connect/ads/[network]/callback`, Meta's data
  deletion status `data-deletion/[code]`, the page behind a review link
  `review` (no sign-in, noindex; the token is the address's fragment, read
  in the browser), and the signed-in
  app: `app` (workspaces), `app/notices`, `app/notices/preferences`,
  `app/account`, `app/[workspaceId]/channels`, `…/media`, `…/calendar`,
  `…/analytics`, `…/inbox` and `…/inbox/[threadId]` (for `engagement:read`:
  not-found otherwise, as for staff acting as a member), `…/ads`,
  `…/drafts`, `…/posts/new`, `…/posts/[postId]`, which opens
  a draft or a scheduled post in the composer, and shows a post that went
  out in `PostDetail` (each channel's status, attempts and reasons, with
  repost and confirm, and its analytics), `…/approvals` (the posts that
  wait), `…/settings` (with `members`, `invitations`, `tags`, `signatures`,
  `channel-sets`, `queues`, `recycling`, `api-keys` and `webhooks`) and `…/billing`. The staff console is
  `admin` (the system's health), `admin/users`, `admin/users/[userId]`,
  `admin/workspaces`, `admin/workspaces/[workspaceId]`,
  `admin/contract-requests` (through `deskRead`), `admin/audit` and
  `admin/legal`: its layout and pages read the staff endpoints with the
  visitor's cookies through `staffRead` (`#staff/server.ts`), which shows
  the not-found page for any 404, and its actions are mutations from
  `#staff/atoms.ts`. `admin/legal` (legal requests, `legalRead`) is linked
  and served for staff with the legal role only (`answersLegalRequests`):
  its form (`LegalRequestForm`, `#staff/legal-request.ts`) sends nothing
  without the authority, the reference, the legal basis and what the
  request covers, `LegalAnswerView` shows what came back, and the page
  says before anything is entered that each answer is recorded, as staff
  must be told (Code du travail, art. L1222-4): keep that notice.
  `ImpersonationBanner`, in `AppShell`, shows while staff act as someone.
- The web app reports its errors to `POST /api/client-errors`:
  `src/instrumentation-client.ts` (uncaught errors, unhandled rejections),
  `app/[locale]/error.tsx` and `app/global-error.tsx` (the error pages, in
  the reader's language), and `src/instrumentation.ts` (`onRequestError`).
  Build reports with `reportOf` (`#errors/report.ts`), which cuts each field
  to the contract's limits and keeps no query, id or address; browsers send
  them without cookies, each error once, ten a page at most. The release
  comes from `PEAL_RELEASE`, through the locale layout's `peal-release`
  meta tag.
- Pages fetch through the client derived from `peal-contract`, with
  `@effect/atom-react`: query atoms come from `PealApi` in `src/api/client.ts`.
  Browsers call `/api`; server code calls `PEAL_API_URL`.
- Server Components read the signed-in user with `currentUser()` from
  `#auth/session.ts` (GET /api/me with the request's cookies, once per
  request); the header uses `currentUserOrNone()`, so pages stay up when the
  API is down. Gate a page by the permissions `/api/me` lists for the
  workspace.
- To render a query on the server, give it a `serializationKey`, run
  `prefetch([…])` from `src/api/prefetch.ts` in an async Server Component
  after `await connection()`, and wrap the client component in
  `HydrationBoundary`. `prefetch` does not forward the visitor's cookies, so a
  query that needs them, and anything that depends on the browser (its time
  zone, the current time), renders after hydration (`useHydrated`,
  `useMounted`). Tiptap editors set `immediatelyRender: false`.
- Settings pages read Better Auth's members, invitations and sessions in
  atoms (`#settings/atoms.ts`), decoding each answer with `authCall`, and
  offer only the role changes its routes accept (`#settings/member-rules.ts`).
  Invitations go through `invite` (`#settings/invite.ts`): Better Auth's
  client types roles from its own defaults. Sign-in opens `next` in the
  language the account keeps (`landingLocale`), which account settings save
  with `updateUser`.
- Client components call Better Auth through `authClient` (`#auth/client.ts`).
  During an OAuth authorization it sends the page's signed query with every
  POST, and Better Auth resumes the authorization after any call that sets
  the session cookie; calls that must not resume it, such as setting the
  active workspace, go through `workspaceClient`. Better Auth error codes map
  to `Auth.errors` in the catalogues.
- Keep the OAuth pages' views (`WorkspacePickerView`) apart from their state,
  so tests render each state: peal-web has no DOM test environment. A view
  under test imports nothing from `#i18n/navigation.ts`, which needs Next to
  run: take links as props or children (`DraftItemView`,
  `MediaUsageNotice`).
- Show dates in the reader's time zone. next-intl's server provider hands the
  client the server's zone (UTC in the image): `ViewerTimeZone`
  (`components/viewer-time-zone.tsx`), in the locale layout, sets the
  browser's on the shared provider once the page has hydrated, so every
  page's dates follow it. `InTimeZone` (`components/notices/in-time-zone.tsx`)
  sets a given zone on part of a page.
- The header's `NotificationBell`, beside the account menu, polls
  `GET /api/me/notices/unread` every 30 seconds while the tab is visible and
  when it is shown again (`useRefreshWhileVisible`), and announces arrivals
  in a status region. Polling works through any proxy and needs nothing
  shared between servers; keep it. Write notices from their events with
  `src/notices/notice-text.ts`.
- The composer's options come from `TargetOptionsSection`
  (`components/posts/target-options-panel.tsx`), which renders the fields
  `#posts/target-options.ts` describes for each selected channel's platform
  (text, number, tags, choice, yes or no, toggle, and `lookup`, a choice
  among what a lookup answers for the account, shown `under` another once
  that one is chosen; `media`, a file of the library by its id, picked
  with `MediaPicker` among the `contentTypes` and size it takes;
  `initial`, `inverted` and `within` for TikTok's
  boxes), turns them into the contract's `TargetOptions` with
  Schema, and shows each `option*` violation under its field. `optionsOf`
  checks each field filled in against the contract alone and answers what
  is wrong (`OptionProblem`: too many tags or mentions for its `maximum`,
  a value the API would refuse), never "no options": the field shows it
  as typed, and the composer neither saves nor schedules until it is
  fixed, so no choice is dropped unseen. `channelOptionsOf` sends a
  channel's options only when the member chose one at least (a value its
  field does not start with): elsewhere a new draft takes the channel's
  defaults, as through the API, and the composer then shows the options
  the saved draft holds, so its next save keeps them. On a TikTok
  channel, `TikTokChannelOptions` reads `GET …/channels/:id/tiktok-creator`
  and limits the fields by the creator (`#posts/tiktok-account.ts`): their
  nickname, their audiences, interactions they turned off (and set off),
  no Duet or Stitch on photo posts, "Only me" closed to branded content,
  the disclosure's label, and TikTok's consent line, as its content sharing
  guidelines require. A field shown once another holds anything (X's
  sharing with followers, once a community is written) has
  `shownWith: { filled: true }`. A field for some media only has
  `shownFor` (`video`, `photos`, or `reel`: one video alone), read from
  the attachments' kinds (`mediaKindsOf`, passed to `isShown`, `optionsOf`
  and `channelOptionsOf`; every field shows while one is being read): like
  one hidden by `shownWith`, it is not sent. The counter takes the
  channel's options (`fitOn`'s fourth argument), as a Mastodon content
  warning counts with the text, and so do `mediaFitOn`, `showsAltText`
  and `partsTaken`, which read the contract's `rulesFor`: a `format`
  (Instagram's and Facebook's first field, a feed post when nothing is
  chosen) gives a story or a reel its own media rules, and a story no text
  (`textNotSent`, said under the counters). A feed post's own fields have
  `shownWith` on `format` (`feedPost`), so a story sends none. On a Bluesky channel,
  `BlueskyChannelOptions` reads the channel's capabilities
  (`channelCapabilities`) and closes each gate its
  account must be reconnected to set (`optionNeedsReconnect`,
  `#posts/bluesky-account.ts`), with the line saying so; a gate the post
  holds stays, to be taken off. On a Pinterest channel, `PinterestChannelOptions`
  reads the account's boards, ten pages of 50 at most, and the chosen
  board's sections (`pinterestBoards` and `pinterestBoardSections` in
  `#posts/api.ts`, as `LookupChoices`): a field shows that its list is being
  read, or why it could not be with a way to ask again, and keeps a value
  the list lacks.
- Tags, signatures and channel sets each have a settings page (list,
  create, edit, delete: views in `components/<feature>/*-views.tsx`, state
  in `*-settings.tsx`, atoms in `#<feature>/atoms.ts`), read with post:read
  and changed with post:update. Their failures are explained from the one
  `SavedItems.errors` catalogue (`#settings/saved-item-error.ts`). Draw a
  tag with peal-ui's `Tag` and `TagDot`, never a colour value.
- Queues have a settings page too (`…/settings/queues`, views in
  `components/queues/queue-views.tsx`, state in `queues-settings.tsx`,
  atoms in `#queues/atoms.ts`), with each queue's next slots on its own
  clock. A save that changed a queue's slots or zone (`timetableChanged`)
  offers, to members with post:schedule and while posts wait in it,
  `QueueReshuffle` (`queues.reshuffle`, after a confirmation that says
  posts moved by hand move too; its view `QueueReshuffleView`): saving
  alone moves no post. The composer's schedule section (`SchedulePlacementFields`)
  chooses a time or a queue (`QueueChoice`, its view `QueueChoiceView`,
  the default preselected), and puts the saved draft or the scheduled post
  on the queue with `posts.enqueue`; the calendar marks queued posts and
  filters by queue, and `PostQueueLine` names a post's queue.
- Repeating posts have a settings page (`…/settings/recycling`, read with
  post:read, paused, resumed and stopped with post:schedule; `?rule=`
  marks the rule a `RecyclingEnded` notice opened it for), views in
  `components/recycling/recycling-views.tsx`, atoms in
  `#recycling/atoms.ts`, the form's request in `#recycling/rules.ts`.
  `PostRepeat`, on a post's page (scheduled in the composer, or out in
  `PostDetail`), shows the rule that repeats or made the post, or offers
  Repeat to a member with post:schedule; a new post repeats once it is
  scheduled, from its page. Refusals are explained from the
  `Recycling.errors` catalogue (`#recycling/rule-error.ts`).
- The composer takes them through components of their own, each wired
  with a few lines: `ChannelSetPicker` (applies a set with `appliedSet`,
  which leaves out and counts the channels disconnected since),
  `SignatureMenu` (`withSignature`, the contract's `signedText`),
  `DefaultSignatures` with `useDefaultSigning` (only the request that
  first creates a post carries `defaultSignatures`, and the composer then
  takes its texts from the answer), `LinkWarnings` (`#posts/link-check.ts`,
  advice that blocks nothing: never flag a working link) and
  `PostTagsField`, which saves tags with the post while it is written and
  at once (`posts.tag`, `savedOn`) on a post scheduled or out, as
  `PostDetail` does. `ShortenLinks` with `useShortLinking` shows only on
  a server with short links (`shortLinks.status`): the member's choice,
  else the post's, else the workspace's `byDefault`, sent as
  `shortenLinks` with every save; its line counts with the contract's
  `linksToShorten` (`#short-links/count.ts`), the server's rule. A post
  that asked shows `PostLinks` (its links and their clicks over 30 days)
  to members with analytics:read; the general settings hold the default
  (`ShortLinkDefaultForm`).
- Name a channel with `#channels/channel-name.ts`, never `channel.handle`
  alone: `channelName` wherever one line names it (the workspace's name
  with the handle beside it, "Client A (@handle)"), `channelTitle` where
  the handle is written beside anyway (the channels page, the composer's
  picker). The name is Peal's (`Channel.label`, `RenameChannel`,
  `labelUpdateOf`) and never hides the handle. The text tabs still show
  the handle alone. `ChannelPower` turns a channel off, after a
  confirmation, and back on: every string about a channel that is off
  says to turn it back on, on the Channels page, not to reconnect it.
- `DuplicatePost` (post:read and post:create, `#posts/duplicate.ts`) copies
  a post into a new draft and opens it: in the composer through
  `ComposerActions`' `extra`, on a post that went out through
  `PostDetail`'s `actions`, which `ComposerScreen` fills, as the view under
  test imports no navigation. The calendar's chips are links, with no menu.
- A schedule whose save created the post with default signatures that
  changed a text stops there (`pausesToCheck`,
  `#signatures/signing-pause.ts`): the composer shows the saved texts and
  `SignaturePause`, a status region, asks to check them and choose
  Schedule again, which asks for no signature. Never schedule text the
  counters did not count.
- The calendar filters the posts it loaded in the browser
  (`#posts/calendar-filter.ts`, `CalendarFilters`), and links each day and
  each hour still to come to `…/posts/new?at=YYYY-MM-DDTHH:mm`
  (`#posts/start-time.ts`), which the composer reads on the viewer's clock
  and ignores when malformed or past.
- Times of day follow the browser's own preference (`#i18n/hour-cycle.ts`,
  in `localStorage`, chosen on the account page): `ViewerHourCycle`, in the
  locale layout, gives every message's `{at, time, short}` the clock
  chosen, and code that formats a time itself adds `useTimeOptions()` to
  its options. The server renders the language's clock; the preference
  applies after hydration.
- The composer's attachments come from `MediaPicker` (ready media of the
  workspace) or `MediaUploader` (`onUploaded` attaches ready uploads).
  `#posts/attachments.ts` keeps the list: order, alt text seeded from the
  library description, `maxMediaPerPost` at most. `#posts/media-fit.ts`
  checks it against the contract's platform rules, so Schedule waits until
  nothing would be refused. Keep `MediaUploader` mounted while the post is
  editable and pass `disabled` while it is busy: unmounting it cancels the
  uploads in flight.
- Charts use peal-ui's `chart` (recharts) and come with the same figures as
  a table, behind **Chart** and **Table** tabs; the chart itself is
  `aria-hidden`. Write calendar days, such as a summary's, in UTC
  (`#analytics/report.ts` `dayDate`), and instants in the reader's zone.
- A post's page (`PostMetrics`) names the platforms this server counts
  from its capabilities (`GET …/platforms/capabilities`,
  `analytics.perPost`: `countedOn`), never from the contract's
  `countedPlatforms` alone: X is counted only where `X_ANALYTICS` is on.
  It falls back on the list when it may not read the capabilities.
- The composer's parts are `FollowUpParts` (`components/posts/
  follow-up-parts.tsx`, state in `#posts/parts.ts`): each part its own
  text, media and wait, checked against each selected channel as a post
  of its platform, and refused in words on a platform that takes a post
  alone. A part's text of its own on a channel (`overrides`, which the
  API and other clients set) is shown, counted for that channel
  (`partTextOn`) and editable, or dropped for the text for all channels:
  the composer never sends a text it does not show.
- The inbox (`components/inbox/`) lists threads with counts and never a
  comment's text (`ThreadsList`), and shows one whole (`ThreadScreen`):
  views in `inbox-views.tsx` take links as props, so tests render each
  state. Render a comment as plain text, never as markup. Offer reply and
  moderation only where the thread's `abilities` say `available`, show a
  reply's journal status, and for an `unconfirmed` one only the two
  answers a person gives after checking the platform: never a resend.
- `AssistantMenu` sits in the composer's text section and works on the text
  for all channels. Render it only for members with `assistant:use`, and
  only while `GET …/assistant` answers `available`; refresh that status after
  every request, which can change the requests left. Show each suggestion in
  a preview the person accepts or discards: never apply one unasked.
- A plan's refusal opens the one upgrade dialog (`UpgradeDialog`, its view
  `UpgradeView`): the limit with usage and plan, the smallest plan with
  room priced with VAT first (`offerOf`, from the contract's catalogue),
  the consent and the order button of the billing page, then checkout
  (`useCheckout`), back to the page the person was on; who can order, for
  a member who cannot; how to ask for more on the largest plan
  (`PEAL_CONTACT_URL`). `UpgradePrompts` puts it around a workspace's pages
  (`app/[workspaceId]/layout.tsx`), the workspaces list and the connect
  callback. A place that sends something a plan can refuse calls
  `useOfferUpgrade()(exit)` (`useOfferAuthUpgrade` for Better Auth's
  errors), or renders `OfferUpgrade` with the failure it keeps in state,
  beside its own message: add it to every new such place. The same layout's
  `PlanGate` shows `OverPlanScreen` instead of the page, billing's aside,
  while the workspace must come back within its plan
  (`standingOfWorkspace`, read with the visitor's cookies). The billing
  page orders smaller plans too, and lists what a `PlanTooSmall` names.
- The billing page shows `GET …/billing` (`BillingView` renders each state,
  `BillingStep` the cancellation and withdrawal steps) with prices
  including VAT first and excluding VAT beside them, a monthly and yearly
  switch, the unticked box asking to start at once, and **Order with
  obligation to pay**; it places the order (`#billing/api.ts`), then opens
  Stripe's checkout and customer portal through `billingClient`
  (`#auth/billing-client.ts`, Better Auth's Stripe client), with
  `disableRedirect` and the page as the way back. It links the terms of
  service at `PEAL_TERMS_URL`. Explain a `PlanLimitReached`, and Better
  Auth's `MEMBER_LIMIT_REACHED`, wherever they surface, from the `Billing`
  catalogue and `Auth.errors`.
- Below it, on a server that bills or not, `UsageHistoryScreen` reads
  `GET …/usage` for the last 7, 30 or 90 UTC days (`usageOf`): the
  totals, a partner's plan when `sharedWith` says so, and
  `UsageHistoryView`'s chart (posts published as bars, channels as a
  line) with `UsageDaysTable` behind the **Table** tab, a dash for a day
  without a snapshot. Its strings are `Billing.usage.history`.
  `UsageHistoryView` takes days, totals and a table, so the partner
  settings' **Usage per customer** (`UsagePerCustomer`,
  `components/settings/partner-usage.tsx`, strings
  `WorkspaceSettings.partner.usageReport`) draws `GET …/usage/partner`
  with it, then a table of workspaces, external id first, with **Load
  more** for the next pages; the billing page wraps it in
  `WorkspaceUsageHistory`.
- The sign-up and password reset pages read the Turnstile site key at
  request time (`captchaSiteKey()`, `GET /api/captcha`); `useCaptcha` shows
  the widget only with one, sends its token as `x-captcha-response`, and
  resets it after every call, since a token works once.
- `src/proxy.ts` rewrites `/api/*` and `/.well-known/oauth-*` to
  `PEAL_API_URL`, read per request. Keep it there, not in `next.config.ts`:
  Next resolves config rewrites at build time and writes the URL into the
  build.
- `next dev` serves its scripts only to `localhost`: open the app at
  `http://localhost:3001`; on `127.0.0.1` pages never hydrate.
- English is the default language and French the second. Write no user-facing
  string outside the message catalogues, notifications and emails included:
  store events, render them in the reader's language. Give each feature its
  own namespace (`ChannelsPage`, `Posts`, `Media`, `OAuth`…).
- `messages/en.json` is the reference: every other catalogue has exactly its
  keys, which a test and the types check. Use ICU arguments rather than
  building sentences in code.
- English has no prefix (`/`) and French is under `/fr`. Navigate with the
  helpers in `src/i18n/navigation.ts`, not `next/link`.
- Folders in `peal-web` import each other through `#…` (package.json
  `imports`); `#messages/*` points at the catalogues.
- The page is `connect/link` (`components/connect-link/`), which reads
  the token from the fragment, with
  the partner's name and logo (`PartnerOwnership.presentedAs`), or the
  workspace's name. `next.config.ts` gives it `Cache-Control: no-store`,
  `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex, nofollow`,
  beside the frame headers every page has; `ShellFrame` leaves the app's
  header out of it. A tab that started from a link marks itself in
  `sessionStorage` (`#connect-link/pending-link.ts`), so the platforms'
  one callback page, `connect/[platform]/callback`, finishes the link
  rather than a member's connection. Its strings are the `ConnectLink`
  catalogue; the member's flow is unchanged.
- Ads (`#ads/*`, `components/ads/`, the `Ads` catalogue; a boost is
  "boost" and "mise en avant"). The ads page (`AdsScreen`, ads:read) says
  only that ads are off when `status.mode` is `off`; ads:manage connects
  and disconnects, and only ads:authorize (owners) sees `SpendingFormView`,
  which says what a ceiling allows before its button: keep that text.
  The tab keeps the sign-in's workspace in `sessionStorage`
  (`#ads/pending-sign-in.ts`) for the callback page (`CompleteAdSignIn`,
  its view `AdSignInView`).
- Ad amounts are whole minor units: read what a person types with
  `parseAmount` and write amounts with `useMoney` or `formatMoney`
  (`#ads/money.ts`), with the account's `minorUnitDigits`; never multiply
  or divide an amount. A `Boost` comes without digits: take its account's,
  else `digitsOfCurrency`.
- `PostDetail` offers `BoostDialog` on a published Facebook or Instagram
  channel to members with ads:spend, on a server whose mode is `spend`.
  `checkBoost` (`#ads/boost-draft.ts`) makes the request: days are the ad
  account's calendar, `specialAdCategory` is sent only once declared, and
  an audience in the EU names who benefits and who pays. `quoteBoost`
  comes first, and `BoostSummaryView` shows what it answers (the most the
  boost can cost, the ceiling, what is committed) before the one button,
  which names the amount and the end. `createBoost` carries the
  `Idempotency-Key` made when the review opened: never make one per
  click. Explain every refusal with `adsErrorOf` and `useAdsErrorLines`:
  a new contract error gets its words in `Ads.errors`.
- `PostDetail` offers **Unpublish** on a published channel to members with
  post:publish (`components/posts/live/`: `LivePostActions` reads the
  post's changes and the platforms' capabilities, `LivePostView` shows
  each state of `liveStateOf`, `#posts/live-post.ts`), behind a
  confirmation that names the channel and says it cannot be undone;
  `TargetView` shows when a channel was removed and strikes its address
  through, and the calendar dims a post removed from every channel it went
  out on (`isRemovedEverywhere`). Strings are in `Posts.Live`. Beside it,
  `LivePostEditView` offers **Edit** where the platform takes it
  (`editStateOf`), on that part's text on the channel (`partTextOn`) with
  the channel's counter (`fitOn` and the target's options), and says
  when the channel was last edited; `liveStateOf` is `editing` while an
  edit runs, so nothing else is offered then.
- `PostPaid` (ads:read) shows a post's boosts and `PaidSectionView`'s two
  columns, organic and paid: never add them up. Pause and stop take
  ads:spend or ads:manage, resume ads:spend (`controlsOf`); stopping asks
  first, and an `unconfirmed` boost says it may be spending.
- The consent page lets a person leave `workspace:ads` out as it does
  publishing (`mayLeaveAdsOut`, `consentAnswer` in
  `#auth/consent-scopes.ts`).
- The webhooks settings (`components/webhooks/`) offer an endpoint's
  channels as a picker (`workspaceChannels`) and a partner endpoint's
  workspaces as ids, one a line (`#webhooks/endpoint-draft.ts`; an edit
  always sends `channelIds`, an empty list hearing every channel), a status
  and event filter on each log, a **Failed** tab across endpoints
  (`searchPage`), "Send all failed again" naming how many and the hour's
  budget, and a test event type (a sample). Headers are rows (`HeaderRow`):
  a saved one shows its name and its value as "set", never the value, and
  keeps it unless typed again; an edit sends `headers` only when a row
  changed, the whole list, a saved row without a value by its name alone
  (the server keeps its value). Values are typed in password fields. Every
  string is in the `Webhooks` namespace, en and fr.
- Two-step verification (`TwoStep` catalogue): the sign-in form asks for
  the second step in place (`TwoStepChallengeView`, its state in
  `sign-in-form.tsx`) when the answer has `twoFactorRedirect`, so an OAuth
  authorization's signed query is kept: never set the client plugin's
  `twoFactorPage`. The account page's `TwoStepSection` draws the key's QR
  code in the browser (`qrcode.react`, SVG) beside the key as text; the
  URI and the recovery codes stay in component state, sent nowhere but to
  Better Auth's routes, never logged. A workspace that requires it shows
  `TwoStepRequiredNotice` instead of its pages to a member without it
  (`app/[workspaceId]/layout.tsx`); a 403 `twoStepRequired` met later is
  read once, in the API client (`#two-step/refusals.ts`), and
  `TwoStepRefusalWatch` reads the page again. The owners' switch is
  `settings/security`.
