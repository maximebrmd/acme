import { Effect } from "effect";
import { Command } from "effect/cli";

import { AcmeApi } from "#api.ts";
import { account } from "#commands/account.ts";
import { analytics } from "#commands/analytics.ts";
import { billing } from "#commands/billing.ts";
import { channels } from "#commands/channels.ts";
import { drafts } from "#commands/drafts.ts";
import { health } from "#commands/health.ts";
import { invitations } from "#commands/invitations.ts";
import { login } from "#commands/login.ts";
import { logout } from "#commands/logout.ts";
import { mcp } from "#commands/mcp.ts";
import { members } from "#commands/members.ts";
import { posts } from "#commands/posts.ts";
import { whoami } from "#commands/whoami.ts";
import { CredentialStore } from "#credentials.ts";
import manifest from "#package.json" with { type: "json" };
import { printableConsole } from "#print.ts";
import { acme } from "#root.ts";

// The command tree. Every subcommand gets the API client for the URL that
// --api-url or ACME_API_URL names, and the saved sign-ins; the transport
// (HttpClient) and the file system come from the caller, so main.ts uses
// fetch and the disk, and tests an in-memory server.
export const cli = acme.pipe(
  Command.withSubcommands([
    health,
    login,
    logout,
    whoami,
    mcp,
    channels,
    drafts,
    posts,
    analytics,
    billing,
    members,
    invitations,
    account,
  ]),
  Command.provide(({ apiUrl }) => AcmeApi.layer(apiUrl)),
  Command.provide(CredentialStore.layer)
);

export const { version } = manifest;

// Runs the command line with explicit arguments, without the program name.
export const runWith = (args: readonly string[]) =>
  Command.runWith(cli, { version })(args).pipe(
    Effect.provide(printableConsole)
  );

// Runs the command line with the process arguments.
export const run = Command.run(cli, { version }).pipe(
  Effect.provide(printableConsole)
);
