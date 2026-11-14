# Command line

- `peal-cli` reaches the server only over HTTP, through `PealApi`
  (`src/api.ts`), the client derived from `peal-contract`, and `OAuthApi` for
  Better Auth's endpoints. Its oxlint config refuses `peal-server` imports,
  and `@effect/platform-bun` outside `src/main.ts`.
- The API URL comes from `--api-url`, then `PEAL_API_URL`, then
  `http://localhost:3000`. A key or a token goes only over HTTPS or to a
  loopback host: whatever sends one yields `PealApi.sendingCredentials`
  first (`signedIn` does), which refuses plain HTTP elsewhere
  (`insecure_api_url`) unless `--insecure-http` or `PEAL_INSECURE_HTTP`
  allows it, for a self-hosted server without TLS.
- `peal login` signs in with the device grant; `whoami`, `overview`,
  `agenda`, `logout`, `mcp` and `health` are the other commands, with `channels`, `drafts`, `posts`,
  `post`, `tags`, `signatures`, `sets`, `queues`, `recycling`, `feeds`, `media`, `approvals`,
  `review`, `analytics`, `inbox`, `billing`, `usage`, `members`,
  `invitations`, `webhooks`, `ads` and `assistant`, which act in the
  workspace `--workspace`, then `PEAL_WORKSPACE`, names by slug or id
  (`inWorkspace`, `src/workspace.ts`; a user's only workspace otherwise),
  and `account`, which exports the user's data to a file only they may read
  and lists their connected applications (an exclusive create, never
  through a link or over a file made meanwhile). `runWith` and `run` print
  through `printableConsole` (`src/print.ts`), which shows control
  characters as U+FFFD, since what the server holds was written by others. Turn a request's failure into
  what the user reads with `explain` (`src/explain.ts`); a meter's
  refusal (`UsageAllowanceReached`) with `usageLimitReason`
  (`src/plan-limit.ts`), never an unconfirmed price
  (`unconfirmedMeters`). Positional
  arguments are read in the order of their config's keys, which the linters
  sort: name the keys so the order reads right. Commands that act as the
  user take a token from `accessToken` (`src/session.ts`), which renews it
  with the refresh token. `CredentialStore` (`src/credentials.ts`) saves sign-ins by API URL in
  `credentials.json` (0600, in a 0700 folder). Keep tokens `Redacted`, and
  never print one.
- Test commands with `runWith` from `src/cli.ts` against the in-memory server
  in `test/support.ts` (the contract served by test handlers) and the
  authorization server in `test/authorization-server.ts`, never against a
  running server. The workspace groups answer from the synthetic studio in
  `test/studio.ts`, which checks the member's permissions and records each
  change; `signedIn` (`test/signed-in.ts`) signs the command line in to it.
- An agent or a script runs headless with `PEAL_API_KEY` (`src/api-key.ts`;
  the environment only, never a flag, which shell history keeps): the key
  is the bearer token, wins over a saved sign-in, stays `Redacted`, and
  `--workspace` or `PEAL_WORKSPACE` must then be the workspace's id, as a
  key cannot read `/api/me`. What only a person does (`login`, `account`,
  members and invitations) says so without asking the server; `peal
  whoami` with a key reads `credential.get` instead of `/api/me`, and
  prints the key's name, start, workspace, permissions and expiry, never
  the key.
- Every command that reads or changes through the API takes `--json`
  (`jsonFlag`, `printJson`) and prints the API's answer as it came; an
  answer without a body prints `null`. With `--json` a failure is one JSON
  object on stderr, `{"error": {"code", "message", "requestId", …}}`, and
  exit code 1: `src/report.ts` is the one place that turns a failure into
  what is printed, in prose or JSON, and holds the command line's own codes
  (`unreachable`, `not_signed_in`, `api_key_refused`…). In prose, a refusal
  ends with the request's id (`requestLine`).
- `peal media generate --prompt … [--aspect …]` has the workspace's own
  image provider, or else the server's image model, make an image into the
  workspace's media (`assistant.generateImage`, a real parity row); the
  text assistant stays without a command, as an agent writes its own text.
  Its answer says the file is marked as made by AI and that the post's
  options carry the platforms' AI labels.
- `peal media list` takes `--search` (checked against
  the contract's `MediaQuerySchema` before any request) and `--kind`, and prints each
  file's name; `peal media upload` sends the file's base name.
- `peal posts remove-target <post-id> <target-id>` takes a channel off a
  post that waits; it words `LastTargetLeft` and `TargetStatusConflict`
  itself, before `explainingPublishing`, which leaves `src/explain.ts` and
  `src/api-error.ts` as they are. The command line has no flag for a
  channel's own text or media: they go through the API or MCP.
- `peal media describe <id> --text …|--clear` sets a media's
  description; `peal media delete <id>` reads `media.usage` first to say
  which drafts lose it, then asks (`confirmed`, `--yes`; `neverAsksInJson`).
- `peal assistant image-provider` (`commands/assistant.ts`: show, set,
  clear) keeps the workspace's own image provider (assistant:configure).
  The key is never an argument: `set` reads it with `readSecret`
  (`src/secret-input.ts`), effect/cli's `Prompt.Hidden` (no echo) at a
  terminal, else standard input to its end (4 KiB at most, the last line
  break dropped); `--keep-key` sends none, which the server takes while
  the origin stays. `clear` asks first (`confirmed`, `--yes`). Tests pipe
  standard input with `signedIn(...).piping(text)`.
- `peal assistant text-provider` (show, set, test, clear) keeps the
  workspace's own text provider the same way: `set --kind anthropic|
  openai-compatible --model …`, `--base-url` defaulting to Anthropic's
  address for `anthropic`; `test` sends it one request. The server leaves
  `assistant:configure` to no OAuth client but this command line.
- `peal doctor` checks a configuration and changes nothing (the API URL and
  where it came from, health, readiness, the API's latest release, which
  credential is used and whether it works, the publish scope, the workspace
  commands will act in, the MCP endpoint's address), exits with 1 when a
  check fails, and is the first thing the skill tells an agent to run.
- No command manages two-step verification, which is a person's, in the
  web app. A workspace that requires it refuses a sign-in whose account
  does not have it on (`Forbidden`, `twoStepRequired`): `explain` sends
  the person to the web app's account page (`accountPageOf`, the API's
  origin), and `peal doctor` fails the workspace's check with the same
  words. With `PEAL_API_KEY` nothing changes: keys are not concerned.
- `test/parity.test.ts` maps every endpoint a bearer token can call
  (`test/contract-endpoints.ts`, which copies the SDK spec's rule and its
  `ownSessionTags`: keep them equal) to the command that covers it, or to
  an exemption with its reason, and checks the command exists and takes
  `--json`: a new endpoint gets a command or a stated reason.
  `test/command-tree.ts` reads commands, flags and arguments from
  effect/cli's own help documents, never from printed text.
- `peal post --dry-run` checks a post through `posts.validate` and takes
  media ids only, as a file or an address would be stored; `--wait` goes
  with `--now`. `peal posts list`, `posts wait` and `posts import` follow
  `posts.search`, `posts.outcome` and `posts.import`; an import that left a
  row refused or unreadable ends as a refusal, after printing every row, and
  never prints the file. No command sends `posts.bulk`: a CSV file is the
  command line's way to several posts.
- `peal posts unpublish` (`commands/posts-unpublish.ts`) deletes a post
  from its platforms (`--channel`, by id or handle, or every channel), and
  asks first through `confirmed`; `--json` needs `--yes`
  (`neverAsksInJson`). `peal posts changes` reads `posts.changes`, and
  `peal posts list --removed` `search?removed=true`. Refusal reasons have
  their words in `src/live-post-refusals.ts`, typed by the contract.
  `peal posts edit` (`commands/posts-edit.ts`) replaces a part's text on
  one channel (`--channel`, resolved as `unpublish` resolves it, `--text`,
  `--part`, `--wait`), without asking: the edit is the user's own text.
- `peal tags` (list, create, update, delete) keeps a workspace's tags, and
  `peal posts tag`, `peal posts list --tag`, `peal drafts save --tag` and
  `peal post --tag` file posts under them. Wherever a command takes a tag
  it takes its id or its name, whatever its case, resolved through
  `tags.list` (`src/tags.ts`: `tagNamed`, `tagsNamed`); `drafts save
  --post` sends `tagIds` only when `--tag` is given, so a draft keeps its
  tags. The MCP toolkit `tags-tools.ts` has the same (`list_tags`,
  `create_tag`, `update_tag`, `delete_tag`, `tag_post`), by id alone.
- `peal signatures` and `peal sets` (list, create, update, delete) keep a
  workspace's signatures and channel sets, and `peal channels defaults`
  (show, set, clear) a channel's default options; `update` reads the item
  first and keeps what no flag names, and a set loses the channels that are
  no longer connected. `peal post` and `peal drafts save` take `--set`,
  `--signature` and `--default-signatures`: a set or a signature is named
  by id or name and sent by id (`src/saved-items.ts`: `presetsOf`), looked
  up before any media is stored. Whatever answer carries `warnings` prints
  each in prose after the rest (`warningLines`); `--json` prints the answer
  as it came. The MCP toolkit `saved-tools.ts` has the same, by id, and
  its posts name sets by id or name.
- `peal queues` (list, show, preview, create, update, reshuffle, delete) keeps a
  workspace's queues (`--slot mon@09:00`, repeated; `--zone`; `--channel`;
  `--set`; `--default`; on `update`, `--clear-channels` and `--clear-slots`
  empty them), named by id or name (`saved-items.ts`:
  `findQueue`, `queueOf`, which takes "" for the default). `peal post
  --queue <name-or-id>` (an ordinary valued flag: effect/cli never takes
  the next word as an optional value, which would read a name as the
  post's text) or `--default-queue` is one of `--at`, `--now`, `--queue`
  and `--default-queue`; `peal posts queue` and `peal posts list --queue` follow
  `posts.enqueue` and `search?queueId`. `peal queues reshuffle` follows
  `queues.reshuffle` and says why it stopped (`reshuffleLines`). The
  studio's queues are in `test/studio-queues.ts`, built over what
  `studio.ts` hands them.
- `peal recycling` (list, show, start, update, pause, resume, end) keeps
  the rules that repeat posts (`--every 2w`, `intervalOf`; `--count`,
  `--until`, `--variant` repeated, `--queue`), and `peal posts list
  --recycling` lists a rule's posts. The studio's rules are in
  `test/studio-recycling.ts`.
- `peal channels rename`, `disable` and `enable`
  (`commands/channel-settings.ts`) name a channel and turn it off or back
  on, and `peal posts duplicate` makes a draft of a post, reading it first
  only to say what the copy left out. `peal channels list` reads
  `channels.list`, and `channels.find` once a filter or a page is asked
  (`--platform`, `--status`, `--search`, `--limit`, `--cursor`): `--json`
  then prints the page, and the bare list keeps the array it always printed.
  A channel is shown with its label first and its handle always
  (`channelName`). The MCP tools are `rename_channel`, `disable_channel`,
  `enable_channel` and `duplicate_post`.
- The command line has `peal links` (create, list, show, revoke) and
  `peal partner` (show, keys, workspaces, usage), which read; `peal
  partner usage` (`--from`, `--to`, `--limit`, `--before`) reads the
  member's `usage.partner`, and `partnerUsage.get` (a partner key's) is
  exempt from parity, as the rest of the partner API is; `peal partner
  overview` (`--limit`, `--cursor`) reads the member's
  `partnerAccount.overview` (`partner.overview` is exempt the same way),
  and no MCP tool has it; the MCP toolkit
  `connect-tools.ts` has the same, `create_connect_link` and
  `revoke_connect_link` changing. Neither creates a partner key or a
  customer's workspace: the first is a person's, the second a partner
  key's. Partner settings are `settings/partner`
  (`components/settings/partner-settings.tsx`), and the staff console's
  workspace page shows where a workspace stands (`PartnerDesk`).
- A post's parts are `--then <text>`, once a part in order, with
  `--then-delay <seconds>` for the wait before each (`#post-flags.ts`
  `followUpsOf`), on `peal post` and `peal drafts save`; a save without
  `--then` keeps the parts the draft has, as it keeps its options.
- `peal analytics` has `summary`, `dashboard`, `channel`, `post` and
  `export`, which writes the file `--output` names and never over one
  that exists. `peal inbox` has `threads`, `thread`, `abilities`, `reply`,
  `answered`, `moderate`, `confirm` and `withdraw`, each with `--json`: comments are other people's words,
  printed through `printableConsole` like everything else, and a reply
  that is `unconfirmed` is never sent again, so `explain` sends the user
  to the platform, then to `peal inbox confirm`.
- `peal overview` and `peal agenda` read across the person's workspaces
  (`overview.get`, `overview.agenda`, under `/api/me`), for a person
  signed in only (`personOnly`): a key belongs to one workspace. The
  overview prints what needs attention in each, once "Nothing needs
  attention." where nothing does, and a workspace that refuses the person
  by name alone; the agenda takes `--from`, `--to` (14 days unless given,
  31 at most, checked before any request) and `--workspace`, repeated,
  by slug or id among the person's (`/api/me`), and never `PEAL_WORKSPACE`:
  narrowing is asked for, not inherited. No MCP tool reads across
  workspaces (`src/app/mcp/AGENTS.md`).
- `peal usage` (`--from`, `--to`: UTC days) reads `usage.get`: the plan
  line, the limits against what is used now (`usageLines`, shared with
  `peal billing`), the period's totals, then a row per day that has
  anything. `peal billing` stays as it is.
- `peal ads` reads ad accounts, campaigns, ads, insights and boosts, and
  `peal ads boost` quotes, creates, shows, pauses, resumes and stops one.
  No command signs in to an ad network, connects an ad account or sets a
  ceiling: those are a person's, in the web app, and the commands that
  would need them say so. Amounts are typed in the currency's units and
  turned into minor units from their digits (`minorUnits`,
  `src/ads-money.ts`), with the `minorUnitDigits` of the account read
  first; never through a float, never rounded or converted, and `--currency`
  is never defaulted. `money` writes them back, and `explain(url, digits)`
  words a refusal's amounts with it.
- What spends asks first: `boost create` quotes, prints what it will spend
  and for how long, then `confirmed` (`src/confirm.ts`) takes `--yes` or
  `yes` typed at a terminal (`Stdio.stdinIsTerminal`, `Terminal.readLine`);
  `neverAsksInJson` refuses `--json` without `--yes` before any request.
  `boost resume` and `boost stop` follow the same rule. `boost create`
  refuses without `--not-special-category` before any request, sends an
  `Idempotency-Key` always (made up and printed before the request when
  left out), and a request without a usable answer names the key to send
  again. Boost states and failure reasons have their words in
  `src/ads-print.ts`, typed by the contract.
- `peal login` asks for `workspace:ads` only with `--ads`, never by
  default: a person opts in to an application that can spend. `peal doctor`
  says which the sign-in holds (`ads-scope`), and `explain` sends a sign-in
  refused over an ads permission back to `peal login --ads`.
- Tests type answers at a terminal with `signedIn`'s `answering([...])`;
  without it stdin is no terminal. The studio's ads are in
  `test/studio-ads.ts` (`StudioState.ads`: the server's mode, two ad
  accounts, the boosts), whose handlers refuse a bearer credential what
  only a person does.
- `peal webhooks`: `--channel`, `--workspace-id` (with `--partner` on
  `create`), `--clear-channels` and `--clear-workspaces` set an endpoint's
  filters, ids as given; `deliveries` without an endpoint, or with
  `--since`/`--until`, reads `searchDeliveries`; `redeliver` sends one
  delivery with `--endpoint` (`redeliver`, the single sends' budget), several
  by id or `--failed --endpoint` (`redeliverMany`), which refuses
  `--since`, `--until` and `--event` without `--failed`, names an
  endpoint's id given as a delivery, and ends as a refusal
  (`nothing_redelivered`) when nothing was sent again; `test --event` sends a
  sample. `--header "Name: value"` (repeated) is checked against the
  contract's `WebhookHeaderSchema` before any request, `update` sends the
  whole list or `[]` with `--clear-headers`, and prose prints the names
  only, never a value.
