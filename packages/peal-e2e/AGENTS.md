# End-to-end tests

- Run them with the development stack up and a database of their own:
  `DATABASE_URL=postgres://peal:peal@127.0.0.1:15432/peal_e2e bun nx run peal-e2e:e2e`.
  The target builds the web app first and is never cached. Like the
  server's tests, a run writes to the database `DATABASE_URL` names; Mailpit,
  SMTP and SeaweedFS (under `e2e/`) default to the stack, and `MAILPIT_URL`,
  `SMTP_URL` and `PEAL_S3_*` override them.
- `scripts/serve.ts` starts the server and `next start` on free ports, with
  the synthetic secrets in `e2e.config.ts`, and stops both when either exits.
  It passes `next start` no `--hostname`: bound to 127.0.0.1, every page
  redirects to itself.
- Install Chromium with `e2e-web install chromium`, from
  `packages/peal-e2e/node_modules/.bin`; CI adds `--with-deps` for the
  system libraries it needs.
- Write steps with exact locators (`screen`, `expect`) only, so tests need no
  model and run in CI. Find elements by role and label, and scope to `main`,
  `banner` or a named `navigation` when a name repeats.
- Sign up a new synthetic user each run (`member+<uuid>@example.test`, from
  `credentials.member`), and read its emails through Mailpit's API
  (`tests/support/mailpit.ts`). Accounts a test acts on rather than as sign
  up through the API with `confirmedAccount`, and `makeStaff`
  (`tests/support/accounts.ts`) gives one the staff role in the database, as
  self-hosters do; it signs in again afterwards.
- The run's server bills, against a stand-in for Stripe that lists Peal's
  meters and prices, the rate card's and the legacy plans', from the
  contract, by lookup key when asked (`scripts/stripe.ts`), as the server
  checks them when it starts: a new workspace is on the free tier, two
  channels across the account's workspaces, so a journey stays within
  them, or puts its workspace on per-account pricing in the database
  (`seedPerAccountSubscription`, `tests/support/billing.ts`, as
  `composer-comforts.e2e.ts` does for its three). The stand-in makes each
  customer an id of its own and opens a checkout whose page is the way
  back it was given, as if the card were taken: `upgrade-prompt.e2e.ts`
  reads the billing page on the free tier, is refused a third account,
  checks the dialog fits a phone (320 and 375 px, English and French),
  orders from it, comes back, posts the webhook event Stripe would send,
  built from the checkout the server opened (the stand-in writes each to
  `checkoutsFile`, `.e2e/stripe-checkouts.jsonl`: its prices and
  metadata; `postPerAccountSubscription` refuses one that lost a line or
  its order, and signs with the stand-in's `webhookSecret`, the customer
  read from `auth.organization`), then reads per-account pricing on the billing
  page, and the third account goes past the plan to the Mastodon server
  it names, which does not exist. The run has no billing grace. No test
  pays.
  So the functions to cancel and withdraw are on
  (`contract-functions.e2e.ts`): a journey there sends requests no
  contract answers, and reads their acknowledgement in Mailpit.
- No platform can be connected in a run, so a test that needs a channel
  inserts a synthetic one with `seedChannel` (`tests/support/channels.ts`).
  Update it when `channels.channels` changes. Publish nothing, and cancel any
  post a test schedules, through the UI.
- Nothing goes live in a run either, so a test that needs a post's counts
  or its comments seeds them as analytics and the inbox keep them
  (`seedCountedPost`, `seedComment`, `tests/support/followed.ts`), written
  as no longer read (`ended_at`): the run's server runs its collections,
  which would otherwise call a platform for them. Update them when
  `analytics.tracked_posts` or `engagement.threads` change. Mark a comment
  answered rather than reply: a reply's job would call the platform.
- A part of a page that loads after it moves what is below it, and an
  open list follows its field off the screen ("element is outside of the
  viewport"): wait for that part (the post's review shows "Your comment")
  before opening a list beneath it.
- `tests/tags.e2e.ts` signs up a member of its own, adds a tag in the
  settings, schedules a tagged post and another, filters the calendar by
  the tag and clears the filter, then cancels both. The calendar names a
  tagged post "<time>, <status>: <text> Tag: <name>.", so a locator for one
  ends with its tags. A menu or popover that stays open after a choice is
  closed with `press("Escape")` before the page behind it is read.
- `tests/composer-comforts.e2e.ts` seeds three channels, selects them all
  and none, inserts an emoji from the picker, reads the previews, opens
  **Publish now** and leaves it ("Not now": nothing goes out), finds the
  saved draft among **All posts**, filters it out by status and back, then
  discards it, and reads a pending invitation's **Copy link**. Pasting
  files is tested below the pages (`#posts/paste.ts`): the runner offers
  no clipboard.
- `tests/csv-import.e2e.ts` opens **Import from a file** from **All
  posts**, sets the file input (`setInputFiles`) to files it writes under
  `.e2e/csv-import/`: a row on a channel the workspace lacks is refused
  and nothing is offered to import; a row next year on a seeded channel
  (`seedChannel` answers its id) is checked, imported and its post
  cancelled. It never imports a row dated `now`.
- `tests/queues.e2e.ts` adds a queue with two slots late today (the
  test's weekday), adds two posts to it from the composer's **Add to
  queue**, reads that they took 23:57 then 23:58, swaps the 23:57 slot
  for 23:59 and moves both posts onto the new slots, then cancels both.
- `tests/media-library.e2e.ts` seeds named images and a video
  (`seedImage`, `seedVideo`: rows only, no file), finds one by its name
  whatever its case, narrows the search by kind and clears it (the focus
  goes back to the search field), then opens a tall image's preview at
  320 × 640 (`browser.setViewport`) and checks the dialog, its title and
  its close button fit the window, and that closing it gives the focus
  back to the thumbnail. A seeded description has no surrounding spaces,
  which the server refuses to read.
- `tests/two-step.e2e.ts` turns two-step verification on from the account
  page, reading the key written beside the QR code and computing the codes
  an authenticator app would (`tests/support/totp.ts`, RFC 6238), signs in
  again with the password then a code, and requires it of its workspace.
- CI's `e2e` job runs beside the others when a change can reach the pages
  (`scripts/ci-plan.ts`), with its own Postgres and Mailpit and SeaweedFS
  from `compose.yaml`. After a failure, read the report, traces and
  screenshots under `packages/peal-e2e/.e2e/` (CI uploads it for 7 days), and
  the server's and the web app's output in `.e2e/logs/app.log`.
