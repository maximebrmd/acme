# Command line

- `peal-cli` reaches the server only over HTTP, through `PealApi`
  (`src/api.ts`), the client derived from `peal-contract`, and `OAuthApi` for
  Better Auth's endpoints. Its oxlint config refuses `peal-server` imports,
  and `@effect/platform-bun` outside `src/main.ts`.
- The API URL comes from `--api-url`, then `PEAL_API_URL`, then
  `http://localhost:3000`.
- `peal login` signs in with the device grant; `whoami`, `logout`, `mcp` and
  `health` are the other commands, with `channels`, `drafts`, `posts`,
  `post`, `media`, `approvals`, `review`, `analytics`, `billing`,
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
