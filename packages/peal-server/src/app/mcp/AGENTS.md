# MCP endpoint

- `src/app/mcp/` serves effect/ai's `McpServer.layerHttp` at `/api/mcp`
  (Streamable HTTP; revisions 2026-07-28, 2025-11-25 and 2025-06-18, whose
  sessions live in memory and end with `DELETE`).
- Tools are `Tool.make` with Effect Schema inputs and outputs, declare
  `CurrentMember`, and reach contexts through their use cases.
  `mcpAuthentication` (`#workspace/api/mcp-authentication.ts`) provides
  the member from the request's OAuth token: 401 with an RFC 9728 challenge
  without a working token, 403 without a workspace scope or membership. It
  also takes a workspace's API key as the bearer token (never in the URL),
  for agents that run with nobody to sign in: the key's permissions apply,
  as on the API, `whoami` answers `apiKey` with a null `user` and role, and
  what only a person does refuses it in words about keys. A key acts in its
  own workspace (`workspaceOfKey` in `Authenticate`: the one place to
  change if a key ever spans several). Past the rate limit it answers a
  JSON-RPC error with 429.
- The use cases' permission checks refuse a client the user let read only.
  Tools answer with the views the API handlers answer
  (`#<context>/api/*-view.ts`). Each area has its toolkit (`posts-tools.ts`,
  `media-tools.ts`, `reports-tools.ts`, `people-tools.ts`, `webhooks-tools.ts`)
  and its handlers beside it, merged
  into `PealTools`. Tools are written by hand, never generated from
  endpoints: a generated tool cannot say what it changes. `find_tools`
  lists them by area from `catalogue.ts` (`toolAreas`: one toolkit an
  area), with the scope each takes (`publishingTools` names those that
  take `workspace:publish`; a test calls each without it) and whether the
  connection holds it: a new toolkit joins `toolAreas`, `ToolAreaSchema`
  and `PealTools` together, and tools/list stays whole, as the protocol
  has no filter. Annotate every tool with `reading`, or
  `changing({ destructive, idempotent, openWorld })` from `annotations.ts`,
  and say in its description what it changes. `list_members` answers
  members' email addresses only with `includeEmails`: hand an AI model no
  more personal data than the task needs. Refusals are `ToolRefused`,
  with a message the user can act on (`refusals.ts`): `notAllowed` names
  the scope the client lacks and how the user grants it, or says the role
  refuses; a refused post lists every violation as JSON. Tools that put
  posts out (`schedule_post`, `publish_post`, `reschedule_post`,
  `create_post`, `repost_target`) are `openWorld`, say in their description
  that what goes out is public and cannot be taken back, and check
  post:schedule before reading the post. Instants are
  `Schema.DateTimeUtcFromString` in tool parameters. The tools of
  `PostTools` and `MediaTools` that change something are `contentTools`,
  whose calls the ConnectionJournal keeps. The account's own
  data (its export, its applications) has no tool.
- `get_channel_capabilities` and `run_channel_lookup`
  (`capabilities-tools.ts`) answer the views of the capabilities and lookups
  endpoints; they read, and are open world, as they may ask the platform.
  The CLI's are `peal channels capabilities` and `peal channels lookup`
  (`--json` prints the answer as the API sends it). Describe a new lookup in
  `run_channel_lookup`'s description and the docs' lookups table.
- What the web app's composer sends, the CLI and the tools send too: a
  draft's per-channel `options` (`create_draft`, `update_draft`, `peal
  drafts save --options`), and TikTok's creator before a TikTok post
  (`get_tiktok_creator`, `peal channels tiktok`). The API's update replaces
  a draft's options; `update_draft` and `peal drafts save` keep those of the
  channels it keeps unless told otherwise, so a rewrite never drops them.
  Every failure reason has its words in the CLI (`posts.ts`
  `failureReasons`, typed by the contract) and in `get_post`'s
  description: add a reason there with the others. Both schedule and
  publish (`schedule_post`, `publish_post`, `create_post`; `peal posts
  schedule|publish|reschedule|cancel`, `peal post`), for a sign-in that
  holds `workspace:publish`: `peal post` takes `--at` or `--now`, never a
  default.
- On `/api/mcp`, a partner key names the workspace it acts in with each
  request, by id, in the `Peal-Workspace` header (`workspaceNamed` in
  `authenticate.ts`; 400 without it), and is told 404 for any workspace
  its partner does not own, as on the API. A workspace's API key never
  reads the header: it acts in its own workspace.
- The ads toolkit (`ads-tools.ts`) reads ad accounts, campaigns, daily
  numbers and boosts; `boost_post` and `resume_boost` spend the user's
  money: they are `destructive` and `openWorld`, say so first in their
  description with when to call them, take the scope `workspace:ads`
  (`adsTools`, beside `workspace:publish`; a test calls each without it),
  and `boost_post` takes an `idempotencyKey`. No tool signs in to an ad
  network, connects an account or sets a ceiling: those are a person's.
  Instants in parameters are text (`boostFields`).
