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
- The quota is per workspace and UTC day: `AssistantAllowance` gives the
  limit (the workspace plan's on a server that bills, otherwise
  `PEAL_AI_DAILY_REQUESTS`, 100), and `AssistantUsage.claim` counts a request in one conditional
  upsert before the call, so requests sent together never pass it. Give a
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
