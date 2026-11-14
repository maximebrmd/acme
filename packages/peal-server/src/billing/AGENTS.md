# Billing

- Billing is on when `STRIPE_SECRET_KEY` is set
  (`#shared/infrastructure/stripe-settings.ts`, read by the billing context
  and by Better Auth). Off, every workspace is `unmetered`: no plan, no
  limit, and the assistant keeps `PEAL_AI_DAILY_REQUESTS`. Keep it so: a
  self-hosted server limits nothing, and its billing routes answer
  `BillingNotEnabled`.
- Per-account pricing's every number is the rate card
  (`billing/domain/rate-card.ts`): its `prices`, keyed by currency with
  US dollars only (Stripe converts at checkout; add no other list), hold
  the graduated account ladder and each meter's unit price; the rest is
  written once: account-days at one thirtieth (the 31st free), each
  meter's monthly allowance with and without a payment method and its
  default ceiling (per billing account, across the workspaces it pays
  for), the assistant's margin, storage, the API's rate limits and X's
  rates. What is not decided yet (the assistant's figures are
  placeholders) sits together in `awaitingDecision`. X's rates are
  X's published pay-per-use prices, passed through with nothing added
  (no margin field), with the UTC day they were read (`ratesReadOn`):
  read docs.x.com/x-api/getting-started/pricing again before each
  release that touches them, never write one from memory. A group's
  meters are confirmed together (`unconfirmedMeters`: both of the
  assistant's or neither), as one ceiling bounds them. Prices are
  computed by its pure functions (`accountsCharge`, `meterCharge`,
  `stripeTiersOf`…), never written by hand. The contract copies it
  (`peal-contract/rate-card`), kept equal by
  `test/billing/api/contract.test.ts`: change both, never one. The plan
  `payAsYouGo` is per-account pricing, the only one sold. The pricing functions refuse
  a count that is not a whole number of zero or more (`RangeError`);
  Stripe's rounding of a half cent on a meter is assumed half up until a
  sandbox invoice settles it.
- Allowances are computed per billing account (`allowancesOf` in
  `domain/plans.ts`, `Entitlements.allowancesFor(accounts)` and
  `allowanceOf(limit)`): `free` holds the rate card's free accounts (2;
  none once staff required a payment method, the account's `freeTier`,
  which `PlanHolders.heldBy` reads with the holder, in the same reads),
  `storageAllowance(false)` and no assistant on the server's models;
  `payAsYouGo` every account, `storageAllowance(true, accounts)` (only the
  media adapter counts accounts, so no hot path gains a query) and the
  legacy pro plan's 20 assistant requests a day until its monthly meter;
  members and posts unlimited on both. `payAsYouGo` ranks above every
  legacy plan (`largerPlan`); `planWithRoom`, `planHolding` and
  `planToPay` offer only it, and the web app prices it from the rate card,
  never as a listed price of 0.
- The legacy plans are priced by connected channels, in tiers: free,
  starter, pro, business, agency (`LegacyPlan`, `LegacyPaidPlan`), each a
  monthly and a yearly price (ten months), no longer sold, kept for the
  subscriptions that still hold one. Their allowances and prices, euro
  cents excluding VAT, are `billing/domain/legacy-plans.ts`, unchanged
  (`free` there is the old free plan, which only the contract's
  `planCatalogue` still shows); their ids (`#shared/domain/plan.ts`), the
  limits' names (`plan-limit.ts`: channels, members, scheduledPosts,
  assistantRequests, mediaStorage in decimal bytes), `PlanLimitReached`
  and `roomFor`/`roomForOneMore`/`withinAllowance` (`allowance.ts`) are in
  the shared kernel, since every context checks a limit. The contract
  copies them, with the catalogue (`planCatalogue`, `trialOffer`,
  `displayVatRate` in `peal-contract/src/billing-plans.ts`, exported as
  `peal-contract/billing-plans`), kept equal by
  `test/billing/api/contract.test.ts`. The site's pricing page
  (`peal-site/src/pricing.ts`) and the docs' variables
  (`peal-docs/pricing-variables.ts`, `{{starter-month-en}}`…) read that
  catalogue: never write a price by hand. `GET …/billing` answers it too.
- Before any change to the ladder, compare its monthly totals at 10, 20,
  100 and 1,000 accounts (`accountsMonthly`) with those of the
  per-account schedulers Peal is measured against. The comparison lives
  outside the repository: never name another product here.
- Stripe prices are found by lookup key under `STRIPE_LOOKUP_KEY_PREFIX`
  (`peal`), never by id. The legacy plans' are tax-exclusive EUR prices,
  `<prefix>_<plan>_monthly` and `_yearly`: Better Auth's plans carry
  `lookupKey` and `annualDiscountLookupKey`, and `planOf` reads the plan
  and interval from the event's `price.lookup_key`. Their amounts must
  equal `prices.ts`, and operators make them by hand.
- Per-account pricing's catalogue (`domain/catalogue.ts`, `catalogueOf`)
  is derived from the rate card, never written: one line per invoice line
  (`CatalogueLine`: `accounts`, then each meter), each a Stripe meter, a
  product (`metadata.peal` its lookup key, tax code `catalogueTaxCode`) and
  a metered, monthly, tax-exclusive price in `usd` only (no
  `currency_options`: Stripe converts at checkout), under
  `StripeSettings.catalogue` (`catalogueKeysOf`: `<prefix>_accounts`,
  `<prefix>_outbound_messages`…), which is also its meter's event name.
  The ladder is `stripeTiersOf` (graduated, account-days), a meter's price
  `stripeUnitAmountOf` (cents a unit, a decimal of 12 places at most).
  Meters sum the events' `value` for the customer in `stripe_customer_id`
  (`meterEvents`): every meter event the server sends must carry those
  keys. A new line is a new
  `CatalogueLine` and a new key, in the e2e stand-in too.
- Only the operator makes it: `nx run peal-server:stripe-catalogue`
  (`scripts/stripe-catalogue.ts`, shipped in the server image so it runs
  where the key is; logic in `infrastructure/stripe-catalogue.ts`,
  `runCatalogue`, over a Stripe client). It reads meters, products and
  prices (tiers only with `expand: ["data.tiers"]`, every page), plans
  (`planCatalogue`, pure), then creates meters and products before the
  prices that read them. A price that bills otherwise (amounts, currency,
  interval and its count, usage type, meter, tax behaviour, transform) is
  replaced by a new one with `transfer_lookup_key`, the old left active for
  the subscriptions on it. A meter that counts otherwise (aggregation,
  mappings, or pre-aggregated by `event_time_window`, which keeps only a
  window's last event) or a price on an archived product blocks the run
  before any change: Stripe cannot change a meter, nor checkout use an
  archived product. A product gets its name and `catalogueTaxCode` when it
  is made, never after: one the operator changed is a note (`--check`
  passes). `--check` changes nothing and fails on a difference. It prints names and
  ids, and of a refusal Stripe's error type and code only, never its
  message, which may quote the key. The server never creates Stripe
  objects. Tests drive it against `#test/billing/fakes/stripe-account.ts`,
  a stateful stand-in that answers as Stripe does, and against
  stripe-mock, which checks each request against Stripe's API.
- Stripe's docs do not say whether a deactivated meter keeps its event
  name: the blocked message gives both ways out (deactivate and run again,
  or a new `STRIPE_LOOKUP_KEY_PREFIX`), and the sandbox runbook settles
  it. A meter's event name is 100 characters at most, so the prefix is 81
  at most (`_assistant_requests` is the longest suffix).
- Moving a lookup key is one-way for the release before: after a release's
  `stripe-catalogue` replaced a price, the previous release no longer finds
  its own under that key, and a rollback runs the previous release's
  command to move it back (a third price). The self-hosting docs and the
  infrastructure README ("Stripe catalogue") say so; keep them true when
  `catalogueAtStart` turns to `stop`.
- Every line's product has tax code `txcd_10103001` (software as a
  service, business use). For EU VAT it computes as the personal-use code
  does; the split matters for US sales tax only, an accountant's question
  before Peal registers there.
- Account-days (`AccountDays`, `billing.account_days`, domain
  `account-days.ts`): each billing account's day (UTC) on its billing
  workspace (the holder: `PlanHolders`, a partner's home for its pool),
  `peak` the most accounts connected at once across the pool, raised,
  never lowered (a disconnection counts the day it was connected in).
  Raised where a channel is added, inside `addingTo` and the pool's hold
  (`ChannelAllowance.counted`, its count read only where billing is on);
  when the day starts (`StartAccountDays`, run when a server that bills
  starts, by the 00:11 snapshot after its sweep, and every hour by
  `billing.account-days` at minute 49: accounts by id, three reads and
  one transaction a batch, a batch that fails logged and left to the next
  run; gauges `.accounts`, `.started` and `.started_day`, alert
  `peal-account-days-unstarted` past 02:00 and one hourly run);
  when a subscription is recorded (`subscribed`, to the pool's count,
  bound late through `bindPool` as the channels context is built after
  billing); and when a workspace is transferred, merged or detached
  into an account (`raiseAccount`). A raise to nothing writes no day.
  For a holder whose `payAsYouGo` subscription entitles it, the same
  transaction puts `billableAccountDays` not yet `reported` in the outbox
  (`billing.meter_reports`, identifier `acc:<holder>:<day>:<peak>`, value
  the rise; none on the 31st); anywhere else the day is kept and nothing
  sent. A server that does not bill counts, reads and sends nothing.
- The reporter (`ReportUsage`, cron `billing.usage-report`, every five
  minutes from minute 3, and its daily step `billing.usage-items` at
  01:19; registered with the hourly start only where billing is on,
  `usageReporting`) sends unsent reports oldest first by cursor through
  `UsageBilling` (`StripeUsageBillingLive`, no client retries), one
  customer at a time and in order, eight customers at once, each
  customer's sent ones marked as its turn ends. A report is stamped at its
  first attempt (`stamped_at`: the instant described within the hour,
  else then) and every retry sends that stamp under the key
  `<identifier>:<timestamp>`, so it is the same request; never recompute
  it. Its cost: a row first tried before a period's end and taken after
  that period's invoice was finalised is not billed (Stripe takes it into
  no invoice), and a 500 Stripe saved is given again for its 24 hours, the
  customer waiting meanwhile (`behind` warns at 6 hours). Outcomes
  (`outcomeOfFailure`): no answer, 409, 429 or 5xx is `unavailable`; 401
  and 403 are `account`; an invalid request whose code is the event's own
  (`eventRefusals`: value, timestamp, customer) is refused for good, kept
  by its code, logged and counted; anything else (an idempotency
  mismatch, a meter, a code not listed) is `refusing`. `account` and
  `refusing` pause the customer, nothing marked, and
  `peal-usage-report-key-refused` says so. Only `unavailable` and
  `account`, the same for every customer, count toward stopping a run
  (five in a row): a customer refused for its own reasons never stops the
  others.
  Gauges `.left`, `.oldest_age`, `.ran_at` (set at start), `.refused_kept`
  (read from the rows at start, never zeroed) and `.paused` feed `peal-usage-report-behind` (6 hours), `-stopped` (30
  minutes), `-refused` (critical, a state) and `-key-refused`; their
  promtool tests are `peal-docker/test/alerting-promtool.test.ts`. An
  alert never tells the operator to report usage by hand: Stripe may hold
  it already. The daily step keeps each `payAsYouGo` subscription's items
  to the catalogue (`ensureItems`: adds a missing line, moves an item
  whose price lost its lookup key, without proration), sets its threshold
  again while no invoice is paid, and records the first paid invoice
  (`paidInvoices`, `subscriptions.paid_invoice_at`), removing the
  threshold first. Account-days and reports are purged 400 days on (the
  snapshot), go with the workspace's export (`accountDays`,
  `usageReports`) and erasure, which deletes unsent reports too (a rise in
  the minutes before a billing workspace is erased is not on its final
  invoice), and are the registry's `usage`.
- Meters (`MeteredUsageLive`, the kernel's `MeteredUsage`; domain
  `meter-claims.ts`): each billing account's units by calendar month UTC
  on its holder (`billing.meter_usage`: `used`, `reported` past the
  allowance, `events`). A claim holds the holder's rows of the meter's
  group (the assistant's two share one ceiling; `metersOf`) in the
  meters' order, decides (`decideClaim`: within `includedUnits`, which is
  `allowanceWithout` for `free`, 0 when staff required a payment method,
  `allowance` with one; past it for `payAsYouGo` while the group's spend
  stays within its ceiling, `spend_ceilings` or `defaultCeilingOf`; a
  legacy plan gets the allowance and nothing past it), and writes in one
  transaction the count, the usage ledger's counter under the claiming
  workspace (`usageCounterOf`: images, messages, ads; the assistant's
  requests stay the snapshot's copy) and, for a `payAsYouGo` holder, an
  outbox row of what changed in the billable units
  (`<meter>:<holder>:<YYYY-MM>:<events>`, one per change, so a rise after a
  fall never repeats an identifier). A unit given back lowers `used` and
  the ledger (never below zero) and reports back what had been reported,
  as a negative value (`meter_reports_value` is `<> 0`; Stripe sums a
  meter and bills a negative period as none). The claim that uses a free
  account's last unit of a meter with an allowance without a payment
  method tells its billing managers (`AllowanceReached`, keyed
  `allowance:<holder>:<YYYY-MM>:<meter>`: once per meter and month, always
  emailed). A server that does not bill counts nothing and refuses
  nothing (`MeteredUsage.layerUnmetered`): production must not change
  while it bills nothing. A release before T7 does not decode the new
  ledger counters or the negative report values: do not roll back past it
  once a server that bills has written them.
- What bounds a meter past its allowance (`meterBound`, `mostUnits`),
  for `payAsYouGo` only: the group's ceiling, its own group's meters
  counted; until a first invoice is paid, `spendCapOf`
  (`unverifiedThreshold`, $100) on what is billed and unpaid, whatever
  the ceilings: every meter this month (the claim then holds every
  meter's rows) and what the months before billed since the
  subscription began (`unpaidBefore`, `MeterUsageStore.between` from
  `unpaidSinceOf`, read without a hold: those months are closed), so a
  late start does not get the cap twice; and a meter in
  `unconfirmedMeters` bills nothing past its allowance at all. The cap's
  refusal is `spendCapReached`, never `ceilingReached`
  (`refusalOf`), messages and ads included. `GET …/billing` tells a
  meter's `most` past its allowance only to the billing workspace: any
  other reads the allowance at most (`meterView`), as the rest is what
  the ceiling pays for. A past due subscription (`pastDue`) gets the
  allowances and nothing past them (`paymentFailed`); a legacy plan the
  same (`planAllowance`), and keeps its plan's daily assistant
  (`AssistantAllowance.metered`). `pausedOf` refuses what spends a meter
  later at any standing past `allowed`, with the state's `pastAllowed`.
- Failures: `forgive` takes back units of a generation that failed once
  the provider had it, free up to the meter's allowance a month
  (`meter_usage.forgiven`), then they count; `giveBack` (what never
  happened: a reply never sent, a request never run) is always free. A
  give-back resolves the holder and the standing again: after a transfer
  or a merge it lowers the new holder's month (a new holder starts its
  own month's count), after the subscription ended it reports nothing
  back, and in the month after its claim Stripe bills the negative period
  as none: cents at most, accepted.
- The migration that made `meter_reports_value` `<> 0` takes an access
  exclusive lock and reads every row to validate it; a later change of a
  check on a large table uses `NOT VALID`, then `VALIDATE CONSTRAINT`.
- Reports are one outbox row per change, so a busy month makes many
  meter events; ads are claimed in one claim a sync. Adding up a
  customer's unsent rows into one event is not done: its identifier would
  have to stay the same across retries while rows arrive.
- `SpendCeilings.set` (`PUT …/billing/ceilings/:group`, in
  `billingActions`): billing:manage in person, on the billing workspace
  (`BilledElsewhere`), never on a server that does not bill; it may
  always be lowered, below what the month spent too; a group with a
  meter unconfirmed takes none (`CeilingNotOffered`, answered
  `SpendCeilingNotOffered` 409), as the billing page shows its form
  only once all are. The row names
  nobody; the activity log keeps who. `GET …/billing` answers `meters`
  (`meterMonthsOf`, `shownMeters`: X joins with its pass-through), their
  money (`estimate`, in the total `estimate` too) to the billing
  workspace's members only, `priceConfirmed` false for
  `unconfirmedMeters` (the rate card's `awaitingDecision`), which every
  surface shows as coming. Meters and ceilings go with the export
  (`meterMonths`, `spendCeilings`) and the erasure.
- X is passed through at X's rates (README D4, D6), on a server that
  bills only: `xApi` has no allowance, a payment method is needed, and
  the billing account's `x` ceiling ($25 by default) bounds it. Its
  reads are a switch per workspace (`XPassThrough`, `billing.x_usage_settings`:
  reads, set_at, no row is off; the activity log keeps who), set by
  billing:manage in person (`PUT …/billing/x`, in `billingActions`) on any
  workspace of the account, answered as `x` on `GET …/billing`, kept in
  the export (`xReads`) and erased with the workspace. A server that does
  not bill answers `BillingNotEnabled` and reads none of it.
- Sandbox runbook for the meters (the owner, test mode, never in tests):
  on a `payAsYouGo` subscription with a test clock, send 10,001 replies'
  worth (seed `meter_usage` at 10,000, then reply once) and read the
  `peal_outbound_messages` event under `outboundMessages:<holder>:<month>:1`;
  give one back (a reply that fails) and read the `-1` event Stripe takes
  (write down its answer: a negative value Stripe refuses is mapped in
  `eventRefusals` or the give-back changes); advance past the first and
  the finalisation hour (the invoice bills the sum, never below 0); raise
  the assistant's ceiling on the billing page and check an assistant
  request past the allowance is billed at the confirmed price; on a free
  account, check the 10,000th message tells the billing managers once.
- Meter events Stripe took and could not count (a meter archived or
  missing, a customer unknown) come back as thin events,
  `v1.billing.meter.error_report_triggered` and `no_meter_found`, to an
  event destination of their own: `POST /api/stripe/meter-errors`
  (`src/app/meter-errors/`, no credentials, the signature checked with
  `STRIPE_METER_WEBHOOK_SECRET`, unset: every event refused before its
  body is read, and a warning when a server that bills starts; a body of
  64 KB at most), read in full from Stripe once, without client retries
  (`StripeMeterErrorEventsLive`; an outage is 503, so Stripe sends it
  again; a full event Stripe refuses or that cannot be read is counted as
  one error coded `unreadable` and answered 200), taken once by its id
  (`StripeEventLedger`, `billing.stripe_events`), counted
  (`peal.billing.meter_errors`, alert `peal-meter-errors`), and the reports
  their samples name kept refused (`stripe:<code>`, sent or not), which
  `refused_kept` and its alert read. Stripe names a sample, not every
  event, and may name none: the count is what alerts.
- Unverified ceiling (D8): per-account pricing on an account none of
  whose subscriptions had an invoice paid connects up to
  `rateCard.unverifiedCeiling` (100) accounts
  (`Entitlements.connectableAccounts`, what `ChannelAllowance.channels`
  and a transfer's room answer); the standing reads `allowanceOf`, so
  nothing connected is ever over it. Its refusal (`planWithRoom` null)
  is the upgrade dialog's ceiling words: until a first invoice is paid,
  and how to ask for more. First recorded paying, a subscription is set to invoice
  at `unverifiedThreshold` ($100, `billing_thresholds`, its billing month
  kept) before the event is recorded; a refusal for good is counted
  (`peal.billing.threshold_unset`, alert `peal-threshold-unset`) and the
  subscription recorded all the same; the daily step lifts both after
  the first paid invoice.
- Until T10's move, a legacy subscriber who orders per-account pricing
  is billed both until the legacy plan's period ends (it is set to end
  then, without credit): no server bills a legacy plan today.
- `GET …/billing` answers `accounts` (the workspace's own and the
  pooled count, and for the billing workspace's members only the month's
  account-days, `estimate` by `accountsCharge` of what was reported once
  it pays or of what the days would bill, `nextAccount` by the ladder),
  `estimate`, `rateCard`, `paymentMethod` and `upcomingInvoice`
  (`StripeContracts.upcomingTotal`, billing workspace only, none when
  Stripe does not answer), and `paymentFailed` (a per-account contract
  past due or unpaid: the page sends to the portal, not to an order;
  paused is left out, as Stripe pauses only a trial that ended without a
  payment method). A partner's customer or a person's other workspace
  reads the account's pool and limits as its usage does, never its money
  or contract (`Overview.billsHere`): no `subscription`,
  `withdrawableUntil`, month, estimate or invoice, `paymentFailed` false. On a server that does not
  bill money and the rate card are null and no day or Stripe is read. The
  usage report's days carry `billableAccounts` for the holder only, its
  totals `billableAccountDays`. These fields are required: a newer client
  against a server one release older does not decode them.
- Sandbox runbook for the reporter (the owner, test mode, never in
  tests): with a `payAsYouGo` subscription on a test clock, connect an
  account and wait for the reporter: the meter event under
  `acc:<holder>:<day>:<peak>`, its key `<identifier>:<timestamp>`.
  Duplicates: send an identifier Stripe took again under another key
  (another timestamp), now and after 24 hours, and write down what Stripe
  answers: an error (its type and code: the reporter reads it as
  `refusing` and pauses the customer, unless the code is then mapped to
  `sent`) or a success that counts nothing. Thresholds: check the
  subscription carries `billing_thresholds.amount_gte` 10000 and its
  period still ends on the first; if Stripe refuses it, the subscription
  is recorded and `peal-threshold-unset` fires (write down the code).
  Pay the first invoice, run the daily step (the threshold gone,
  `paid_invoice_at` set); move a price's lookup key with
  `stripe-catalogue` and run the daily step (the item moved, no
  proration); revoke the key for a run (every customer paused, nothing
  refused, `peal-usage-report-key-refused`), restore it (everything
  sent); send an event for a deleted customer, one 40 days old and one
  whose value is no number, and write down each answer's status, type
  and code (add the codes that are the event's own to `eventRefusals`);
  deactivate a meter and send an event (the answer, then the meter error
  event at the destination, `peal-meter-errors`, and its sample marked);
  and read, in the meter's event summaries, that each day bills its peak
  once.
- Each context checks its own limit when something is added, through a port
  of its own backed by the billing context's `WorkspaceEntitlements`:
  `ChannelAllowance` (connecting a new account: on start, and again before
  the channel is added; accounts chosen together need room for all of them,
  checked before the choice is taken; an Instagram connection that may move
  a channel the workspace has the other way in is checked only once its
  account is known, as moving adds none), `PostAllowance` (a post scheduled or
  moved into a month, UTC: drafts and cancelled posts are left out, and a
  repost adds nothing, as `countGoingOut` counts posts, not rounds; and a
  workspace with more channels than its plan allows, as after a trial,
  schedules nothing: `PostAllowance.channels`, with the channels context's
  `ChannelUsage`; both are checked again when a target is about to go out,
  in `RoutedPlatformPublisher.publish`, as a trial or a larger plan may have
  ended since: over its channels, nothing goes out, and of a month's posts
  only the first the plan allows, by time then id
  (`PostRepository.countGoingOutBefore`); the others fail as `planLimit`,
  nothing sent; a resumed run is not checked), `AssistantAllowance`, `StorageAllowance` (an upload's
  declared size against the bytes stored, pending uploads younger than
  their URLs included: `MediaAssets.insertWithin`, under the workspace's
  advisory lock), and members in Better Auth's organization hooks
  (`workspace/infrastructure/auth/billing.ts`: pending invitations count when
  inviting, and members again when an invitation is accepted). Channels
  and posts are counted and added under a transaction's advisory lock
  (`ChannelRepository.addingTo`, `PostRepository.claimMonth`), so requests
  sent together never pass a limit. Better Auth's routes count, then write,
  without a lock: `AuthRoutesLive` runs `/organization/invite-member`,
  `/accept-invitation` and `/create` one at a time per workspace or account
  (`makeTurns` in `auth/turns.ts`: a session advisory lock on a reserved
  connection, the invitations' key shared with `WorkspacePeopleLive`, four
  held at once at most). A route of Better Auth's that adds to a limit
  joins `counted` in `routes.ts`. An upload completed after its room lapsed
  (`partUploadExpiry`) is counted again (`MediaAssets.updateWithin`), its
  file deleted when the plan has no room. "Never above the plan" is the
  invariant: a new path that adds to a limited resource checks under a
  lock, with a test that sends requests together. Each context also counts
  for the billing
  page (`ChannelUsage`, `PostUsage`, `WorkspaceSeats`, `AssistantRequests`,
  `MediaStorageUsage`), so `BillingOverviewLive` is built after the
  contexts it reads.
- A refusal tells every client the way out. The domain's
  `PlanLimitReached` carries `limit`, `allowed`, `used` and `needed`;
  `UpgradePaths` (`#shared/application/upgrade-paths.ts`, backed by
  billing's `PlanUpgradePathsLive`) gives the plan, the plan with room
  (`planWithRoom` in `plans.ts`: `payAsYouGo` when it holds what is
  needed, never a legacy plan; none from `payAsYouGo`) and the billing
  page under `PUBLIC_URL`; the MCP tools and the CLI say what a payment
  method gives from the rate card (`perAccountPrice`). Handlers answer the contract's
  `PlanLimitReached` through `limitRefusal` (`#shared/api/limit-reached.ts`,
  built with the group: handlers take services when the group is built,
  never per request), the assistant's `AssistantQuotaExceeded` carries the
  same plan fields (null on a server that does not bill), Better Auth's
  `MEMBER_LIMIT_REACHED` body too (`memberUpgrade` hook; the web app
  still reads the `FREE_WORKSPACE_LIMIT_REACHED` older servers sent), MCP tools refuse with
  `planRefusal` (`app/mcp/refusals.ts`, after what the call left undone:
  inviting, `import_media`, and every tool that schedules) and the CLI
  explains with `planLimitReason`. Change them together. `securityTest` provides
  `UpgradePaths.layerTest`.
- A plan can shrink under a workspace (a trial ends, a subscription is
  cancelled or unpaid): nothing is deleted, and `excessesOf`
  (`billing/domain/standing.ts`) lists what it holds beyond the plan
  (channels, members, media). Over its channels or members (`mustReduce`),
  it schedules and publishes nothing (`PostAllowance.channels` and
  `.members`, at scheduling and again in `RoutedPlatformPublisher`); posts
  already scheduled fail when due as `planLimit` and are reposted
  afterwards, never moved to drafts. `GET …/billing/standing`
  (`WorkspaceStanding.of`) tells every member; views across workspaces
  ask `overPlanIn` instead, which names the workspaces of a set that must
  reduce in a few reads whatever their number (`ofEach`'s holders and
  subscriptions, `WorkspaceUsage.heldIn`'s pools, channels and members),
  and reads only what decides it, through the domain's `excessesOf` and
  `mustReduce`. It takes no partner's hold
  (`PartnerOwnership.poolsIn`, `ChannelAllowance.sharingIn`): it reports
  a state and adds nothing, and a page would queue behind every
  connection. It must stay equal to `of` for every shape of workspace
  (`test/billing/integration/standing-across-workspaces.test.ts`): a new
  limit that decides `mustReduce` joins it there; `POST …/billing/reduction`
  (`ReduceWorkspace`, in `billingActions`) keeps the channels and members a
  manager chose: the whole choice is checked first, members go before
  channels (`WorkspaceMembers.keepOnly`, `membersToRemove`: whoever chooses
  stays, only an owner removes an owner, pending invitations are revoked),
  and channels go through `DisconnectChannel`, with its revocations. Only
  what is over is touched. Over its media, a workspace only uploads
  nothing. The `TrialEnding` notice lists `over` the free plan.
- `PlaceOrder` takes `payAsYouGo`, monthly, only: a legacy plan or a
  year is `PlanNotSold`, a trial `TrialUnavailable` `notOffered`, and
  `CheckoutOrders.take` refuses an order of either placed before. An order
  never puts a workspace above its plan (`PlanTooSmall`, for what decides
  `mustReduce`: per-account pricing holds every account and member, and
  media over it only refuses uploads). No trial is offered (`Billing.trial`
  answers `available: false`); the trial code stays for the trials that
  run, until the last one ended.
- `PEAL_BILLING_GRACE_UNTIL` (`BillingMode.graceUntil`, a day, read in
  `configured-billing-mode.ts`): while `inGrace`, a `free` workspace over
  its accounts still schedules and publishes on the accounts connected
  before the grace started (`BillingMode.graceSince`: the first start of
  this server's database with any grace, whatever the day, kept in
  `billing.grace_starts`, so a day moved later never graces the accounts
  connected in between; `gracedHolds`, in `WorkspaceStanding`,
  `PostAllowance.channels` and the reminders), never where staff required
  a payment method (`freeTier` false), and connects nothing more
  (`ChannelAllowance` is untouched). The standing answers `graceUntil`.
  `SendBillingReminders` pages the billing accounts
  (`BillingAccountStore.page`) and tells each graced holder once
  (`PaymentMethodNeeded`, keyed by the day), a failure there logged and
  the trial and renewal reminders sent all the same. Only the free tier is
  graced, never a legacy plan; by design, an account whose subscription
  ends during the grace (a legacy subscriber who cancels) keeps the
  accounts it had connected before the grace until its day, whoever paid
  for them. A server that bills without a grace warns at start when a free
  workspace is over its accounts (`GraceWarningLive`).
- A server that bills checks Stripe when it starts
  (`StripePricesCheckedLive`, in `ServerLive` only: `AppLive` serves tests
  against stripe-mock, whose one price is none of Peal's): the catalogue
  (`catalogueProblems`: each line's active meter, not pre-aggregated, and
  under its key an active price in its currency, each month, metered on
  that meter, tax-exclusive, not transformed, at the rate card's tiers or
  unit amount, decimals compared by value, on a product
  that is not archived: meters, prices and products are read together),
  and, only while a legacy subscription entitles (`LegacySubscriptions`),
  each legacy lookup key an active price at the amount, currency and
  interval of `prices.ts`, tax-exclusive, so a fresh Stripe account needs
  none. A difference stops the server listing it (`StripePricesMismatch`):
  `catalogueAtStart` (`domain/catalogue.ts`) is `stop` since per-account
  pricing is sold; `warn` (a warning with `catalogueCommand`, the gauge
  `peal.billing.stripe_catalogue.problems` and the alert
  `peal-stripe-catalogue`) stays for tests. Stripe not answering is a
  warning, and the server starts. A release on Peal's servers runs
  `stripe-catalogue --check` with the new image before it replaces the
  server, by its exit code (`catalogueExitCode`: 3 differs, 4 refused or
  unreadable, 5 unanswered): it stops on 3 and 4, and only reports 5
  (`peal_release`).
- Before per-account pricing is turned on anywhere, the owner runs this in
  the sandbox's Stripe account (test mode, its key in the sandbox vault,
  never copied), never in tests: `stripe-catalogue`, again (no change),
  `--check`; a meter made by hand with `count`, the command (blocked),
  that meter deactivated, the command again (does Stripe give the new
  meter the deactivated one's event name?); with a test clock, a
  `payAsYouGo` checkout paid with a test
  card (a card asked although nothing is due, the period ending on the
  first of next month at 00:00 UTC, six items); 300 account-days and
  12,000 billable messages reported, the clock past the first and the
  finalisation hour (invoice: $40.00 and $1.20, plus tax for a French
  address); an event stamped 23:59 on the last day sent at 00:11 on the
  first (which invoice takes it); a checkout opened on the last day,
  before 23:29 UTC, closing at 00:00 (`expires_at`), and one opened after
  and paid after 00:00, its anchor then past (does Stripe bill the full
  period from it, as its docs say?); cancel, withdraw and delete on three
  subscriptions (their final invoices); half-unit rounding (50 billable
  messages, 5 X units, a tier's thirds: is half a cent rounded up, as
  `meterCharge` and `accountsCharge` assume?); dollars a settlement
  currency of the account, then Adaptive Pricing on, a metered-only
  checkout for `test+location_FR@example.com` (euros offered, the
  presentment currency on the subscription event, the first invoice issued
  in dollars and paid in euros) and `test+location_US@example.com`
  (dollars).
- Every workspace belongs to one billing account (`BillingAccounts`,
  `billing.accounts`, `account_workspaces`, `account_transfers`), on a
  server that bills or not: its creator's, made with their first
  workspace (`afterCreateOrganization`, the `workspaceCreated` hook), one
  per person (unique `payer_user_id` but standalone ones); a workspace
  made before is resolved the first time it is read (`of`, the owners read
  again under the payer's hold), or by the daily snapshot's sweep
  (`sweepIn` per batch, one workspace at a time, a failure logged; then
  `repair`: accounts whose billing workspace is gone, and lapsed offers),
  to its oldest owner's account, the oldest workspace billing. The partner
  rule comes first: a partner's home and the workspaces it owns are the
  partner's account, billed on the home. A workspace a plan subscription
  of its own entitles is `standalone` until it ends (`subscriptionChanged`).
- The payer is always one of the workspace's owners. On a server that
  bills they stay one until they hand it over (`PAYER_MUST_STAY` on Better
  Auth's leave, remove and role routes, `payerRequired` in a reduction);
  anywhere, a workspace whose payer left, was removed or stopped being an
  owner moves to its oldest owner's account (the `ownersChanged` hook
  after those routes, and `of`, `accountsIn` and the sweep for rows
  already wrong), unless staff merged it there (`account_workspaces.merged`,
  which only `BillingAccountDesk.detach` clears).
- A server that does not bill reads no account to schedule, publish, tell
  the standing, show the billing page or `get_billing`, or report usage:
  `AccountChannelAllowanceLive` and `AccountPlanHoldersLive` (the partner
  rule alone there) read one only when `BillingMode` bills, and
  `…/billing` and `…/billing/standing` leave `account` out
  (`accountShown`; optional for older servers too). Where it bills, the
  account's workspaces share its billing workspace's plan (`PlanHolders`,
  `AccountPlanHoldersLive`) and count their channels and media together
  (`PlanPools`, `AccountPlanPoolsLive`, the one place a pool's hold is
  taken: the partner's, else `holdAccount`; channels and media read it). Views read `poolsIn`,
  holding nothing. Holds go payer, then accounts by id; closing an account
  holds the payer first (`ContextRecords.holdUser`).
- Only the billing workspace orders (`BilledElsewhere`); a checkout
  refuses an order placed before the workspace stopped billing, and a
  plan's refusal links the billing workspace's page. `GET …/billing`
  answers `account` (`AccountViews`: the billing workspace named only to
  its members, an open offer only to its two people, and a partner's
  account counting only the workspaces the reader belongs to). Handing a
  workspace over is `TransferWorkspace` (`billingActions`): offered to
  another owner, taken in person within 7 days into their account,
  refused into a plan without room or for a billing workspace Stripe may
  still bill. A reduction is taken when it brings the account within its
  plan or disconnects every channel of the workspace.
- Staff's `BillingAccountDesk` (`billingAccountsDesk` under `/api/admin`,
  the console's `admin/billing-accounts`) lists platform accounts
  connected under two free accounts or more (the channels context's
  `SharedPlatformAccounts`, through `AccountChannels`, kept nowhere),
  merges one account into another (`mergeBillingAccounts`), detaches a
  workspace back to who paid for it before the merge while they own it
  (`merged_from_payer`), else to its oldest owner's account
  (`detachBillingWorkspace`, the way back from a merge; the staff view
  lists `mergedWorkspaceIds`, the merge's event the workspaces moved). A
  merged workspace never bills an account: one left with only those
  goes) and requires a payment method
  (`requirePaymentMethod`, `restoreFreeTier`), each audited first
  (`BillingAccountAudit`), ids only. A requirement is the account's
  `free_tier` and the person's (`billing.payment_requirements`, read
  whenever an account is made for them, carried by a merge, kept by the
  closed address's pseudonym for `requirementMemory`, 2 years, then
  purged by `PurgeContractRecords`; the same `Pseudonyms.ofEmail` value
  a trial and a ban keep, on purpose: one anti-abuse purpose, and the
  export reads the requirement by it too). The data is the registry's
  `billingAccounts` category, and the export's `contracts.billingAccounts`.
- Billing counts the posts each workspace makes on platforms that bill the
  server per post (`meteredPlatforms` in `billing/domain/metered-posts.ts`:
  X, where a post with a link costs about 13 times more), and those with a
  link, by calendar month (UTC), in `billing.metered_posts` (`MeteredPosts`),
  on a server that does not bill too. Publishing reports each target that
  went out through `meteredOutcomes`
  (`publishing/infrastructure/metered-publication-outcomes.ts`), which wraps
  `PublicationOutcomes` in the transaction that settles it, with whether its
  text on the channel holds a link (`countLinks`); an unconfirmed post found
  later is not counted. No plan limits them yet; the counts go with the
  workspace's export and erasure (`BillingRecords`).
- The usage ledger (`billing.usage_days`, `UsageLedger`; vocabulary in
  `domain/usage-meter.ts`) keeps each workspace's counts by UTC day,
  meter and dimension: counts and ids only, and a new meter is a new
  `meter` value, never a column. `publishedPosts` (dimension: the
  platform) is added by `RecordedUsage.postWentOut` from `meteredOutcomes`,
  in the settling transaction: one per target, on the day its first part
  went out, in the round that sent that part (a thread once; a repost that
  sends it again counts again; an unconfirmed post confirmed later
  never). `channels` (the workspace's own), `members`, `mediaStorage` and
  the day's `assistantRequests` are written by `SnapshotUsage` (cron
  `billing.usage-snapshot`, 00:11 UTC) for the day that just ended: every
  workspace created before its end, by id, `snapshotBatchSize` a batch,
  through `UsageStates` (`ContextUsageStatesLive`: one set-based read a
  batch from each context: `WorkspaceSeats.page`,
  `ChannelUsage.connectedIn`, `MediaStorageUsage.storedIn`,
  `AssistantRequests.onDay`), each batch one statement that replaces, so
  a second run or server changes nothing. A missed day keeps no state:
  never backfill one. Each batch, once written, reads its workspaces again
  (`UsageStates.workspaces`) and erases the rows of those erased meanwhile.
  The same run purges the rows past `usageRetentionDays` (400), whether the
  snapshot went through or not. `UsageReports` answers `GET …/usage`
  (billing:read, on a server that bills or not; 92 days at most, 30 by
  default; `sharedWith` from `PlanHolders`), `get_usage` and `peal
  usage`; the contract copies its constants, which
  `test/billing/api/contract.test.ts` keeps equal, as the privacy
  registry's `usageDays` (category `usage`) is kept by
  `data-processing.test.ts`. `UsageReports.ofPartner` (a member with
  partner:read, `GET …/usage/partner`) and `ofPartnerKey` (a partner key
  with `workspaces:read`, `GET /api/partner/usage`, `PartnerUsageApi`,
  refused in the partner API's words from `#shared/api/partner-key.ts`)
  answer a partner's usage per customer: what the workspace context's
  `PartnerTenants` says it holds, through billing's port `PartnerTenancy`
  (`WorkspacePartnerTenancyLive`, which maps its refusals to billing's
  own), checked before the period, then set-based reads, their ids one
  array parameter (`anyUuid`, `#shared/infrastructure/any-uuid.ts`: a
  statement takes 65,535 parameters, so never `inArray` over a partner's
  workspaces): `UsageLedger.ofWorkspaces` for the page, grouped by
  workspace once, and, on the first page only, `postsAcross`,
  `MeteredPostLedger.ofWorkspaces` over every workspace it holds and the
  partner's daily counts for `current`, `days` and `totals`, which are
  null on the pages after it. An empty list asks nothing. An offboarded workspace's rows went
  with it: it leaves the list and the sums, never the daily counts. The
  MCP tool is `get_partner_usage`, the CLI's `peal partner usage`.
  Nothing prices or
  limits by it: the priced half (a partner's unit, platform costs per
  call) is undecided, and goes in as new meters and use cases. The ledger
  goes with the workspace's export (`usage`) and erasure.
- Entitlements come only from `billing.subscriptions`, which
  `RecordSubscription` keeps from Stripe's `customer.subscription.*` events:
  Better Auth's webhook checks their signature, then its `onEvent` finds the
  workspace by its Stripe customer and the plan and interval by the price's
  lookup key, with the start, the period's bounds, the trial's end and the
  member who checked out (`metadata.userId`). An event is recorded once
  (`billing.stripe_events`), never over a newer one; Stripe dates events to
  the second, so of two in the same second the one further along the
  subscription's life wins (`lifecycleStage`). A failure answers the
  webhook an error, so Stripe sends it again. Active, trialing and past due
  subscriptions give their plan.
- Ordering takes two steps. `POST …/billing/orders` (`PlaceOrder`) records
  the order in `billing.orders`: plan, interval or the trial, the member,
  and their request to start at once knowing their right to withdraw
  (`startNow: true`, the unticked box of the billing page;
  `consentVersion` names its words, change it with them). Then Better
  Auth's `/subscription/upgrade` with `metadata.orderId`: its
  `getCheckoutSessionParams` (`checkoutParams`) takes the order once,
  within 30 minutes, for the same member, plan and interval
  (`CheckoutOrders`), or refuses `CHECKOUT_ORDER_REQUIRED`. That hook runs
  only when Better Auth opens a Checkout Session: for a workspace with an
  active or trialing subscription, which it would change in place (Stripe's
  API or a portal `subscription_update_confirm`), the plugin's before hook
  on `/subscription/upgrade` (`orderedChange`) takes the order first, refuses
  a request naming a `subscriptionId`, and opens a Checkout Session of its
  own for `payAsYouGo` (`checkoutBeside`), as a live subscription must not
  change in place. Per-account pricing's checkout (`checkoutParams`, and
  the plan's `lineItems`: each meter's price by lookup key, kept 5
  minutes, a failed lookup 10 seconds, `keptLineItems`) has no quantity on
  any line, asks for a card always (`payment_method_collection:
  "always"`) and anchors on the first of next month UTC without proration
  (`payingParams`), always (Stripe takes no anchor past one period); the
  session closes at the anchor or a day from the hour, whichever comes
  first, but never sooner than Stripe's shortest session (`expires_at`). It opens none while a meter's price cannot
  be found, or the plan Better Auth read lacks one (`CHECKOUT_UNAVAILABLE`).
  A withdrawal from `payAsYouGo` credits nothing: what it paid was the
  month past's usage (`creditsAt`).
  `planOf` reads `payAsYouGo` from `<prefix>_accounts` among the items.
  Once `payAsYouGo` is recorded, `RecordSubscription` ends a trial
  (`orderedDuringTrial`) and sets a legacy plan to end with its period
  (`cancelAtPeriodEnd`, key `moved-<subscription>`; the move with a credit
  is T10's `movedToRateCard`). One per-account subscription per billing
  account: an order is refused while one Stripe may still bill exists,
  past due and unpaid included (`AlreadySubscribed`, in `PlaceOrder` and
  again in `CheckoutOrders.take`), and one recorded beside another (two
  checkouts finished together) is ended at once without a charge, the
  newer by start (`duplicateSubscription`), counted
  (`peal.billing.duplicate_subscriptions`) for the critical alert
  `peal-duplicate-subscription`. The Stripe portal has plan switching and
  cancellation turned off (the self-hosting docs say so): plans change and
  end on the billing page only.
- The trial: Pro for 14 days (`trialPlan`, `trialDays`), once per account
  and per workspace (`billing.trials`; a workspace that ever had a
  subscription has none), through Checkout with
  `payment_method_collection: "if_required"`,
  `trial_settings.end_behavior.missing_payment_method: "cancel"` and a
  35-minute `expires_at`. `CheckoutOrders.take` holds the trial at once
  (`Trials.reserve`, a row without a subscription the unique indexes keep
  to one, for `trialReservationMinutes`), and the trialing event takes the
  hold; a second trial of the account or the workspace that still gets
  through is ended (`duplicateTrial`). Before recording a trialing event,
  `RecordSubscription` sets `cancel_at` to the trial's end
  (`StripeContracts.endAtTrialEnd`), so a card added in the portal never
  turns it into a charge; such a trial is not "cancelled" for the billing
  page. Closing the account keeps a keyed pseudonym of its email address on
  its trial (`Pseudonyms`, HMAC under `BETTER_AUTH_SECRET`) for
  `trialMemory` (2 years), which checkout refuses a trial to. Pause would
  leave a subscription that may still bill.
- `billingActions` (`/orders`, `/cancellation`, `/withdrawal`) answer only
  members with billing:manage in their own session: never an API key, an
  OAuth client or staff impersonating them (403; the use cases refuse an
  impersonated actor too, `PersonRequired`). The SDKs leave the group out
  (`ownSessionTags`).
- A `payAsYouGo` subscription ends with its usage invoiced: withdrawing
  uses `StripeContracts.endAndInvoice` (`invoice_now`), and deleting the
  workspace cancels a subscription with a metered price with
  `invoice_now` (`StripeCheckoutsLive`).
- Cancelling (`CancelSubscription`) sets `cancel_at_period_end`, ends a
  trial at once, or, for a day asked for after the period paid for
  (D215-2, 4°), sets Stripe's `cancel_at`, which charges the last period
  only up to that day (`cancellationEffect`). Withdrawing (`Withdraw`) is
  open 14 days from the contract's
  start (`mayWithdraw`), cancelled or not, refused to a customer with a
  verified `eu_vat` id (`StripeContracts.isBusiness`), and refunds each
  paid invoice since the start for the part of its own period not
  supplied, to the second (`refundOf`), through a credit note on each
  (`StripeContracts.credit`), so the invoice and Stripe Tax's report match:
  the withdrawal is recorded first (`billing.withdrawals`), then credited,
  computed at the time recorded, and ended under idempotency keys, so
  trying again refunds the same amounts once.
- The words of the two functions are the law's, in every catalogue,
  email, doc and legal page: **Cancel your contract** / **Résilier votre
  contrat**, then **Notify the cancellation** / **Notification de la
  résiliation** (Code de la consommation D215-1, D215-3); **Withdraw from
  contract here** / **Renoncer au contrat ici**, then **Confirm
  withdrawal** / **Confirmer la rétractation**, alone on its button
  (D221-5; Directive 2011/83/EU art. 11a). Never reword them, and change
  the order box's words only with `consentVersion`.
- Both functions are reached without signing in: `/cancel` and
  `/withdraw` in the web app (`ContractFunctionPage`), linked at the foot
  of every page (`ContractLinks` in `AppShell`, only on a server that
  bills) and of the marketing site (`SITE_APP_URL`). They ask what
  D215-2 and D221-5 list and nothing else (name, address for the
  acknowledgement, the contract, the day wanted), show a summary, then
  the one action. Never add a field, an offer or a reason to them. A
  member who manages billing, signed in, picks their contract there and
  is applied at once through `billingActions`; the billing page keeps
  the same two steps for its own workspace.
- A request is a `ContractRequest` (`billing.contract_requests`), recorded
  with `receivedAt` before anything else: the moment that counts whenever
  it is applied. `CancelSubscription.received` and `Withdraw.received`
  apply one as of that moment (a renewal charged since goes back and the
  plan ends, `cancelledLate`; a withdrawal's 14 days and refund are
  computed at it); the member's own `cancel` and `confirm` record theirs
  as received and applied at once (`channel` `session`).
- Who may end a contract through the form (`ReceiveContractRequest`,
  `POST /api/contract-requests`, group `contractRequests`, no
  credentials): one that gives the contract's number is applied at once,
  whatever its address; one whose address manages a subscribed
  workspace's billing (`ContractHolders`, the workspace context's
  `AccountLookup`) waits for the link in its acknowledgement
  (`ConfirmContractRequest`: the token kept as its SHA-256, 30 days,
  once; `/contract-request?token=`, sent in a body, applied on a click);
  any other waits for staff. Never apply on an email address alone: a
  stranger who knows it would end the contract. The answer is the same
  whatever was found (`receivedAt` only), and the request is looked at
  on a fiber after it (`process`), so neither its content nor its time
  tells whether an address has an account.
- The contract's number (`ContractReferences`, `referenceFrom`: 60 bits
  of an HMAC of the subscription's id under `BETTER_AUTH_SECRET`, kept in
  `billing.contract_references`) is "une référence préalablement
  communiquée" (D215-2, 3°): the confirmation and the renewal reminder
  give it (`reference` on those notices, an optional key older notices
  lack), to the members who manage billing only. Never show it to anyone
  else, nor in a view of the API.
- Each form request is acknowledged by email to the address it gave
  (`RequestMail`, the `ContractRequestAcknowledged` account email): when
  it came, to the minute, what it said, and what became of it. Its name
  and contract take letters, digits, spaces and `' , & ( ) -` only
  (`RequestTextSchema`), as the email quotes them to an address nobody
  checked. `ContractRequestIntake` (`src/app/contract-requests/`) takes 5
  requests an hour per client address and a Turnstile token when the
  server has Turnstile (`CaptchaChallenge.passes`, which lets through
  what Cloudflare cannot answer: the functions stay reachable); an
  address is written to 5 times a day (`acknowledgementsPerDay`), the
  rest left to staff. The `billing.contract-requests` cron
  (`catchUp`, every five minutes) takes up what the mail or Stripe could
  not take.
- Staff handle what the form could not apply (`ContractRequestDesk`,
  group `contractRequestsDesk` under `/api/admin`, the console's
  `admin/contract-requests`): apply one to a workspace's contract, as of
  its receipt, or close it, each recorded first through
  `ContractRequestAudit` (`applyContractRequest`, `closeContractRequest`:
  the request's id and the workspace's, never its name or address).
- Billing tells the members with billing:manage through `BillingNotices`
  (`Notify`), in the app and by email whatever their email choices
  (`emailKindOf` is none for these): `SubscriptionStarted`, the contract's
  confirmation; `SubscriptionCancelled`; `SubscriptionWithdrawn`, with its
  date and time; and, from the hourly `billing.reminders` cron
  (`SendBillingReminders`), `TrialEnding` three days before and
  (with what the workspace holds beyond the free plan) and
  `SubscriptionRenewing` 45 days before a yearly plan renews, and never
  later than 32 days before (`renewalWindow`: "one month" before a 31st
  is 31 days), in an email of its own with the last day to refuse in a
  box (`renewalDeadline`), as Code de la consommation L215-1 asks; the
  terms reproduce L215-1 to L215-3 and L241-3 (L215-4). Each once, by key. A confirmation and a renewal
  quote what Stripe charges, VAT included (the first paid invoice, the
  next invoice's preview, `StripeContracts.upcomingTotal`), never the
  catalogue: one Stripe cannot price yet waits for the next run. A
  `payAsYouGo` confirmation charges nothing: it states the rate card's
  rates (`rates`, an optional key older notices lack) with a price of 0.
- Better Auth's subscription routes take `customerType: "organization"` and
  the workspace as `referenceId` only, for members with `billing:manage`,
  never staff impersonating them. Checkout always sends Stripe Tax's
  parameters: prices are tax-exclusive at Stripe and shown VAT included
  everywhere, so a server that bills needs Stripe Tax. A workspace Stripe may still bill
  (`billsAt`: any status but cancelled or incomplete, unpaid and paused
  included, in `billing.subscriptions` or the plugin's `auth.subscription`)
  is deleted only once the person agrees to cancel its subscriptions, which
  `BillingRecords` then does at Stripe at once, without proration (see
  Accounts and access); it also expires its open checkouts. Better Auth's
  `/organization/delete` is disabled, so its hook refuses nothing. Erasing
  a workspace deletes the orders no contract followed; those of a
  workspace that had a subscription, its withdrawals and its requests to
  cancel or withdraw, stay without
  it, by their Stripe customer and subscription (`erased_at`), for
  `contractRetention` (5 years, Code civil art. 2224), then the daily
  `billing.contract-retention` cron (`PurgeContractRecords`) deletes them,
  with the requests no contract was found for, 5 years after their
  receipt, and the trial pseudonyms past `trialMemory`. A user's orders,
  withdrawals and requests are in their export (`contracts`,
  `ContractRecords`, `ContractRequests.ofUser`); closing the account
  leaves its requests without the user, the name and the address.
  Erasing leaves the trial to the account; closing an account leaves
  orders, trials and withdrawals without the user
  (`Subscriptions.forgetUser`).
- Never call Stripe in tests: checkout and the portal run against
  stripe-mock, billing's own calls (`StripeContractsLive`) against a
  stand-in server, and webhooks post the payloads in
  `test/billing/fixtures/webhooks`, signed in the test. The app's engine
  in tests runs no workflow, so what notifies (cancelling, withdrawing) is
  tested at the use cases and with `NoticesTest`.
- Contract requests (cancel, withdraw) save their intent
  (`contract_requests.intent`) before Stripe is called, and every Stripe
  call they make carries a key of the request, never of the subscription
  alone: a retry finds what was decided and finishes it, and a second
  request after an undo is a new one. Credit notes carry `metadata.key` and
  are looked for before one is made. A request Stripe refuses for good
  (`StripeUnreachable.permanent`), or not applied within `applyingPatience`
  (24 hours), is left to staff, who see it; one whose subscription ended
  since it was received is settled against that contract (`contractAt`). A
  desired end day is at most `desiredDayHorizonDays` ahead
  (`DesiredDayTooFar`), and can be brought forward.
- Refunds follow invoice lines: only lines whose period starts on or after
  the request, on a paid invoice (`renewalRefund`); a subscription that
  started after the request is not its contract (`NothingToCancel`).
- `RecordSubscription` keeps the stored plan when an event's price is
  unknown (a price since replaced), and never drops the event. The startup
  price check fails the server on a refusal or an answer it cannot decode
  (`StripePricesUnchecked`); only Stripe not answering is a warning.
- An order is checked against the workspace's usage when it is taken
  (`UsageAtCheckout`, bound once the contexts it reads are built): a plan
  the workspace outgrew during its trial is `OrderRequired` again.
- The contract form's intake decides by the matched endpoint, never the
  path as written, and counts acknowledgements per address without case,
  under a lock (`ContractRequests.claimAcknowledgement`).
