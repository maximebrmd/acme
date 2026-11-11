# Webhooks

- A workspace's endpoints (`WebhookEndpoints`, `WebhookDeliveries`) hear
  what happens in it: reading needs `webhook:read`, changing
  `webhook:manage` (owners and admins; API keys and OAuth clients follow
  the permission; staff impersonating a member only read). 10 endpoints a
  workspace, whatever the plan and on a server that does not bill
  (`delivery-policy.ts`, counted under `EndpointStore.addingTo`'s advisory
  lock). The contract copies the vocabulary and the limits, kept equal by
  `test/webhooks/api/contract.test.ts`, which also decodes every example of
  the docs' Webhooks page, en and fr: change them together.
- Events (`#webhooks/domain/webhook-event.ts`, `WebhookPayloadSchema` in the
  contract) are public contract, stored until delivered: add a type or a
  field, never rename or remove one; a change receivers could not read is a
  new `version` sent beside the old. They carry ids, states, codes, instants
  and permalinks, never a post's text, a file, a handle or a name: the
  receiver reads those through the API. Keep
  `fixtures/persisted/events/stored.json` decoding.
- Contexts publish through `WebhookEvents.publish({ event, key })`, which
  joins the caller's transaction (as `Notify` does): the event, one delivery
  per endpoint that is on, subscribes and whose filters match (`wants`, with
  the endpoint as it is then), and the start of each job commit with the
  fact, or not at all, once per key (ids and instants, never content). A
  workspace where nobody listens keeps nothing.
- Filters: `channelIds` (50) and, on a `partner` endpoint only,
  `workspaceIds` (200; the home workspace heard only if listed), ids checked
  for shape only and kept as saved, with no port into channels or
  workspace. `channelsOf` (`domain/webhook-event.ts`, exhaustive) says
  which channels each type concerns: `named` from its data, `none` (media,
  boosts, tests: they pass every channel filter), or `ofPost` for the
  whole-post events whose data names none (`postWideEventTypes`), which
  `EventToPublish` makes the teller pass as `postChannelIds` (publishing
  reads the targets for `post.unscheduled`; review passes the reviewed
  post's channels, and the approval gate the submitted subject's,
  `channelsSubmitted`). A new type does not compile until it says which. Publishing
  tells through `PostEvents` (schedule, unschedule, cancel, confirm, in
  `PostScheduling`'s and `PostFollowUp`'s transactions, and finish,
  wherever a post becomes `finished`: `post.finished`, once per round and
  outcome) and
  `webhookOutcomes` around `PublicationOutcomes`; channels through
  `ChannelEvents` (connect, reconnect, disconnect, in
  `ChannelRepository.addingTo`'s transaction; turned off and on, in
  `ChannelSettings`') and `webhookChannelNotices` (reconnect needed and
  expiring, which the daily check tells again); media through
  `webhookMediaAssets`, around `MediaAssets.update`. A bug in telling is
  logged and never stops the fact; the database failing rolls both back.
  A new event is told from the transaction that records its fact.
- Deliveries follow the Standard Webhooks specification
  (`#webhooks/domain/signature.ts`): `webhook-id` is the event's id, the
  same on every attempt and on "send again", `webhook-timestamp` the
  attempt's time, `webhook-signature` one `v1,<base64 HMAC-SHA256>` per
  secret over `<id>.<timestamp>.<body>`, the body being `bodyOf`'s text
  byte for byte. Order is not guaranteed and deliveries repeat: the docs
  say so.
- Secrets are `whsec_` and 32 random bytes, issued and used behind
  `EndpointSecrets`, on the channels context's `TokenCipher`
  (`webhook:<endpoint id>`), so without `PEAL_TOKEN_KEYS` creating an
  endpoint answers `WebhooksNotConfigured` (503). The plain secret leaves
  once, in the answer to create or rotate; a rotated one signs beside the
  new one for 24 hours. Never log one, nor an endpoint's URL, whose path
  or query may hold the receiver's secret: logs, notices and the staff
  console name an endpoint by id and host.
- An endpoint's own headers (`domain/endpoint-headers.ts`,
  `maxEndpointHeaders` 5, an owner's decision): names are HTTP tokens,
  once whatever their case, never `webhook-*` nor `refusedHeaderNames`, so
  none can replace one of Peal's (the transport merges them under Peal's
  anyway); values visible ASCII on one line. Values are sealed through
  `EndpointSecrets.sealHeaders`, bound to
  `webhook:<endpoint>:header:<lowercased name>`, in
  `webhooks.endpoints.headers` (`[{ name, sealed }]`), opened only to send
  (`openHeaders`; one that no longer decrypts abandons the delivery as
  `notConfigured`, as a secret does), and never returned, logged or
  exported: the view, the export and the staff console name them only
  (`headerNames`). A change's `headers` replaces the whole list, left out
  it keeps it. The contract's copy of the rules is kept equal by
  `test/webhooks/api/contract.test.ts`; `test/app/secrets-in-logs.test.ts`
  searches the logs, traces and delivery log for the values.
- `WebhookTransport` sends through `publicHttpClient` only (HTTPS on 443,
  public addresses checked before every request, no redirect followed, no
  trace context), with its spans off and 15 seconds for the whole exchange.
  Any 2xx is success; of another answer the log keeps the status and
  `excerptOf` its body (one cleaned line, 256 characters), nothing else.
- `DeliverWebhookV1` (payload `deliveryId`, activities `attempt/<n>`, clocks
  `retry/<n>`, results `retry` or `settled`) is persisted contract, with
  fixtures in `test/webhooks/infrastructure/fixtures/persisted`. It makes 8
  attempts over about a day (`retryDelays`), each recorded by
  `DeliverWebhook.attempt` with its number, so one made twice counts once.
  `410 Gone` fails the delivery and turns the endpoint off; so do 5 days of
  failed attempts (`failing_since`, cleared by a success or by turning it
  back on). Turning off happens once (`EndpointStore.disable`), and tells
  the members with `webhook:manage` through the `WebhookEndpointDisabled`
  notice, always emailed. A delivery that fails for good (its attempts used up,
  or a secret that no longer decrypts) while its endpoint is still on once
  the attempt is recorded tells them `WebhookDeliveriesFailing` in the same
  transaction (`EndpointNotices.failing`, keyed
  `webhook-failing:<endpoint>:<UTC day>`, so once a day), emailed as their
  `webhookFailing` preference says. A delivery whose endpoint is off fails without a
  request. Its payload's `startAfterMillis` (decoding default 0) is slept
  first under the clock `start`, in memory: how deliveries sent again
  together are spaced out (`bulkReplaySpacing`, 250 ms per endpoint).
- The log keeps a delivery 30 days (`webhooks.delivery-retention` cron,
  `PurgeDeliveries`), and an event while a delivery refers to it: the docs
  say 30 days, change them together. Tests of the purge set the clock long
  before any other suite's rows.
- Tests use `WebhooksTest` (`test/webhooks/support.ts`): Postgres, real
  secrets with the synthetic keyring, `FakeTransport` (hosts ending in
  `.internal.example` are not public, `.invalid` unknown), `StartedJobs`
  and `ToldNotices`; `eventsSentTo` reads what an endpoint was sent. The
  transport itself is tested against a loopback receiver
  (`fakes/fake-receiver.ts`).
- `EndpointStore.update(endpoint, from)` writes the status and
  `failingSince` only when the member toggled them: a change of description
  never turns back on an endpoint a delivery just turned off.
- Manual sends are counted in Postgres (`DrizzleManualSends`,
  `webhooks.manual_sends`), per workspace, kind and fixed UTC hour, one
  conditional upsert per take inside the send's transaction, so every
  server shares them: `single` (test events and single resends,
  `manualSendsPerHour`, 30) and `bulk` (`bulkRedeliveriesPerHour`, 1,000),
  `TooManyWebhookSends` 429 with `retryAfterSeconds` and `Retry-After`. A
  count that cannot be kept refuses the send. The retention cron drops
  the counts a day old; erasing a workspace deletes its counts.
- The log across endpoints (`WebhookDeliveries.search`) scopes by
  `deliveries.workspace_id`, the endpoint's workspace, so a home workspace
  lists its partner endpoints' deliveries of tenants' events; each delivery
  carries the event's workspace and `externalId` (joined from `events`) and
  `redeliveryOf`. `redeliverMany` takes ids or an endpoint's failed
  deliveries (the last of each event, oldest first, `maxBulkRedelivery`
  100, `remaining` the rest), in one transaction: rows locked `FOR UPDATE`,
  then each endpoint's event held (`holdEvents`, an advisory lock, taken by
  the single `redeliver` too, so calls naming different deliveries of one
  event take turns), then `sentAgain` read in a later statement (READ COMMITTED sees what a
  concurrent call committed), skips (`notFound`, `endpointDisabled`,
  `alreadySent`), the whole call's `bulk` budget, then the deliveries.
- Test events of a type send `sampleOf` (`domain/sample-events.ts`, one per
  subscribable type, typed so a new type needs its sample), recorded with
  `sample` (`events.sample`) and sent with `sample: true` in the envelope,
  whatever the endpoint subscribes to or filters.
- An attempt the database fails past its own retries is `unrecorded`: the
  workflow sleeps `recoveryDelay` and makes the same attempt again
  (`attempt/<n>/again/<k>`, `recover/<n>/<k>`, persisted contract),
  `maxRecoveries` times.
- A webhook endpoint has a `scope`: `workspace`, or `partner`, in a home
  workspace only (`PartnerNotFound`, 404, elsewhere), which also hears every
  workspace the partner owns (`EventOrigins`, which
  `PartnerEventOrigins` backs). Every payload carries
  `workspaceExternalId` beside `data`, as it was when the event happened
  (`events.external_id`). A partner key never acts in the home workspace,
  so that endpoint is made by a member or the home workspace's API key.
