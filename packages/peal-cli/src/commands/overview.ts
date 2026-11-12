import { Console, DateTime, Duration, Effect, Option } from "effect";
import { Command, Flag } from "effect/cli";
import {
  AgendaPageSchema,
  defaultAgendaPageSize,
  maxAgendaDays,
  maxAgendaPageSize,
  maxOverviewPageSize,
  OverviewSchema,
  ReportAcrossWorkspacesSchema,
} from "peal-contract";
import type {
  AgendaItem,
  DashboardTotals,
  Membership,
  WorkspaceOverview,
  WorkspaceReport,
} from "peal-contract";

import { personOnly } from "#api-key.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, excerpt, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { saveNew } from "#saved-file.ts";
import { instantOf, zoneFlag } from "#when.ts";
import { signedIn } from "#workspace.ts";

const cursorFlag = Flag.String("cursor").pipe(
  Flag.withMetavar("<cursor>"),
  Flag.withDescription(
    "Where the page before ended, as it printed: give it with the same flags."
  ),
  Flag.optional
);

const limitFlag = (most: number, unless: number) =>
  Flag.Int("limit").pipe(
    Flag.withDescription(
      `How many a page holds: ${String(unless)} unless given, at most ${String(most)}.`
    ),
    Flag.optional
  );

const given = <A, B extends object>(
  value: Option.Option<A>,
  named: (value: A) => B
) =>
  Option.match(value, {
    onNone: () => ({}),
    onSome: named,
  });

const within = (size: number, most: number) =>
  Math.min(Math.max(size, 1), most);

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

/** What needs attention in a workspace, a line for each thing, if any. */
export const attentionLines = (workspace: WorkspaceOverview): string[] => {
  const { channels, inbox, overPlan, posts } = workspace;
  const lines: string[] = [];

  if (overPlan === true) {
    lines.push(
      "Over its plan: it schedules and publishes nothing until it is back within it."
    );
  }

  if (posts !== null) {
    if (posts.failedLast7Days > 0) {
      lines.push(
        `${plural(posts.failedLast7Days, "post", "posts")} failed on a channel in the last 7 days.`
      );
    }

    if (posts.unconfirmedLast7Days > 0) {
      lines.push(
        `${plural(posts.unconfirmedLast7Days, "post", "posts")} to check: a channel may have it live.`
      );
    }

    if (posts.awaitingApproval > 0) {
      lines.push(
        `${plural(posts.awaitingApproval, "post waits", "posts wait")} for an approval${posts.mayApprove ? ", which you may give" : ""}.`
      );
    }
  }

  if (channels !== null) {
    if (channels.toReconnect > 0) {
      lines.push(
        `${plural(channels.toReconnect, "channel", "channels")} to reconnect.`
      );
    }

    if (channels.off > 0) {
      lines.push(`${plural(channels.off, "channel is", "channels are")} off.`);
    }
  }

  if (inbox !== null && inbox.unanswered > 0) {
    lines.push(
      `${plural(inbox.unanswered, "thread", "threads")} in the inbox with a comment waiting for an answer.`
    );
  }

  return lines;
};

// What goes out, said once a workspace has nothing to attend.
const aheadLine = ({ posts }: WorkspaceOverview): string[] =>
  posts === null || posts.scheduledNext7Days === 0
    ? []
    : [
        `${plural(posts.scheduledNext7Days, "post goes", "posts go")} out in the next 7 days.`,
      ];

const workspaceLines = (workspace: WorkspaceOverview): string[] => {
  const title = `${workspace.name} (${workspace.slug}, ${workspace.role})`;

  if (workspace.refused !== null) {
    return [
      `${title}: it requires two-step verification, which your account does not have on. Turn it on in the web app's account settings to see it.`,
    ];
  }

  const attention = attentionLines(workspace);

  return [
    title,
    ...(attention.length === 0
      ? ["  Nothing needs attention."]
      : attention.map((line) => `  ${line}`)),
    ...aheadLine(workspace).map((line) => `  ${line}`),
  ];
};

export const overview = Command.make(
  "overview",
  {
    cursor: cursorFlag,
    json: jsonFlag,
    limit: limitFlag(maxOverviewPageSize, maxOverviewPageSize),
  },
  Effect.fn("overview")(function* showOverview(input) {
    yield* personOnly("read across workspaces");

    const { client, url } = yield* signedIn;

    const page = yield* client.overview
      .get({
        query: {
          ...given(input.cursor, (cursor) => ({ cursor })),
          ...given(input.limit, (size) => ({
            limit: within(size, maxOverviewPageSize),
          })),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(OverviewSchema, page);

      return;
    }

    if (page.workspaces.length === 0) {
      yield* Console.log("You do not belong to any workspace yet.");

      return;
    }

    yield* Console.log(
      `What needs attention, as of ${instant(page.generatedAt)}. A workspace shows what your role there may read.`
    );

    for (const workspace of page.workspaces) {
      for (const line of workspaceLines(workspace)) {
        yield* Console.log(line);
      }
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: the same command with --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "Show what needs attention in each workspace you belong to: posts that failed or must be checked, approvals waiting, channels to reconnect or off, comments waiting for an answer, a workspace over its plan. Each workspace shows what your role there may read. For a person signed in: an API key belongs to one workspace."
  )
);

// The workspaces the flags name, by slug or id, among the person's.
const workspacesNamed = (
  workspaces: readonly Membership[],
  names: readonly string[]
): Effect.Effect<readonly Membership[], Refused> =>
  Effect.all(
    names.map((wanted) =>
      Option.match(
        Option.fromUndefinedOr(
          workspaces.find(({ id, slug }) => id === wanted || slug === wanted)
        ),
        {
          onNone: () =>
            Effect.fail(
              new Refused({
                code: "workspace_unknown",
                reason: `You belong to no workspace ${wanted}. peal whoami lists yours.`,
              })
            ),
          onSome: Effect.succeed,
        }
      )
    )
  );

const agendaDays = 14;

// The server refuses the same, in fewer words.
const checkedRange = (
  start: DateTime.Utc,
  end: DateTime.Utc
): Effect.Effect<void, Refused> => {
  if (!DateTime.isLessThan(start, end)) {
    return Effect.fail(
      new Refused({
        reason:
          "The range ends before it starts: give a --to later than --from.",
      })
    );
  }

  return Duration.isGreaterThan(
    DateTime.distance(start, end),
    Duration.days(maxAgendaDays)
  )
    ? Effect.fail(
        new Refused({
          reason: `The agenda lists ${String(maxAgendaDays)} days at most: give a --to closer to --from.`,
        })
      )
    : Effect.void;
};

const instantFor = (value: Option.Option<string>, zone: string, flag: string) =>
  Option.match(value, {
    onNone: () => Effect.succeedNone,
    onSome: (written) =>
      instantOf(written, zone, flag).pipe(Effect.map(Option.some)),
  });

const agendaRow = (
  item: AgendaItem,
  names: ReadonlyMap<string, string>
): string[] => [
  `  ${instant(item.scheduledAt)}`,
  names.get(item.workspaceId) ?? item.workspaceId,
  item.platforms === null || item.platforms.length === 0
    ? "–"
    : item.platforms.join(", "),
  item.status,
  excerpt(item.excerpt),
];

export const agenda = Command.make(
  "agenda",
  {
    cursor: cursorFlag,
    from: Flag.String("from").pipe(
      Flag.withMetavar("<instant>"),
      Flag.withDescription(
        "From when, included: an instant with its offset, such as 2026-11-20T09:00:00Z, or a local time without one, read in --time-zone. Now unless given."
      ),
      Flag.optional
    ),
    json: jsonFlag,
    limit: limitFlag(maxAgendaPageSize, defaultAgendaPageSize),
    timeZone: zoneFlag(
      "The IANA time zone a --from or a --to without an offset is read in, such as Europe/Paris."
    ),
    to: Flag.String("to").pipe(
      Flag.withMetavar("<instant>"),
      Flag.withDescription(
        `Until when, excluded, written as --from is: ${String(agendaDays)} days after --from unless given, ${String(maxAgendaDays)} at most.`
      ),
      Flag.optional
    ),
    workspace: Flag.String("workspace").pipe(
      Flag.withAlias("w"),
      Flag.withMetavar("<slug>"),
      Flag.withDescription(
        "Only this workspace, by its slug or id; repeat it for several. Every workspace where you may read posts unless given."
      ),
      Flag.atLeast(0)
    ),
  },
  Effect.fn("agenda")(function* showAgenda(input) {
    yield* personOnly("read across workspaces");

    // A time that cannot be read is refused before a request leaves.
    const from = yield* instantFor(input.from, input.timeZone, "--from");
    const to = yield* instantFor(input.to, input.timeZone, "--to");
    const now = yield* DateTime.now;
    const start = Option.getOrElse(from, () => now);

    const end = Option.getOrElse(to, () =>
      DateTime.add(start, { days: agendaDays })
    );

    yield* checkedRange(start, end);

    const { client, url } = yield* signedIn;
    const me = yield* client.session.me().pipe(Effect.mapError(explain(url)));
    const named = yield* workspacesNamed(me.workspaces, input.workspace);

    const page = yield* client.overview
      .agenda({
        query: {
          from: start,
          to: end,
          ...given(input.cursor, (cursor) => ({ cursor })),
          ...given(input.limit, (size) => ({
            limit: within(size, maxAgendaPageSize),
          })),
          ...given(
            named.length === 0
              ? Option.none()
              : Option.some(named.map(({ id }) => id).join(",")),
            (workspaceIds) => ({ workspaceIds })
          ),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(AgendaPageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(
        `Nothing goes out from ${instant(start)} to ${instant(end)}.`
      );

      return;
    }

    const names = new Map(me.workspaces.map(({ id, name }) => [id, name]));

    yield* Console.log(
      `What goes out from ${instant(start)} to ${instant(end)}, in UTC:`
    );

    for (const line of columns(
      page.items.map((item) => agendaRow(item, names))
    )) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: the same command with --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    `List what goes out across the workspaces you belong to: each post with a time, its workspace, its platforms, its status and how its text starts, the next ${String(agendaDays)} days unless --from and --to say otherwise (${String(maxAgendaDays)} days at most). For a person signed in: an API key belongs to one workspace.`
  )
);

const reportDays = { "30": 30, "7": 7, "90": 90 } as const;

// A count no platform gives, or a range before that is not all kept: a dash.
const shown = (value: number | null): string =>
  value === null ? "–" : String(value);

const change = (
  now: number | null,
  before: number | null,
  kept: boolean
): string => {
  if (!kept || now === null || before === null) {
    return "";
  }

  const delta = now - before;

  return ` (${delta >= 0 ? "+" : ""}${String(delta)})`;
};

const reportRow = (workspace: WorkspaceReport): string[] => {
  const { analytics } = workspace;

  if (analytics === null) {
    return [
      `  ${workspace.name}`,
      workspace.refused === null
        ? "not read with your role"
        : "requires two-step verification",
    ];
  }

  const { previousKept, previousTotals, totals } = analytics;

  const cell = (pick: (figures: DashboardTotals) => number | null) =>
    `${shown(pick(totals))}${change(pick(totals), pick(previousTotals), previousKept)}`;

  return [
    `  ${workspace.name}`,
    cell(({ posts }) => posts),
    cell(({ engagement }) => engagement),
    cell(({ impressions }) => impressions),
    `${shown(analytics.followers.current)}${analytics.followers.gained === null ? "" : ` (${analytics.followers.gained >= 0 ? "+" : ""}${String(analytics.followers.gained)})`}`,
  ];
};

export const report = Command.make(
  "report",
  {
    csv: Flag.String("csv").pipe(
      Flag.withMetavar("<file>"),
      Flag.withDescription(
        "Save the report as CSV to this file, one line a workspace, rather than print it. One that exists is kept."
      ),
      Flag.optional
    ),
    cursor: cursorFlag,
    days: Flag.Literals("days", ["7", "30", "90"]).pipe(
      Flag.withDescription(
        "The last 7, 30 or 90 days, today included, beside the days before. Defaults to 30."
      ),
      Flag.withDefault("30" as const)
    ),
    json: jsonFlag,
    limit: limitFlag(maxOverviewPageSize, maxOverviewPageSize),
    timeZone: zoneFlag(
      "The IANA time zone the days run in, such as Europe/Paris."
    ),
  },
  Effect.fn("report")(function* showReport(input) {
    yield* personOnly("read across workspaces");

    const { client, url } = yield* signedIn;
    const days = reportDays[input.days];

    if (Option.isSome(input.csv)) {
      const file = yield* saveNew(
        input.csv.value,
        "--csv",
        client.overview
          .reportExport({ query: { days, timeZone: input.timeZone } })
          .pipe(Effect.mapError(explain(url)))
      );

      yield* Console.log(`Saved to ${file}.`);

      return;
    }

    const page = yield* client.overview
      .report({
        query: {
          days,
          timeZone: input.timeZone,
          ...given(input.cursor, (cursor) => ({ cursor })),
          ...given(input.limit, (size) => ({
            limit: within(size, maxOverviewPageSize),
          })),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ReportAcrossWorkspacesSchema, page);

      return;
    }

    yield* Console.log(
      `From ${page.from} to ${page.to} in ${page.timeZone}, beside ${page.previous.from} to ${page.previous.to}. Counts of different platforms are not alike: compare a workspace with itself.`
    );

    for (const line of columns([
      ["  Workspace", "Posts", "Engagement", "Impressions", "Followers"],
      ...page.workspaces.map(reportRow),
    ])) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: the same command with --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "Show what went out in each workspace you belong to and how it did, beside the days before: posts published, engagement, impressions and followers, where your role there reads analytics. --csv saves it as a file. For a person signed in: an API key belongs to one workspace."
  )
);
