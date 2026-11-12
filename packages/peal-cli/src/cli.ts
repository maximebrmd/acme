import { Effect, Stdio } from "effect";
import { Command } from "effect/cli";

import { PealApi } from "#api.ts";
import { account } from "#commands/account.ts";
import { activity } from "#commands/activity.ts";
import { ads } from "#commands/ads.ts";
import { analytics } from "#commands/analytics.ts";
import { approvals } from "#commands/approvals.ts";
import { billing } from "#commands/billing.ts";
import { channels } from "#commands/channels.ts";
import { doctor } from "#commands/doctor.ts";
import { drafts } from "#commands/drafts.ts";
import { feeds } from "#commands/feeds.ts";
import { health } from "#commands/health.ts";
import { inbox } from "#commands/inbox.ts";
import { invitations } from "#commands/invitations.ts";
import { links } from "#commands/links.ts";
import { login } from "#commands/login.ts";
import { logout } from "#commands/logout.ts";
import { mcp } from "#commands/mcp.ts";
import { media } from "#commands/media.ts";
import { members } from "#commands/members.ts";
import { agenda, overview } from "#commands/overview.ts";
import { partner } from "#commands/partner.ts";
import { post } from "#commands/post.ts";
import { posts } from "#commands/posts.ts";
import { queues } from "#commands/queues.ts";
import { recycling } from "#commands/recycling.ts";
import { review } from "#commands/review.ts";
import { sets } from "#commands/sets.ts";
import { shortLinks } from "#commands/short-links.ts";
import { signatures } from "#commands/signatures.ts";
import { tags } from "#commands/tags.ts";
import { usage } from "#commands/usage.ts";
import { webhooks } from "#commands/webhooks.ts";
import { whoami } from "#commands/whoami.ts";
import { CredentialStore } from "#credentials.ts";
import manifest from "#package.json" with { type: "json" };
import { printableConsole } from "#print.ts";
import { reporting } from "#report.ts";
import { peal } from "#root.ts";

// The command tree. Every subcommand gets the API client for the URL that
// --api-url or PEAL_API_URL names, and the saved sign-ins; the transport
// (HttpClient) and the file system come from the caller, so main.ts uses
// fetch and the disk, and tests an in-memory server.
export const cli = peal.pipe(
  Command.withSubcommands([
    health,
    doctor,
    login,
    logout,
    whoami,
    overview,
    agenda,
    mcp,
    channels,
    drafts,
    post,
    posts,
    tags,
    signatures,
    sets,
    queues,
    recycling,
    feeds,
    approvals,
    review,
    media,
    analytics,
    ads,
    billing,
    usage,
    inbox,
    members,
    invitations,
    webhooks,
    activity,
    shortLinks,
    links,
    partner,
    account,
  ]),
  Command.provide(({ apiUrl, insecureHttp }) =>
    PealApi.layer(apiUrl, { insecureHttp })
  ),
  Command.provide(CredentialStore.layer)
);

export const { version } = manifest;

// Runs the command line with explicit arguments, without the program name.
// `reporting` decides how a failure is printed: as JSON with --json.
export const runWith = (args: readonly string[]) =>
  Command.runWith(cli, { version })(args).pipe(
    Effect.provide(reporting(args)),
    Effect.provide(printableConsole)
  );

// Runs the command line with the process arguments.
export const run = Stdio.Stdio.use(({ args }) =>
  args.pipe(Effect.flatMap(runWith))
);
