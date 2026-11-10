# Writing assistant

- The assistant suggests a change to a post's text (rewrite in a tone,
  shorten to fit a platform, translate, suggest hashtags) through the
  `WritingModel` port: Anthropic (`@effect/ai-anthropic`) or any
  OpenAI-compatible endpoint that serves `/chat/completions`
  (`@effect/ai-openai-compat`: `@effect/ai-openai` calls `/responses`
  only), as `PEAL_AI_PROVIDER` says. It calls the provider directly, not
  through the outbound guard: the operator, not a member, names it. Unset,
  `UnavailableWritingModelLive` turns it off, and the status answers
  `available: false`.
- Drafts are data, never instructions. The system message depends on the
  action alone (`assistant/domain/writing-prompt.ts`); the draft goes in the
  user message as the single field of a JSON document. Never put a draft's
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
