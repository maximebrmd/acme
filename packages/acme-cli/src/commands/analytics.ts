import { CalendarDaySchema } from "acme-contract";
import type { AnalyticsSummary, MetricTotals } from "acme-contract";
import { Config, Console, DateTime, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { explain } from "#explain.ts";
import { columns, count, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { channelNames, inWorkspace, named, workspaceFlag } from "#workspace.ts";

// The range the web app shows unless asked otherwise: 30 days, today
// included.
const defaultDays = 30;

const day = (name: string, description: string) =>
  Flag.String(name).pipe(
    Flag.withSchema(CalendarDaySchema),
    Flag.withMetavar("<YYYY-MM-DD>"),
    Flag.withDescription(description),
    Flag.optional
  );

// The zone days run in: the flag, then TZ, then this machine's.
const timeZoneFlag = Flag.String("time-zone").pipe(
  Flag.withMetavar("<zone>"),
  Flag.withDescription(
    "The IANA time zone days run in, such as Europe/Paris. Defaults to TZ, then to this machine's zone."
  ),
  Flag.withFallbackConfig(Config.String("TZ")),
  Flag.withDefault(DateTime.zoneToString(DateTime.zoneMakeLocal()))
);

// An IANA name, never an offset such as +01:00, which Intl takes but the
// server refuses: every segment starts with a capital letter.
const isZoneName = (zone: string): boolean =>
  /^[A-Z][\w+-]*(?:\/[A-Z][\w+-]*)*$/u.test(zone);

// The calendar day `days` after `from`, both written YYYY-MM-DD.
const shifted = (from: string, days: number): string =>
  Option.match(DateTime.make(`${from}T00:00:00Z`), {
    onNone: () => from,
    onSome: (midnight) =>
      DateTime.formatIsoDateUtc(DateTime.add(midnight, { days })),
  });

const totalsLines = (totals: MetricTotals): string[] =>
  columns([
    ["  Posts", String(totals.posts)],
    ["  Likes", String(totals.likes)],
    ["  Reposts", String(totals.reposts)],
    ["  Replies", String(totals.replies)],
    ["  Quotes", count(totals.quotes)],
    ["  Impressions", count(totals.impressions)],
  ]);

const summaryLines = (
  summary: AnalyticsSummary,
  names: ReadonlyMap<string, string>
): string[] => [
  ...totalsLines(summary.totals),
  ...(summary.channels.length === 0
    ? []
    : [
        "By channel:",
        ...columns(
          summary.channels.map((channel) => [
            `  ${named(names, channel.channelId)}`,
            `${String(channel.posts)} posts`,
            `${String(channel.likes)} likes`,
            `${String(channel.reposts)} reposts`,
            `${String(channel.replies)} replies`,
          ])
        ),
      ]),
  ...(summary.topPosts.length === 0
    ? []
    : [
        "Top posts:",
        ...columns(
          summary.topPosts.map((post) => [
            `  ${post.postId}`,
            named(names, post.channelId),
            `${String(post.engagement)} interactions`,
            post.permalink ?? "",
          ])
        ),
      ]),
];

const summary = Command.make(
  "summary",
  {
    from: day(
      "from",
      `The first day, included. Defaults to ${String(defaultDays - 1)} days before --to.`
    ),
    timeZone: timeZoneFlag,
    to: day("to", "The last day, included. Defaults to today."),
    workspace: workspaceFlag,
  },
  Effect.fn("analytics.summary")(function* summary(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const now = yield* DateTime.now;

    const zoned = yield* Option.liftPredicate(input.timeZone, isZoneName).pipe(
      Option.flatMap(DateTime.zoneMakeNamed),
      Option.flatMap((timeZone) => DateTime.makeZoned(now, { timeZone })),
      Option.match({
        onNone: () =>
          Effect.fail(
            new Refused({
              reason: `${input.timeZone} is not a time zone Acme knows: give an IANA zone, such as Europe/Paris.`,
            })
          ),
        onSome: Effect.succeed,
      })
    );

    const to = Option.getOrElse(input.to, () => DateTime.formatIsoDate(zoned));

    const from = Option.getOrElse(input.from, () =>
      shifted(to, 1 - defaultDays)
    );

    const found = yield* client.analytics
      .summary({
        params: { workspaceId: workspace.id },
        query: { from, timeZone: input.timeZone, to },
      })
      .pipe(Effect.mapError(explain(url)));

    const names = yield* channelNames(client, workspace.id);

    yield* Console.log(
      `${workspace.name}, posts published from ${found.from} to ${found.to} (${found.timeZone}):`
    );

    for (const line of summaryLines(found, names)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Sum up how the workspace's posts did over a range of days: their counts, by channel, and the posts people did the most with."
  )
);

const post = Command.make(
  "post",
  {
    postId: Argument.String("post-id").pipe(
      Argument.withDescription(
        "The post, as acme drafts list or the web app shows its id."
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("analytics.post")(function* post({ postId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.analytics
      .post({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (found.targets.length === 0) {
      yield* Console.log(
        `Acme has read no counts of post ${postId} yet: it reads them once a post went live, on Mastodon and Bluesky.`
      );

      return;
    }

    const names = yield* channelNames(client, workspace.id);

    for (const target of found.targets) {
      const read =
        target.lastCollectedAt === null
          ? "not read yet"
          : `read ${instant(target.lastCollectedAt)}${target.collecting ? "" : ", no longer read"}`;

      yield* Console.log(
        `${named(names, target.channelId)}, published ${instant(target.publishedAt)}, ${read}:`
      );

      if (target.permalink !== null) {
        yield* Console.log(`  ${target.permalink}`);
      }

      if (target.latest !== null) {
        for (const line of columns([
          ["  Likes", String(target.latest.likes)],
          ["  Reposts", String(target.latest.reposts)],
          ["  Replies", String(target.latest.replies)],
          ["  Quotes", count(target.latest.quotes)],
          ["  Impressions", count(target.latest.impressions)],
        ])) {
          yield* Console.log(line);
        }
      }
    }
  })
).pipe(
  Command.withDescription(
    "Show a post's counts on each channel it went live on, as Acme read them last."
  )
);

export const analytics = Command.make("analytics").pipe(
  Command.withDescription("How a workspace's posts did on their platforms."),
  Command.withSubcommands([summary, post])
);
