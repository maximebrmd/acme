import { Console, Effect, Option } from "effect";
import { Command, Flag } from "effect/cli";
import { CalendarDaySchema, WorkspaceUsageReportSchema } from "peal-contract";
import type {
  CalendarDay,
  PlanAllowances,
  PlatformPosts,
  UsageDay,
  WorkspaceUsageReport,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, count } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

import { bytes, usageLines } from "./billing.ts";

const day = (name: string, description: string) =>
  Flag.String(name).pipe(
    Flag.withSchema(CalendarDaySchema),
    Flag.withMetavar("<YYYY-MM-DD>"),
    Flag.withDescription(description),
    Flag.optional
  );

/** The days a report is asked for; the server picks those left out. */
interface DaysAsked {
  from?: CalendarDay;
  to?: CalendarDay;
}

// On a server that does not bill, nothing has a limit.
const noLimits: PlanAllowances = {
  assistantRequests: null,
  channels: null,
  mediaStorage: null,
  members: null,
  scheduledPosts: null,
};

const planLine = (report: WorkspaceUsageReport): string =>
  report.plan === null
    ? "This server does not bill: nothing is limited."
    : `Plan: ${report.plan}.`;

const byPlatform = (counts: readonly PlatformPosts[]): string =>
  counts.length === 0
    ? ""
    : `: ${counts.map(({ platform, posts }) => `${platform} ${String(posts)}`).join(", ")}`;

const totalLines = ({ totals }: WorkspaceUsageReport): string[] =>
  columns([
    [
      "  Posts published",
      `${String(totals.publishedPosts)}${byPlatform(totals.byPlatform)}`,
    ],
    [
      "  Channel-days",
      `${String(totals.channelDays)}, over ${String(totals.daysCounted)} days counted`,
    ],
    // Only for the workspace that bills per-account pricing.
    ...(totals.billableAccountDays === null
      ? []
      : [["  Billable account-days", String(totals.billableAccountDays)]]),
    ...totals.meteredPosts.map(({ month, platform, posts, postsWithLinks }) => [
      `  Posts on ${platform} in ${month.slice(0, 7)}`,
      `${String(posts)}, ${String(postsWithLinks)} with a link`,
    ]),
  ]);

// A day with nothing done and no state taken says nothing.
const hasAnything = (entry: UsageDay): boolean =>
  entry.billableAccounts !== null ||
  entry.publishedPosts > 0 ||
  (entry.assistantRequests ?? 0) > 0 ||
  entry.channels !== null ||
  entry.members !== null ||
  entry.mediaStorage !== null;

const dayLines = (days: readonly UsageDay[]): string[] => {
  const shown = days.filter(hasAnything);
  // The accounts each day bills, for the workspace that bills its billing
  // account: a column only then.
  const billed = days.some(({ billableAccounts }) => billableAccounts !== null);

  return shown.length === 0
    ? []
    : columns([
        [
          "  Day",
          "Posts",
          "Channels",
          "Members",
          "Media",
          "Assistant",
          ...(billed ? ["Accounts"] : []),
        ],
        ...shown.map((entry) => [
          `  ${entry.day}`,
          String(entry.publishedPosts),
          count(entry.channels),
          count(entry.members),
          entry.mediaStorage === null ? count(null) : bytes(entry.mediaStorage),
          count(entry.assistantRequests),
          ...(billed ? [count(entry.billableAccounts)] : []),
        ]),
      ]);
};

export const usage = Command.make(
  "usage",
  {
    from: day(
      "from",
      "The first UTC day of the period, included. By default the period is the 30 days that end on --to."
    ),
    json: jsonFlag,
    to: day(
      "to",
      "The last UTC day of the period, included: today by default."
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("usage")(function* showUsage(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    // The days given; the server takes its defaults for the others.
    const query: DaysAsked = {};

    if (Option.isSome(input.from)) {
      query.from = input.from.value;
    }

    if (Option.isSome(input.to)) {
      query.to = input.to.value;
    }

    const report = yield* client.usage
      .get({ params: { workspaceId: workspace.id }, query })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(WorkspaceUsageReportSchema, report);

      return;
    }

    yield* Console.log(
      `Usage of ${workspace.name} from ${report.period.from} to ${report.period.to}, by UTC day:`
    );
    yield* Console.log(planLine(report));

    if (report.sharedWith !== null) {
      yield* Console.log(
        `Its channels count against the plan of its partner's workspace ${report.sharedWith.partnerWorkspaceId}.`
      );
    }

    yield* Console.log("Now:");

    for (const line of usageLines(
      report.current,
      report.allowances ?? noLimits
    )) {
      yield* Console.log(line);
    }

    yield* Console.log("Over the period:");

    for (const line of totalLines(report)) {
      yield* Console.log(line);
    }

    const days = dayLines(report.days);

    if (days.length > 0) {
      yield* Console.log("Day by day:");

      for (const line of days) {
        yield* Console.log(line);
      }
    }
  })
).pipe(
  Command.withDescription(
    "Show what the workspace uses of its plan now, then over a period of UTC days (the last 30 by default, 92 at most): the posts that went out, one per channel, by platform, the channel-days, the posts on platforms that bill per post, and each day's posts, channels, members, media and assistant requests; for the workspace that bills its billing account on a server that bills per account, the accounts each day bills and their sum, the billable account-days. Counts only: nothing is priced. It changes nothing. With --json, the API's answer as it came."
  )
);
