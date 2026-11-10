import { Effect } from "effect";
import { Command } from "effect/cli";

import { PealApi } from "#api.ts";
import { account } from "#commands/account.ts";
import { analytics } from "#commands/analytics.ts";
import { approvals } from "#commands/approvals.ts";
import { billing } from "#commands/billing.ts";
import { channels } from "#commands/channels.ts";
import { drafts } from "#commands/drafts.ts";
import { health } from "#commands/health.ts";
import { inbox } from "#commands/inbox.ts";
import { invitations } from "#commands/invitations.ts";
import { login } from "#commands/login.ts";
import { logout } from "#commands/logout.ts";
import { mcp } from "#commands/mcp.ts";
import { media } from "#commands/media.ts";
import { members } from "#commands/members.ts";
import { post } from "#commands/post.ts";
import { posts } from "#commands/posts.ts";
import { review } from "#commands/review.ts";
import { webhooks } from "#commands/webhooks.ts";
import { whoami } from "#commands/whoami.ts";
import { CredentialStore } from "#credentials.ts";
import manifest from "#package.json" with { type: "json" };
import { printableConsole } from "#print.ts";
import { peal } from "#root.ts";

// The command tree. Every subcommand gets the API client for the URL that
// --api-url or PEAL_API_URL names, and the saved sign-ins; the transport
// (HttpClient) and the file system come from the caller, so main.ts uses
// fetch and the disk, and tests an in-memory server.
export const cli = peal.pipe(
  Command.withSubcommands([
    health,
    login,
    logout,
    whoami,
    mcp,
    channels,
    drafts,
    post,
    posts,
    approvals,
    review,
    media,
    analytics,
    billing,
    inbox,
    members,
    invitations,
    webhooks,
    account,
  ]),
  Command.provide(({ apiUrl }) => PealApi.layer(apiUrl)),
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
