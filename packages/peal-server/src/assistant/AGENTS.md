# Writing assistant

- The assistant suggests a change to a post's text (rewrite in a tone,
  shorten to fit a platform, translate, suggest hashtags), or writes a
  first post from a subject (`write`, optionally in a tone, a language and
  a platform's limits), through the
  `WritingModel` port: Anthropic (`@effect/ai-anthropic`) or any
  OpenAI-compatible endpoint that serves `/chat/completions`
  (`@effect/ai-openai-compat`: `@effect/ai-openai` calls `/responses`
  only), as `PEAL_AI_PROVIDER` says. It calls the provider directly, not
  through the outbound guard: the operator, not a member, names it. Unset,
  `UnavailableWritingModelLive` turns it off, and the status answers
  `available: false`.
- Drafts are data, never instructions. The system message depends on the
  action alone (`assistant/domain/writing-prompt.ts`); the draft goes in the
  user message as the single field of a JSON document (`draft`, or
  `subject` for `write`, the plan's `field`). Never put a draft's
  text, or anything a member typed, in the instructions.
- The model answers in a shape Schema decodes, and the domain checks it
  (`suggestion.ts`) before anyone sees it. Answers are returned whole, never
  streamed, so nobody reads unchecked text.
- Never log or trace a prompt, a draft or an answer, nor a provider's error,
  which can quote them. The adapter turns effect/ai's and the HTTP client's
  spans off around the call, sends the provider no trace context, and
  records only the provider, the model, token counts and the kind of
  failure; `WritingFailed` carries no cause. `assistant.daily_usage` holds
  counts only.
- Every use case checks `assistant:use` (owners, admins, editors and
  contributors; not viewers, nor read-only OAuth clients) and works in the
  actor's workspace only.
- The quota is per UTC day, across the billing account's workspaces on a
  server that bills and per workspace elsewhere: `AssistantAllowance` gives
  the limit (the plan's on a server that bills, otherwise
  `PEAL_AI_DAILY_REQUESTS`, 100) and the pool (`sharedWith`, billing's
  `PlanPools`, none when it does not bill), and `AssistantUsage.claim`
  counts a request before the call: alone, in one conditional upsert; in
  a pool, in a transaction holding the pool, then each of its workspaces'
  lock in their order, the pool's day summed with it. Each workspace keeps
  its own count; the status and billing's usage show the pool's
  (`pooledUsed`). Requests sent together never pass it. Give a
  request back only when the provider never ran it (`unreachable`); a
  timeout, a refusal or an unusable answer counts.
- The model has 90 seconds to answer (`answerTimeout`). Anything between the
  browser and the server must wait longer: the web app's `/api` proxy waits
  120 seconds (`experimental.proxyTimeout` in `next.config.ts`).
- The assistant reads platforms' text limits through its `PlatformLimits`
  port, from `publishing/application/platform-text-limits.ts`. Its tones and
  languages are listed in its domain and copied in the contract, kept equal
  by `test/assistant/api/contract.test.ts`.
- Images go through an `ImageModel` port of their own, apart from the
  writing model, which may make none: `PEAL_AI_IMAGE_PROVIDER`
  (`openai-compatible`, or unset for off: `UnavailableImageModelLive`),
  `PEAL_AI_IMAGE_BASE_URL`, `PEAL_AI_IMAGE_MODEL`, `PEAL_AI_IMAGE_API_KEY`.
  Its adapter (`openai-compatible-image-model.ts`) calls
  `POST {base}/images/generations` itself, at the operator's host, with no
  `response_format` (current models answer base64; a field left out may be
  `null`); a `url` answer came from outside, must be absolute and goes
  through `publicHttpClientWith`. Answers are bounded (`maxAnswerBytes`,
  then `maxImageBytes`, the library's image limit; the text is decoded as
  it arrives, so a request holds about three copies of an image at its
  peak, some 60 MiB at the bounds), the call waits `imageAnswerTimeout`
  (90 seconds). 401, 402, 403 and 404 say the operator's settings are
  wrong: logged by status alone, answered `AssistantUnavailable`, and
  images stay off (`available` false) until the server restarts. Another
  4xx is `refused`, 429 and 5xx `unreachable`. It was written to one
  provider's reference and tested on a loopback fake only: it has never
  called a real provider.
- `generateImage` needs `assistant:use` and `media:upload`. Before anything
  is spent: the model on, the prompt checked (1 to 1,000), the plan's
  storage room for the largest image (`GeneratedImages.roomFor`), one of
  the `imagesAtOnce` slots (two a workspace, eight a server, `ImageSlots`,
  past them `ImagesBusy`, 429), then `imageRequestCost` (5) claimed of the
  same daily requests a suggestion takes one of (`AssistantUsage.claim`'s
  cost), within `AssistantAllowance.imageRequests`: the day's limit, but
  `imageRequestsOnTrial` (0) while the plan is on trial. The cost is given
  back whenever no image came of it (`unreachable`, `refused`, the
  settings refused, or `PlanLimitReached` when the library counts again);
  a timeout or an unusable answer counts. No plan or price changes, and
  the free plan's 3 make none.
- The image is kept through the `GeneratedImages` port, whose adapter
  (`library-generated-images.ts`) calls the media context's
  `storeGenerated`: stored untouched, marked `aiGenerated`, no alt text.
  Bytes the library does not take are `ImageFailed` `unusableAnswer`, and
  count. Never log or trace a prompt, an image or a provider's error;
  `ImageFailed` carries no cause.
- A workspace may bring its own image provider (`ImageProviders`,
  `assistant.image_providers`, one row a workspace): an address
  (`checkProviderAddress`: HTTPS on the default port, as the outbound guard
  takes, no credentials, query or fragment, 2,048 characters, stored
  without its final slashes),
  a model (one line, `providerModelPattern`) and a key, sealed through the
  `ProviderSecrets` port on the channels context's `TokenCipher`
  (`CipherProviderSecrets`), bound to `assistant:<workspace>:<address>`,
  the whole address: a row whose address changed in any way, or moved to
  another workspace, opens without its key (`keyUnreadable`), so a key
  never reaches an address it was not typed for. No crypto here. Saving checks the address with the outbound
  guard once (`ProviderAddressCheck`), never calls the provider, and keeps
  the stored key only while the address stays exactly the same
  (`ImageProviderKeyRequired` otherwise); without a keyring nothing is stored
  (`ProviderSecretsNotConfigured`, 503). `assistant:configure` (owners,
  admins, keys and partner keys given it; withheld from staff
  impersonating, and from every OAuth client but Peal's command line:
  `commandLineOnlyPermissions`) reads, sets and removes it; no MCP tool
  does. Staff
  impersonating a member make no image with it either: the workspace's
  account pays.
- With a provider, `generateImage` asks `OwnImageModel` only
  (`openai-compatible-own-image-model.ts`, the same request and answer
  reading as the server's adapter, `images-api.ts`): through
  `publicHttpClientWith` (the guard on every call, no redirect, the answer
  bounded), with slots of its own (`ImageSlots.take(…, "workspace")`, as
  many as the server model's, so a silent endpoint starves nobody else),
  the storage check, and `ownImagesPerDay` (50) a workspace and UTC day,
  counted whatever each ends with (`OwnImageCounts`,
  `assistant.own_image_days`; `OwnImagesExhausted`, 429). It reads and
  counts nothing of `AssistantAllowance` or `AssistantUsage`, on any plan. Never
  the server's `ImageModel`, not even when it fails, nor with a key that no
  longer opens (`ImageProviderRefused` `keyUnreadable`). 401 to 404 and an
  address the guard refuses are `ImageProviderRefused`, with no state: the
  next call tries again. Its logs and span say `workspace`, the status and
  the kind of failure: never the host, the model, the prompt or the key.
  The status answers `images.source` (`workspace`, `server` or null), and
  `requestCost` 0 for the workspace's own. Exports give the address, the
  model and the date (`UsageRecords.exportImageProvider`), never the key;
  erasing a workspace deletes the row. The row names no member: the
  activity log keeps who saved it.
- A workspace may bring its own text provider too (`TextProviders`,
  `assistant.text_providers`, one row a workspace, `kind` `anthropic` or
  `openai-compatible`): the image provider's address, model and key rules,
  its key sealed through `ProviderSecrets` for `text`
  (`assistant:text:<workspace>:<address>`, so neither provider's key opens
  as the other's). Same permission (`assistant:configure`), same keeping of
  the key on save (`TextProviderKeyRequired`), no MCP tool.
- With one, `suggest` asks `OwnWritingModel` only (`own-writing-model.ts`):
  the server's own provider packages (`languageModelOf`) on
  `publicLibraryHttpClientWith`, the address checked by the guard before
  the call (a refusal is `TextProviderRefused` `addressRefused`) and on
  every request as it is sent; 401 to 404 `settingsRefused`, 3xx
  `redirected`, the rest `WritingFailed` as for the server's model. Never
  the server's `WritingModel`, not even when it fails, nor with a key that
  no longer opens (`keyUnreadable`); staff impersonating are refused.
  Each takes one of the `ownTextAtOnce` slots first (four a workspace,
  32 a server, `TextSlots`, apart from the server's model; past them
  `OwnTextBusy`, 429 `TextProviderBusy`, counted nothing), and answers are
  read up to 256 KiB (`maxAnswerBytes`).
  Every request counts in `ownTextRequestsPerDay` (500) a workspace and
  UTC day, whatever it ends with (`OwnTextCounts`,
  `assistant.own_text_days`; `OwnTextExhausted`, 429), and nothing of
  `AssistantAllowance` or `AssistantUsage` is read or counted, on any plan:
  that is how a workspace without Peal-paid AI uses the assistant. Its logs
  and span say `workspace` and the API kind, never the host, the model,
  the draft or the key. The status answers `source` (`workspace`, `server`
  or null), and `available` is true whenever someone writes.
- `testTextProvider` sends the saved provider one fixed rewrite, read as a
  member's would be, and counts as one of its day's requests;
  `TextProviderNotSet` (404) without one. Exports give the kind, address,
  model and date (`exportTextProvider`) and the day's counts
  (`exportOwnText`), never the key; erasing a workspace deletes both.
