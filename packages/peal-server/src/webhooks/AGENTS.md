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
  per endpoint that is on and subscribes, and the start of each job commit
  with the fact, or not at all, once per key (ids and instants, never
  content). A workspace where nobody listens keeps nothing. Publishing
  tells through `PostEvents` (schedule, unschedule, cancel, confirm, in
  `PostScheduling`'s and `PostFollowUp`'s transactions) and
  `webhookOutcomes` around `PublicationOutcomes`; channels through
  `ChannelEvents` (connect, reconnect, disconnect, in
  `ChannelRepository.addingTo`'s transaction) and `webhookChannelNotices`
  (reconnect needed, which the daily check tells again); media through
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
  notice, always emailed. A delivery whose endpoint is off fails without a
  request.
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
  never turns back on an endpoint a delivery just turned off. Test events
  and resends are capped per workspace (`ManualSends`,
  `manualSendsPerHour`, `TooManyWebhookSends` 429).
- An attempt the database fails past its own retries is `unrecorded`: the
  workflow sleeps `recoveryDelay` and makes the same attempt again
  (`attempt/<n>/again/<k>`, `recover/<n>/<k>`, persisted contract),
  `maxRecoveries` times.
