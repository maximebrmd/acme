import { Config, Console, DateTime, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  AnalyticsDashboardSchema,
  AnalyticsSummarySchema,
  BestTimesSchema,
  CalendarDaySchema,
  ChannelSeriesSchema,
  countedPlatforms,
  PostAnalyticsSchema,
} from "peal-contract";
import type {
  AnalyticsSummary,
  BestTimesHour,
  DashboardTotals,
  FollowerChange,
  MetricTotals,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, count, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { saveNew } from "#saved-file.ts";
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
    json: jsonFlag,
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
              reason: `${input.timeZone} is not a time zone Peal knows: give an IANA zone, such as Europe/Paris.`,
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

    if (input.json) {
      yield* printJson(AnalyticsSummarySchema, found);

      return;
    }

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
    json: jsonFlag,
    postId: Argument.String("post-id").pipe(
      Argument.withDescription(
        "The post, as peal drafts list or the web app shows its id."
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("analytics.post")(function* post({
    json,
    postId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.analytics
      .post({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(PostAnalyticsSchema, found);

      return;
    }

    if (found.targets.length === 0) {
      yield* Console.log(
        `Peal has read no counts of post ${postId} yet: it reads them once a post went live, on ${countedPlatforms.join(", ")}.`
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
          ["  Reach", count(target.latest.reach)],
          ["  Clicks", count(target.latest.clicks)],
          ["  Saves", count(target.latest.saves)],
        ])) {
          yield* Console.log(line);
        }
      }
    }
  })
).pipe(
  Command.withDescription(
    "Show a post's counts on each channel it went live on, as Peal read them last."
  )
);

// The range a command asks for: --days, or --from and --to; 30 days
// unless said.
const rangeFlags = {
  days: Flag.Literals("days", ["7", "30", "90"]).pipe(
    Flag.withDescription(
      "The last 7, 30 or 90 days, today included. Defaults to 30 unless --from and --to are given."
    ),
    Flag.optional
  ),
  from: day("from", "The first day, included, with --to."),
  timeZone: timeZoneFlag,
  to: day("to", "The last day, included, with --from."),
};

const periods = { "30": 30, "7": 7, "90": 90 } as const;

const rangeOf = (input: {
  readonly days: Option.Option<keyof typeof periods>;
  readonly from: Option.Option<string>;
  readonly timeZone: string;
  readonly to: Option.Option<string>;
}) => {
  const between = Option.all({ from: input.from, to: input.to });
  const dated = Option.isSome(input.from) || Option.isSome(input.to);

  if (
    !isZoneName(input.timeZone) ||
    Option.isNone(DateTime.zoneMakeNamed(input.timeZone))
  ) {
    return Effect.fail(
      new Refused({
        reason: `${input.timeZone} is not a time zone Peal knows: give an IANA zone, such as Europe/Paris.`,
      })
    );
  }

  if (Option.isSome(between) && Option.isNone(input.days)) {
    return Effect.succeed({ ...between.value, timeZone: input.timeZone });
  }

  return dated
    ? Effect.fail(
        new Refused({
          reason: "Give --days, or --from and --to together, not both.",
        })
      )
    : Effect.succeed({
        days: periods[Option.getOrElse(input.days, () => "30" as const)],
        timeZone: input.timeZone,
      });
};

// A change against the range before: +6, -2, or – where either is unknown.
const change = (now: number | null, before: number | null): string => {
  if (now === null || before === null) {
    return "–";
  }

  const difference = now - before;

  return difference > 0 ? `+${String(difference)}` : String(difference);
};

const signed = (value: number | null): string =>
  value === null ? "–" : change(value, 0);

const comparisonLines = (
  totals: DashboardTotals,
  // None when the range before is not all kept: no change is shown.
  previous: DashboardTotals | undefined,
  followers: FollowerChange
): string[] => {
  const was = (metric: keyof DashboardTotals) =>
    previous === undefined ? null : previous[metric];

  return columns([
    ["  Posts", String(totals.posts), change(totals.posts, was("posts"))],
    ["  Likes", String(totals.likes), change(totals.likes, was("likes"))],
    [
      "  Reposts",
      String(totals.reposts),
      change(totals.reposts, was("reposts")),
    ],
    [
      "  Replies",
      String(totals.replies),
      change(totals.replies, was("replies")),
    ],
    ["  Quotes", count(totals.quotes), change(totals.quotes, was("quotes"))],
    [
      "  Impressions",
      count(totals.impressions),
      change(totals.impressions, was("impressions")),
    ],
    ["  Reach", count(totals.reach), change(totals.reach, was("reach"))],
    ["  Clicks", count(totals.clicks), change(totals.clicks, was("clicks"))],
    ["  Saves", count(totals.saves), change(totals.saves, was("saves"))],
    [
      "  Engagement",
      String(totals.engagement),
      change(totals.engagement, was("engagement")),
    ],
    ["  Followers", count(followers.current), signed(followers.gained)],
  ]);
};

const dashboard = Command.make(
  "dashboard",
  { ...rangeFlags, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("analytics.dashboard")(function* dashboard(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const query = yield* rangeOf(input);

    const found = yield* client.analytics
      .dashboard({ params: { workspaceId: workspace.id }, query })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(AnalyticsDashboardSchema, found);

      return;
    }

    const names = yield* channelNames(client, workspace.id);

    yield* Console.log(
      `${workspace.name}, from ${found.from} to ${found.to} (${found.timeZone}), against ${found.previous.from} to ${found.previous.to}:`
    );

    for (const line of comparisonLines(
      found.totals,
      found.previousKept ? found.previousTotals : undefined,
      found.followers
    )) {
      yield* Console.log(line);
    }

    if (!found.previousKept) {
      yield* Console.log(
        "  No change is shown: a platform's terms keep its figures for less than the range before goes back."
      );
    }

    if (found.channels.length > 0) {
      yield* Console.log("By channel:");

      for (const line of columns(
        found.channels.map((channel) => [
          `  ${named(names, channel.channelId)}`,
          `${String(channel.totals.posts)} posts`,
          `${String(channel.totals.engagement)} interactions (${change(channel.totals.engagement, channel.previousKept ? channel.previousTotals.engagement : null)})`,
          `${count(channel.followers.current)} followers (${signed(channel.followers.gained)})`,
        ])
      )) {
        yield* Console.log(line);
      }
    }

    if (found.topPosts.length > 0) {
      yield* Console.log("Top posts:");

      for (const line of columns(
        found.topPosts.map((top) => [
          `  ${top.postId}`,
          named(names, top.channelId),
          `${String(top.engagement)} interactions`,
          top.permalink ?? "",
        ])
      )) {
        yield* Console.log(line);
      }
    }
  })
).pipe(
  Command.withDescription(
    "Show the workspace's analytics over a range beside the range before it: totals, followers, each channel, and the posts people did the most with. A dash is a number the platform does not give."
  )
);

const channel = Command.make(
  "channel",
  {
    ...rangeFlags,
    channelId: Argument.String("channel-id").pipe(
      Argument.withDescription(
        "The channel, as peal channels list shows its id."
      )
    ),
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("analytics.channel")(function* channel(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const query = yield* rangeOf(input);

    const found = yield* client.analytics
      .channel({
        params: { channelId: input.channelId, workspaceId: workspace.id },
        query,
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ChannelSeriesSchema, found);

      return;
    }

    const names = yield* channelNames(client, workspace.id);

    yield* Console.log(
      `${named(names, found.channelId)}, from ${found.from} to ${found.to} (${found.timeZone}):`
    );
    yield* Console.log(
      `Followers: ${count(found.followers.current)} (${signed(found.followers.gained)})`
    );

    for (const line of columns([
      ["  Day", "Followers", "Following", "Views", "Reach", "Interactions"],
      ...found.days.map((each) => [
        `  ${each.date}`,
        count(each.followers),
        count(each.following),
        count(each.views),
        count(each.reach),
        String(each.likes + each.reposts + each.replies + each.quotes),
      ]),
    ])) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show one channel day by day: its followers as Peal read them each day, the views and reach its platform counted, and what its posts gained."
  )
);

const exportFile = Command.make(
  "export",
  {
    ...rangeFlags,
    format: Flag.Literals("format", ["csv", "json"]).pipe(
      Flag.withDescription(
        "csv (the default), or json: one JSON object a line."
      ),
      Flag.withDefault("csv" as const)
    ),
    kind: Argument.Literals("kind", ["posts", "accounts"]).pipe(
      Argument.withDescription(
        "posts: each post of the range with its counts. accounts: each channel's account, day by day."
      )
    ),
    output: Flag.String("output").pipe(
      Flag.withAlias("o"),
      Flag.withMetavar("<file>"),
      Flag.withDescription("The file to save to. One that exists is kept.")
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("analytics.export")(function* exportFile(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const query = yield* rangeOf(input);

    const file = yield* saveNew(
      input.output,
      "--output",
      client.analytics
        .export({
          params: { workspaceId: workspace.id },
          query: { ...query, format: input.format, kind: input.kind },
        })
        .pipe(Effect.mapError(explain(url)))
    );

    yield* Console.log(`Saved to ${file}.`);
  })
).pipe(
  Command.withDescription(
    "Save the workspace's analytics as a file: each post of a range with its counts, or each channel's account day by day."
  )
);

const weekdayNames: Readonly<Record<BestTimesHour["weekday"], string>> = {
  friday: "Friday",
  monday: "Monday",
  saturday: "Saturday",
  sunday: "Sunday",
  thursday: "Thursday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
};

// An offset, such as +01:00, is refused before any request.
const zoneNamed = (zone: string) =>
  isZoneName(zone)
    ? Effect.void
    : Effect.fail(
        new Refused({
          reason: `${zone} is not an IANA time zone: give one such as Europe/Paris with --time-zone.`,
        })
      );

const bestTimesDays = { "180": 180, "30": 30, "90": 90 } as const;

const hourName = ({ hour, weekday }: BestTimesHour): string =>
  `${weekdayNames[weekday]} ${String(hour).padStart(2, "0")}:00`;

const bestTimes = Command.make(
  "best-times",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription("The channel, as peal channels list shows its id.")
    ),
    days: Flag.Literals("days", ["30", "90", "180"]).pipe(
      Flag.withDescription(
        "The last 30, 90 or 180 days, today included. Defaults to 90; fewer where the platform lets Peal keep less."
      ),
      Flag.withDefault("90" as const)
    ),
    json: jsonFlag,
    timeZone: timeZoneFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("analytics.bestTimes")(function* showBestTimes(input) {
    yield* zoneNamed(input.timeZone);

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const found = yield* client.analytics
      .bestTimes({
        params: { workspaceId: workspace.id },
        query: {
          channelId: input.channel,
          days: bestTimesDays[input.days],
          timeZone: input.timeZone,
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(BestTimesSchema, found);

      return;
    }

    yield* Console.log(
      `When this ${found.platform} channel's posts did best, from ${found.from} to ${found.to} in ${found.timeZone}: what happened, not what will.`
    );

    if (!found.counted) {
      yield* Console.log(
        "Its platform gives no likes, reposts, replies or quotes, so there is nothing to weigh."
      );

      return;
    }

    if (!found.enough) {
      yield* Console.log(
        `Not enough posts to rank its hours: ${String(found.posts)} weighed, ${String(found.minimumPosts)} needed.`
      );
    }

    if (found.best.length > 0) {
      yield* Console.log(
        "Best hours, by the median of likes, reposts, replies and quotes each post was given:"
      );

      for (const line of columns(
        found.best.map((bucket) => [
          `  ${hourName(bucket)}`,
          `median ${count(bucket.median)}`,
          `${String(bucket.posts)} posts`,
        ])
      )) {
        yield* Console.log(line);
      }
    }

    yield* Console.log(
      `${String(found.posts)} posts weighed; ${String(found.recent)} left out, less than 48 hours old. An hour with fewer than ${String(found.minimumPostsPerHour)} posts has no median.`
    );
  })
).pipe(
  Command.withDescription(
    "Show when one channel's posts did best, by weekday and hour: how many went live in each hour and the median of what they were given. It describes the channel's past, never a prediction, and ranks nothing under 20 posts."
  )
);

export const analytics = Command.make("analytics").pipe(
  Command.withDescription(
    "How a workspace's posts and accounts did on their platforms."
  ),
  Command.withSubcommands([
    summary,
    dashboard,
    channel,
    bestTimes,
    exportFile,
    post,
  ])
);
