# Ads

This code spends a customer's money. Change it tests first, and never
weaken a rule below to make something pass.

- Ads are off unless the operator sets `PEAL_ADS` (`adsModeConfig`): `off`
  (unset or blank), `read` (ad accounts connect and are read; the sign-in
  asks for `ads_read` only) or `spend` (boosting too). Anything else stops
  the server, as does `read` or `spend` without Meta's main app
  (`META_APP_ID`, `META_APP_SECRET`): ads run on the app Facebook Pages
  connect with, so its data deletion and deauthorize callbacks reach the
  ads sign-ins (`PlatformUserGrants`, backed by `AdsPlatformUserGrants`).
- An ad account is not a channel. A person signs in to the network
  (`AdGrant`, `ads.grants`: one per person, network and workspace; signing
  in again renews it) and picks the accounts to connect (`AdAccount`). Only
  a person in their own session with `ads:manage` signs in, and only who
  signed in picks from their sign-in (`ownGrant`). The token is sealed by
  the channels context's `TokenCipher`, bound to `ads:<grant id>`
  (`CipherGrantSecrets`): never add crypto here. A token the network
  refuses marks the grant `reconnectNeeded`, tells those with `ads:manage`
  once, and its accounts are no longer synced until the person signs in
  again. Never log a token, nor a network's error message, which may quote
  what was sent: only its code (`graph<code>.<subcode>`).
- Permissions: `ads:read` (owner, admin, editor), `ads:manage` and
  `ads:spend` (owner, admin), `ads:authorize` (owners alone, and no OAuth
  client ever: `personOnlyPermissions`). Staff acting as a member only
  read (`withheldWhileImpersonating`, and `Boosts` checks again). An OAuth
  client needs `workspace:ads` beside `workspace:write` to manage accounts
  and beside `workspace:publish` to spend (`scopesFor`).
- Money is an integer in the account's minor units as its network counts
  them (`minorUnitDigits`: Meta's own table, not ISO 4217's), with its
  currency. Never a float: what a network writes as a decimal is read digit
  by digit and rounded up (`minorUnitsOf`). Amounts of two currencies never
  add: reports are per ad account.
- Spending is off on every account until an owner turns it on with a
  monthly ceiling in the account's currency (`SpendAuthorizations.decide`).
  The ceiling bounds what boosts made through Peal commit in each calendar
  month of the account's time zone; a boost counts whole in every month its
  run touches. A total budget commits its amount; a daily budget, for each
  calendar week (Sunday to Saturday, the account's zone) the run touches,
  175% of its amount for each day touched and never more than 7 times it
  (`commitmentOf`, `committedWhenStopped`), the limits Meta's "About daily
  budgets" page states; ad set budget sharing stays off, as it would allow
  more. Every state but `failed` counts
  (`countsAgainstCeiling`); `committed` only ever goes down. A ceiling may
  always be lowered, under running boosts too; turning spending off, and
  disconnecting an account, are refused while a boost is requested, active
  or unconfirmed, and disconnecting while one is paused too (`heldOn`), as
  a paused campaign can run again (`AdAccountBusy`). Boosts have no
  foreign key to their account: they outlive a disconnection, and what
  they commit counts by the account at the network (`account_network`,
  `account_external_id`), so a reconnection resets nothing, and a workspace is not erased then
  (`BoostsRunning`). Peal never raises a budget or a ceiling on its own.
- `ensureRoom` (`spend-guards.ts`) checks the owner's decision, the
  ceiling and the account's own spend cap, and is called only inside
  `AccountStore.spendingOn` (an advisory lock per account) with the write
  it guards: at the request, again before the campaign runs, and on
  resume. Two boosts asked together are counted one after the other.
- A boost (`Boosts.request`) is refused before anything is reserved when
  Peal can tell it is wrong (`planBoost`: the currency is the account's,
  an end is required, a day to 90 days, countries and ages 18 to 65 only,
  no special ad category, who benefits and who pays for an audience in the
  EU). Validate in the domain, never by a trial request: networks count one
  as a write. Its idempotency key answers the same boost, never another.
- `BoostOperations` sends a boost's requests, inside its account's gate
  (`AdGate`, one call at a time per account; `GatedAds` on the cluster,
  `DirectAds` without it). The rules, each with a test in
  `test/ads/application/boosts.test.ts`:
  - every request that changes something is journalled first
    (`ads.spend_calls`, committed before it leaves: ids, steps and codes,
    never an amount or an audience);
  - everything is made paused (campaign, ad set, ad), then turned on from
    the innermost out; `activateCampaign` is the one request that spends;
  - nothing turns the campaign on unless the boost is still `requested`
    and counted: the last check reads the boost again under the account's
    spending lock; a save that finds it settled elsewhere stops the
    placement, and a campaign turned on as it was settled is paused again.
    Giving up (`give-up`) goes through the gate (`GiveUp`), and a
    workspace's erasure and Meta's deletion request take the spending lock
    of each account they remove (`spending-locks.ts`);
  - a request whose answer was lost (`OutcomeUnknown`) is never sent again
    as it is: the object is looked up by the name Peal chose
    (`networkNameOf`), made again only when the network says it is absent,
    and `retry` when it cannot say;
  - starting, pausing and resuming set a state, never add to one, and are
    read back when their answer is lost;
  - a start the network cannot confirm leaves the boost `unconfirmed`,
    counted, told to the owners, and never touched again by Peal: a person
    stops it; a job that gives up after trying to start tells the campaign
    to stay paused first;
  - before the campaign runs, the account is read from the network again
    and the ceiling checked again;
  - pause and stop are asked twice as once, and open to `ads:manage` too.
- `PlaceBoostV1` (payload `boostId`, activities `place/<n>` and `give-up`,
  clocks `retry/<n>`), the crons `ads.sync`, `ads.end-boosts` and
  `ads.retention`, the journal's steps and outcomes, the audit actions,
  boost states and failure reasons are persisted contract: add, never
  rename. Payloads hold ids only.
- The sync (`SyncAdAccounts`, hourly at minute 43) pages through every
  account due by cursor, never with a cap, four at once, each through its
  gate, stops starting reads 50 minutes after its scheduled time and says
  what it left (`peal.ads.sync.left`, `.duration`, `.unfinished`, with the
  `peal-ads-sync-behind` alert). `SyncAccount` reads 90 days of daily
  numbers the first time, the last 7 after, stops at 75% of the account's
  rate limit (`haltAtPercent`) and comes back after the wait the network
  gave. Objects the network stops listing are kept as `archived`, only
  after a listing read whole. Ads are matched with the workspace's own
  published posts through `PromotablePosts` (publishing's
  `PublishedTargets`, ordered by `listed_at`). A target's
  `platform_post_id` is its first part's, so a boost of a post in several
  parts promotes the post itself, never a reply; Facebook and Instagram
  take no parts so far. Only feed posts are matched and offered
  (`isFeedPost`): a story leaves after a day, and a reel is known by its
  video's id. `BoostFollowUp` ends boosts past their end date and
  tells once when a total budget is spent.
- Every decision about money and every change to a boost is in
  `ads.audit_events` with who made it (`audit`), read by owners alone, kept
  13 months as the days of numbers are (`insight-retention.ts`, the
  `adInsights` and `adAuditTrail` periods of the data-processing registry:
  change them together). Owners are told through `AdNotices` (notices,
  always emailed, and the `boost.*` webhook events: ids and amounts, never
  an audience), in the transaction that records the fact.
- Meta's adapter (`infrastructure/meta/`) is written from the Marketing
  API's reference, whose pages its comments name. It was never run against
  Meta: before `PEAL_ADS=spend` is set anywhere, run a boost on a test ad
  account and compare what Meta takes with `paramsOf`. Tests run against
  the loopback fake (`test/ads/fakes/fake-marketing-api.ts`), which can
  refuse, slow down, or lose an answer after acting (`lost`) or before
  (`dropped`). Use cases are tested on Postgres with `AdsTest`
  (`test/ads/support.ts`): `onMeta` starts a fake for the test, and boosts'
  jobs are recorded, never run: a test places a boost itself.
- Handlers map each refusal to its contract error and `DatabaseError` to a
  defect inside `catchTags`: never `Effect.orDie` after it, which turns
  every refusal into a 500.
- Managed ads (`MeteredUsage`, `managedAds`): `SyncAccount` counts each
  ad it reads `active` or `inReview` once a calendar month (UTC), by the
  workspace that connected it (`ActiveAdMonths`, `ads.active_ad_months`,
  insert-or-nothing with its claim in one transaction, purged with the
  days of numbers and erased with the workspace). Once the meter refuses
  (no payment method, the month's allowance used) the ads it could not
  count are not recorded and their days are not saved; nothing the
  network runs is touched. `Boosts.request` refuses a new boost then,
  before anything is reserved (`pausedOf`).
- `PostBoosts` (`application/post-boosts.ts`) answers how many boosts of a
  published target are not over (requested, active, paused, unconfirmed):
  publishing refuses to delete such a post from its platform
  (`boostRunning`), as the ad would go on spending on a post that is gone.
