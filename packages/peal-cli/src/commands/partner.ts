import { Console, Effect, Option, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import {
  CalendarDaySchema,
  CustomerWorkspacePageSchema,
  maxWorkspacePageSize,
  PartnerKeySchema,
  PartnerStandingSchema,
  PartnerUsageReportSchema,
} from "peal-contract";
import type { PartnerUsageReport, PlatformPosts } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const show = Command.make(
  "show",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("partner.show")(function* show({ json, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const standing = yield* client.partnerAccount
      .get({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(PartnerStandingSchema, standing);

      return;
    }

    const { canOpen, partner, usage } = standing;

    if (partner === null) {
      yield* Console.log(
        canOpen
          ? `${workspace.name} has no partner account: an owner or an admin opens one in the web app's settings.`
          : `${workspace.name} has no partner account: this server's staff open them.`
      );

      return;
    }

    yield* Console.log(`Partner account of ${workspace.name}:`);

    for (const line of columns([
      ["  Name", partner.name],
      ["  Logo", partner.logoUrl ?? "–"],
      [
        "  Return origins",
        partner.returnOrigins.length === 0
          ? "none: hosted pages send nobody back"
          : partner.returnOrigins.join(", "),
      ],
      ["  Opened", instant(partner.createdAt)],
      ...(usage === null
        ? []
        : [
            ["  Workspaces", String(usage.workspaces)],
            ["  Channels", String(usage.channels)],
          ]),
    ])) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show the workspace's partner account: what its customers see, where hosted pages may send them back, and what it holds."
  )
);

const keys = Command.make(
  "keys",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("partner.keys")(function* keys({ json, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const listed = yield* client.partnerAccount
      .listKeys({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(Schema.Array(PartnerKeySchema), listed);

      return;
    }

    if (listed.length === 0) {
      yield* Console.log(
        `The partner account of ${workspace.name} has no key: an owner or an admin creates one in the web app's settings.`
      );

      return;
    }

    yield* Console.log(`Partner keys of ${workspace.name}:`);

    for (const line of columns(
      listed.map((key) => [
        `  ${key.id}`,
        key.name,
        `${key.start}…`,
        key.expiresAt === null
          ? "until revoked"
          : `expires ${instant(key.expiresAt)}`,
        key.scopes.join(" "),
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the partner account's keys, never the keys themselves: each is shown once, in the web app, when it is created."
  )
);

const workspaces = Command.make(
  "workspaces",
  {
    externalId: Flag.String("external-id").pipe(
      Flag.withMetavar("<id>"),
      Flag.withDescription("The workspace with this external id, exactly."),
      Flag.optional
    ),
    json: jsonFlag,
    name: Flag.String("name").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription("The workspaces whose name holds this text."),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("partner.workspaces")(function* workspaces({
    externalId,
    json,
    name,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const page = yield* client.partnerAccount
      .listWorkspaces({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(externalId, {
            onNone: () => ({}),
            onSome: (given) => ({ externalId: given }),
          }),
          ...Option.match(name, {
            onNone: () => ({}),
            onSome: (given) => ({ name: given }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(CustomerWorkspacePageSchema, page);

      return;
    }

    if (page.workspaces.length === 0) {
      yield* Console.log(
        `The partner account of ${workspace.name} owns no such workspace.`
      );

      return;
    }

    yield* Console.log(
      `Workspaces the partner account of ${workspace.name} owns (${String(page.workspaces.length)} of ${String(page.total)}, newest first):`
    );

    for (const line of columns(
      page.workspaces.map((owned) => [
        `  ${owned.id}`,
        owned.name,
        owned.externalId ?? "–",
        `${String(owned.channels)} channel${owned.channels === 1 ? "" : "s"}`,
        `created ${instant(owned.createdAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspaces the partner account owns, newest first, with their external ids and how many channels each has connected."
  )
);

const day = (name: string, description: string) =>
  Flag.String(name).pipe(
    Flag.withSchema(CalendarDaySchema),
    Flag.withMetavar("<YYYY-MM-DD>"),
    Flag.withDescription(description),
    Flag.optional
  );

const byPlatform = (counts: readonly PlatformPosts[]): string =>
  counts.length === 0
    ? ""
    : `: ${counts.map(({ platform, posts }) => `${platform} ${String(posts)}`).join(", ")}`;

// The account as a whole, which the first page alone answers.
const usageTotalLines = ({ current, totals }: PartnerUsageReport): string[] =>
  current === null || totals === null
    ? []
    : columns([
        ["  Workspaces", String(current.workspaces)],
        ["  Channels", String(current.channels)],
        [
          "  Posts published",
          `${String(totals.publishedPosts)}${byPlatform(totals.byPlatform)}`,
        ],
        [
          "  Channel-days",
          `${String(totals.channelDays)}, over ${String(totals.daysCounted)} days counted`,
        ],
        ...totals.meteredPosts.map(
          ({ month, platform, posts, postsWithLinks }) => [
            `  Posts on ${platform} in ${month.slice(0, 7)}`,
            `${String(posts)}, ${String(postsWithLinks)} with a link`,
          ]
        ),
      ]);

// A row per workspace, the external id first, as the partner knows its
// customers by it.
const tenantLines = ({ workspaces: page }: PartnerUsageReport): string[] =>
  columns([
    ["  External id", "Name", "Channels", "Channel-days", "Posts published"],
    ...page.workspaces.map((used) => [
      `  ${used.externalId ?? "–"}`,
      used.home ? `${used.name} (home)` : used.name,
      String(used.channels),
      String(used.channelDays),
      String(used.publishedPosts),
    ]),
  ]);

const usage = Command.make(
  "usage",
  {
    before: Flag.String("before").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription(
        "The next page: the cursor the page before printed, as it is."
      ),
      Flag.optional
    ),
    from: day(
      "from",
      "The first UTC day of the period, included. By default the period is the 30 days that end on --to."
    ),
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withMetavar("<count>"),
      Flag.withDescription(
        `How many of the partner's workspaces a page lists, 50 by default, ${String(maxWorkspacePageSize)} at most. The home workspace comes first, on the first page only.`
      ),
      Flag.optional
    ),
    to: day(
      "to",
      "The last UTC day of the period, included: today by default."
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("partner.usage")(function* showUsage(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const report = yield* client.usage
      .partner({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(input.before, {
            onNone: () => ({}),
            onSome: (before) => ({ before }),
          }),
          ...Option.match(input.from, {
            onNone: () => ({}),
            onSome: (from) => ({ from }),
          }),
          ...Option.match(input.limit, {
            onNone: () => ({}),
            onSome: (limit) => ({ limit }),
          }),
          ...Option.match(input.to, {
            onNone: () => ({}),
            onSome: (to) => ({ to }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(PartnerUsageReportSchema, report);

      return;
    }

    yield* Console.log(
      `Usage of the partner account of ${workspace.name} from ${report.period.from} to ${report.period.to}, by UTC day:`
    );
    yield* Console.log(
      report.plan === null
        ? "This server does not bill: nothing is limited."
        : `Plan: ${report.plan}.`
    );

    for (const line of usageTotalLines(report)) {
      yield* Console.log(line);
    }

    yield* Console.log(
      `Per workspace (${String(report.workspaces.total)} owned, newest first):`
    );

    for (const line of tenantLines(report)) {
      yield* Console.log(line);
    }

    // The next page covers the same days, a page of the same size.
    if (report.workspaces.next !== null) {
      const limit = Option.match(input.limit, {
        onNone: () => "",
        onSome: (given) => ` --limit ${String(given)}`,
      });

      yield* Console.log(
        `More: peal partner usage --from ${report.period.from} --to ${report.period.to}${limit} --before ${report.workspaces.next}`
      );
    }

    yield* Console.log("Customers deleted since are not listed.");
  })
).pipe(
  Command.withDescription(
    "Show what the partner account used across its workspaces over a period of UTC days (the last 30 by default, 92 at most): on the first page, the workspaces and channels it holds now, the posts that went out and the channel-days; then a page of its workspaces, each with its external id, channels, channel-days and posts. Counts only: nothing is priced. It changes nothing. With --json, the API's answer as it came."
  )
);

export const partner = Command.make("partner").pipe(
  Command.withDescription(
    "A workspace's partner account, which lets a product use Peal for its own customers. Creating and deleting their workspaces is for the partner API, with a partner key."
  ),
  Command.withSubcommands([show, keys, workspaces, usage])
);
