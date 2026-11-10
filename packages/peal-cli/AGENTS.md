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
- `peal login` signs in with the device grant; `whoami`, `logout`, `mcp` and
  `health` are the other commands, with `channels`, `drafts`, `posts`,
  `post`, `tags`, `media`, `approvals`, `review`, `analytics`, `billing`,
  `members`, `invitations` and `webhooks`, which act in the
  workspace `--workspace`, then `PEAL_WORKSPACE`, names by slug or id
  (`inWorkspace`, `src/workspace.ts`; a user's only workspace otherwise),
  and `account`, which exports the user's data to a file only they may read
  and lists their connected applications (an exclusive create, never
  through a link or over a file made meanwhile). `runWith` and `run` print
  through `printableConsole` (`src/print.ts`), which shows control
  characters as U+FFFD, since what the server holds was written by others. Turn a request's failure into
  what the user reads with `explain` (`src/explain.ts`). Positional
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
  members and invitations) says so without asking the server.
- Every command that reads or changes through the API takes `--json`
  (`jsonFlag`, `printJson`) and prints the API's answer as it came; an
  answer without a body prints `null`. With `--json` a failure is one JSON
  object on stderr, `{"error": {"code", "message", "requestId", …}}`, and
  exit code 1: `src/report.ts` is the one place that turns a failure into
  what is printed, in prose or JSON, and holds the command line's own codes
  (`unreachable`, `not_signed_in`, `api_key_refused`…). In prose, a refusal
  ends with the request's id (`requestLine`).
- `peal doctor` checks a configuration and changes nothing (the API URL and
  where it came from, health, readiness, the API's latest release, which
  credential is used and whether it works, the publish scope, the workspace
  commands will act in, the MCP endpoint's address), exits with 1 when a
  check fails, and is the first thing the skill tells an agent to run.
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
- `peal tags` (list, create, update, delete) keeps a workspace's tags, and
  `peal posts tag`, `peal posts list --tag`, `peal drafts save --tag` and
  `peal post --tag` file posts under them. Wherever a command takes a tag
  it takes its id or its name, whatever its case, resolved through
  `tags.list` (`src/tags.ts`: `tagNamed`, `tagsNamed`); `drafts save
  --post` sends `tagIds` only when `--tag` is given, so a draft keeps its
  tags. The MCP toolkit `tags-tools.ts` has the same (`list_tags`,
  `create_tag`, `update_tag`, `delete_tag`, `tag_post`), by id alone.
- The command line has `peal links` (create, list, show, revoke) and
  `peal partner` (show, keys, workspaces), which read; the MCP toolkit
  `connect-tools.ts` has the same, `create_connect_link` and
  `revoke_connect_link` changing. Neither creates a partner key or a
  customer's workspace: the first is a person's, the second a partner
  key's. Partner settings are `settings/partner`
  (`components/settings/partner-settings.tsx`), and the staff console's
  workspace page shows where a workspace stands (`PartnerDesk`).
