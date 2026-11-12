import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Stream,
} from "effect";

import { utcDayFrom } from "#analytics/domain/account-metrics.ts";
import { followerChange } from "#analytics/domain/account-series.ts";
import type { FollowersRead } from "#analytics/domain/account-series.ts";
import {
  keptSince,
  retentionOf,
} from "#analytics/domain/analytics-retention.ts";
import {
  bestTimesOf,
  hourStarts,
  settlingHours,
  weighedCounts,
} from "#analytics/domain/best-times.ts";
import type {
  BestTimes,
  BestTimesPeriod,
} from "#analytics/domain/best-times.ts";
import type { InvalidReportRange } from "#analytics/domain/invalid-report-range.ts";
import {
  dayStarts,
  lastDays,
  previousRange,
  reportDays,
  reportRange,
} from "#analytics/domain/report-range.ts";
import type { ReportRange } from "#analytics/domain/report-range.ts";
import type { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import { addDays, localDateOf } from "#shared/domain/wall-clock.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import { AnalyticsAcrossReads } from "./analytics-across-reads.ts";
import type { OfWorkspace } from "./analytics-across-reads.ts";
import {
  comparisonOf,
  dashboardOf,
  followersOf,
  totalsOf,
} from "./analytics-dashboard.ts";
import type {
  ChannelSeries,
  Comparison,
  Dashboard,
} from "./analytics-dashboard.ts";
import { AnalyticsReports } from "./analytics-reports.ts";
import type {
  AccountDayRow,
  ChannelCounts,
  ChannelTotals,
  DayGains,
  FollowedChannel,
  CountTotals,
  ExportedPost,
  PostHistory,
} from "./analytics-reports.ts";
import { BestTimesReads } from "./best-times-reads.ts";
import { ChannelNotFound } from "./channel-not-found.ts";

/** How many posts a summary ranks. */
export const topPostCount = 5;

/** What the posts of a range gained on one of its days. */
export interface EngagementDay {
  readonly date: LocalDate;
  readonly likes: number;
  readonly quotes: number;
  readonly replies: number;
  readonly reposts: number;
}

/**
 * The posts a workspace published over a range of days: their latest
 * counts, in all and by channel, what they gained each day, and those
 * doing best.
 */
export interface AnalyticsSummary {
  readonly channels: readonly ChannelTotals[];
  readonly days: readonly EngagementDay[];
  readonly range: ReportRange;
  readonly topPosts: readonly TrackedPost[];
  readonly totals: CountTotals;
}

const addOptional = (
  left: Option.Option<number>,
  right: Option.Option<number>
): Option.Option<number> =>
  Option.isNone(left)
    ? right
    : Option.some(left.value + Option.getOrElse(right, () => 0));

const totalOf = (channels: readonly ChannelTotals[]): CountTotals => {
  let sum: CountTotals = {
    impressions: Option.none(),
    likes: 0,
    posts: 0,
    quotes: Option.none(),
    replies: 0,
    reposts: 0,
  };

  for (const channel of channels) {
    sum = {
      impressions: addOptional(sum.impressions, channel.impressions),
      likes: sum.likes + channel.likes,
      posts: sum.posts + channel.posts,
      quotes: addOptional(sum.quotes, channel.quotes),
      replies: sum.replies + channel.replies,
      reposts: sum.reposts + channel.reposts,
    };
  }

  return sum;
};

/**
 * The days asked for: the last 7, 30 or 90 ending today in the zone, or
 * from one day to another.
 */
export type RangeAsked = Pick<ReportRange, "timeZone"> &
  (
    | { readonly _tag: "last"; readonly days: number }
    | {
        readonly _tag: "between";
        readonly from: LocalDate;
        readonly to: LocalDate;
      }
  );

// What a channel's series is put together from.
interface ChannelRows {
  readonly accountDays: readonly AccountDayRow[];
  readonly channels: readonly FollowedChannel[];
  readonly counts: readonly ChannelCounts[];
  readonly gains: readonly DayGains[];
}

// What a channel that does not exist has: nothing.
const nothingRead: ChannelRows = {
  accountDays: [],
  channels: [],
  counts: [],
  gains: [],
};

// When a range starts and ends, and when each of its days does.
const spanOf = (range: ReportRange) => {
  const starts = dayStarts(range);
  const [start] = starts;
  const end = starts.at(-1);

  return start === undefined || end === undefined
    ? Effect.die("A range covers at least one day")
    : Effect.succeed({ end, start, starts });
};

const daysOf = (range: ReportRange) =>
  reportDays(range).map((date) => ({ date, day: utcDayFrom(date) }));

/** A row of an export: a post of the range, or a day of an account. */
export type ExportRow =
  | { readonly _tag: "post"; readonly row: ExportedPost }
  | { readonly _tag: "accountDay"; readonly row: AccountDayRow };

/**
 * Several workspaces' ranges beside the ones before, each as its own
 * dashboard answers it, for the same range: a workspace whose analytics
 * hold nothing for it answers totals of no post.
 */
export interface AcrossWorkspaces {
  readonly previous: ReportRange;
  readonly range: ReportRange;
  readonly workspaces: ReadonlyMap<WorkspaceId, Comparison>;
}

/** When a channel's posts did best, and over which days. */
export interface ChannelBestTimes extends BestTimes {
  readonly channelId: ChannelId;
  /**
   * Whether the platform gives any of the counts weighed: likes, reposts,
   * replies, quotes. Where it gives none, nothing is weighed.
   */
  readonly counted: boolean;
  /** The days read: those asked, or fewer where the platform keeps less. */
  readonly days: number;
  readonly from: LocalDate;
  readonly platform: Platform;
  /** The posts left out because their counts still move. */
  readonly recent: number;
  readonly timeZone: TimeZoneId;
  readonly to: LocalDate;
}

// The rows of several workspaces, by workspace.
const byWorkspace = <A>(rows: readonly OfWorkspace<A>[]) => {
  const grouped = new Map<WorkspaceId, OfWorkspace<A>[]>();

  for (const row of rows) {
    const kept = grouped.get(row.workspaceId) ?? [];

    kept.push(row);
    grouped.set(row.workspaceId, kept);
  }

  return (workspaceId: WorkspaceId): readonly OfWorkspace<A>[] =>
    grouped.get(workspaceId) ?? [];
};

/** How many rows an export reads from the store at a time. */
export const exportPage = 500;

/** Reading a workspace's analytics. Needs analytics:read. */
export class AnalyticsQueries extends Context.Service<
  AnalyticsQueries,
  {
    /**
     * The channels of one of the workspace's posts that analytics follows,
     * each with its counts over time. None for a post not published yet,
     * or not the workspace's.
     */
    readonly post: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      readonly PostHistory[],
      DatabaseError | MissingPermission
    >;
    /** The posts published over the days of a range, in its time zone. */
    readonly summary: (
      actor: Actor,
      range: Pick<ReportRange, "from" | "timeZone" | "to">
    ) => Effect.Effect<
      AnalyticsSummary,
      DatabaseError | InvalidReportRange | MissingPermission
    >;
    /**
     * The workspace's analytics over a range beside the range before it,
     * with the `top` posts people did the most with.
     */
    readonly dashboard: (
      actor: Actor,
      asked: RangeAsked,
      top: number
    ) => Effect.Effect<
      Dashboard,
      DatabaseError | InvalidReportRange | MissingPermission
    >;
    /**
     * One channel's numbers day by day. A channel that is not the
     * workspace's, or that Peal read nothing of, has days without numbers.
     */
    readonly channel: (
      actor: Actor,
      channelId: Option.Option<ChannelId>,
      asked: RangeAsked
    ) => Effect.Effect<
      ChannelSeries,
      DatabaseError | InvalidReportRange | MissingPermission
    >;
    /**
     * The rows of an export, read a page at a time as they are taken, so
     * however many there are, a page is all that is held.
     */
    readonly exportRows: (
      actor: Actor,
      kind: "accounts" | "posts",
      asked: RangeAsked
    ) => Effect.Effect<
      Stream.Stream<ExportRow, DatabaseError>,
      InvalidReportRange | MissingPermission
    >;
    /**
     * When one of the workspace's channels' posts did best, by weekday and
     * hour in the zone, over the last `days`: the past of this channel,
     * never a prediction.
     */
    readonly bestTimes: (
      actor: Actor,
      channelId: Option.Option<ChannelId>,
      days: BestTimesPeriod,
      timeZone: TimeZoneId
    ) => Effect.Effect<
      ChannelBestTimes,
      ChannelNotFound | DatabaseError | MissingPermission
    >;
    /**
     * The workspaces of these actors over the same range, each beside the
     * range before, as its dashboard answers them: one query a kind of
     * row for all of them. Each actor needs analytics:read in its own.
     */
    readonly acrossWorkspaces: (
      actors: readonly Actor[],
      asked: RangeAsked
    ) => Effect.Effect<
      AcrossWorkspaces,
      DatabaseError | InvalidReportRange | MissingPermission
    >;
  }
>()("peal-server/analytics/application/AnalyticsQueries") {
  static readonly layer = Layer.effect(
    AnalyticsQueries,
    Effect.gen(function* AnalyticsQueriesLive() {
      const reports = yield* AnalyticsReports;
      const across = yield* AnalyticsAcrossReads;
      const bestTimesReads = yield* BestTimesReads;

      const post = Effect.fn("AnalyticsQueries.post")(function* post(
        actor: Actor,
        postId: PostId
      ) {
        yield* Effect.fromResult(authorize(actor, "analytics:read"));

        return yield* reports.history(actor.workspaceId, postId);
      });

      const summary = Effect.fn("AnalyticsQueries.summary")(function* summary(
        actor: Actor,
        asked: Pick<ReportRange, "from" | "timeZone" | "to">
      ) {
        yield* Effect.fromResult(authorize(actor, "analytics:read"));

        const range = yield* Effect.fromResult(reportRange(asked));

        const rows = yield* reports.report(
          actor.workspaceId,
          dayStarts(range),
          topPostCount
        );

        const gains = new Map(rows.days.map((day) => [day.day, day]));

        const days = reportDays(range).map((date, index): EngagementDay => ({
          date,
          likes: gains.get(index)?.likes ?? 0,
          quotes: gains.get(index)?.quotes ?? 0,
          replies: gains.get(index)?.replies ?? 0,
          reposts: gains.get(index)?.reposts ?? 0,
        }));

        const found: AnalyticsSummary = {
          channels: rows.channels,
          days,
          range,
          topPosts: rows.top,
          totals: totalOf(rows.channels),
        };

        return found;
      });

      // The range asked for, checked, today being the clock's.
      const rangeOf = Effect.fn("AnalyticsQueries.range")(function* rangeOf(
        asked: RangeAsked
      ) {
        if (asked._tag === "between") {
          return yield* Effect.fromResult(reportRange(asked));
        }

        const today = localDateOf(yield* DateTime.now, asked.timeZone);

        return yield* Effect.fromResult(
          lastDays(today, asked.days, asked.timeZone)
        );
      });

      const dashboard = Effect.fn("AnalyticsQueries.dashboard")(
        function* dashboard(actor: Actor, asked: RangeAsked, top: number) {
          yield* Effect.fromResult(authorize(actor, "analytics:read"));

          const range = yield* rangeOf(asked);
          const previous = previousRange(range);
          const span = yield* spanOf(range);
          const before = yield* spanOf(previous);
          const now = yield* DateTime.now;
          const { workspaceId } = actor;
          const channelId = Option.none<ChannelId>();
          const posts = { channelId, workspaceId };

          const found = yield* Effect.all({
            accountDays: reports.accountDays({
              channelId,
              from: utcDayFrom(previous.from),
              to: utcDayFrom(range.to),
              workspaceId,
            }),
            channels: reports.channels(workspaceId),
            counts: reports.counts({ ...posts, ...span }),
            gains: reports.gains(workspaceId, span.starts, channelId),
            previousCounts: reports.counts({ ...posts, ...before }),
            topPosts: reports.top({ ...posts, ...span }, top),
          });

          return dashboardOf({
            ...found,
            platforms: new Map(
              found.channels.map((channel) => [
                channel.channelId,
                channel.platform,
              ])
            ),
            previous,
            previousKeptOn: (platform) =>
              keptSince(platform, before.start, now),
            previousSpan: {
              from: utcDayFrom(previous.from),
              to: utcDayFrom(previous.to),
            },
            range,
            rangeDays: daysOf(range),
          });
        }
      );

      const channel = Effect.fn("AnalyticsQueries.channel")(function* channel(
        actor: Actor,
        asked: Option.Option<ChannelId>,
        days: RangeAsked
      ) {
        yield* Effect.fromResult(authorize(actor, "analytics:read"));

        const range = yield* rangeOf(days);

        const span = yield* spanOf(range);
        const { workspaceId } = actor;
        const from = utcDayFrom(range.from);
        const to = utcDayFrom(range.to);

        // An id that is no channel's names none: nothing was read of it.
        const found: ChannelRows = Option.isNone(asked)
          ? nothingRead
          : yield* Effect.all({
              accountDays: reports.accountDays({
                channelId: asked,
                from,
                to,
                workspaceId,
              }),
              channels: reports.channels(workspaceId),
              counts: reports.counts({
                channelId: asked,
                workspaceId,
                ...span,
              }),
              gains: reports.gains(workspaceId, span.starts, asked),
            });

        const followers = followersOf(found.accountDays);

        const byDay = new Map(found.accountDays.map((row) => [row.day, row]));
        const gains = new Map(found.gains.map((day) => [day.day, day]));
        const none = Option.none<number>();

        const series: ChannelSeries = {
          days: daysOf(range).map(({ date, day }, index) => ({
            date,
            followers: byDay.get(day)?.followers ?? none,
            following: byDay.get(day)?.following ?? none,
            likes: gains.get(index)?.likes ?? 0,
            posts: byDay.get(day)?.posts ?? none,
            quotes: gains.get(index)?.quotes ?? 0,
            reach: byDay.get(day)?.reach ?? none,
            replies: gains.get(index)?.replies ?? 0,
            reposts: gains.get(index)?.reposts ?? 0,
            views: byDay.get(day)?.views ?? none,
          })),
          followers: followerChange(
            asked.pipe(
              Option.flatMapNullishOr((channelId) => followers.get(channelId)),
              Option.getOrElse((): readonly FollowersRead[] => [])
            ),
            from,
            to
          ),
          platform: asked.pipe(
            Option.flatMapNullishOr(
              (channelId) =>
                found.channels.find(
                  (followed) => followed.channelId === channelId
                )?.platform
            )
          ),
          range,
          totals: totalsOf(found.counts),
        };

        return series;
      });

      const exportRows = Effect.fn("AnalyticsQueries.exportRows")(
        function* exportRows(
          actor: Actor,
          kind: "accounts" | "posts",
          asked: RangeAsked
        ) {
          yield* Effect.fromResult(authorize(actor, "analytics:read"));

          const range = yield* rangeOf(asked);
          const { workspaceId } = actor;
          const channelId = Option.none<ChannelId>();

          if (kind === "posts") {
            const span = yield* spanOf(range);
            const posts = { channelId, workspaceId, ...span };

            const rows: Stream.Stream<ExportRow, DatabaseError> =
              Stream.paginate(
                Option.none<Pick<TrackedPost, "publishedAt" | "targetId">>(),
                (after) =>
                  reports.postsPage(posts, after, exportPage).pipe(
                    Effect.map((page) => {
                      const last = page.at(-1)?.post;

                      const next =
                        page.length < exportPage || last === undefined
                          ? Option.none()
                          : Option.some(Option.some(last));

                      return [
                        page.map((row): ExportRow => ({ _tag: "post", row })),
                        next,
                      ] as const;
                    })
                  )
              );

            return rows;
          }

          const days = {
            channelId,
            from: utcDayFrom(range.from),
            to: utcDayFrom(range.to),
            workspaceId,
          };

          const rows: Stream.Stream<ExportRow, DatabaseError> = Stream.paginate(
            Option.none<Pick<AccountDayRow, "channelId" | "day">>(),
            (after) =>
              reports.accountDaysPage(days, after, exportPage).pipe(
                Effect.map((page) => {
                  const last = page.at(-1);

                  const next =
                    page.length < exportPage || last === undefined
                      ? Option.none()
                      : Option.some(Option.some(last));

                  return [
                    page.map((row): ExportRow => ({ _tag: "accountDay", row })),
                    next,
                  ] as const;
                })
              )
          );

          return rows;
        }
      );

      const acrossWorkspaces = Effect.fn("AnalyticsQueries.acrossWorkspaces")(
        function* acrossWorkspaces(
          actors: readonly Actor[],
          asked: RangeAsked
        ) {
          for (const actor of actors) {
            yield* Effect.fromResult(authorize(actor, "analytics:read"));
          }

          const range = yield* rangeOf(asked);
          const previous = previousRange(range);
          const ids = actors.map(({ workspaceId }) => workspaceId);

          if (ids.length === 0) {
            const nothing: AcrossWorkspaces = {
              previous,
              range,
              workspaces: new Map(),
            };

            return nothing;
          }

          const span = yield* spanOf(range);
          const before = yield* spanOf(previous);
          const now = yield* DateTime.now;

          const found = yield* Effect.all(
            {
              accountDays: across.accountDays(
                ids,
                utcDayFrom(previous.from),
                utcDayFrom(range.to)
              ),
              channels: across.channels(ids),
              counts: across.counts(ids, span.start, span.end),
              previousCounts: across.counts(ids, before.start, before.end),
            },
            { concurrency: "unbounded" }
          );

          const accountDays = byWorkspace(found.accountDays);
          const channels = byWorkspace(found.channels);
          const counts = byWorkspace(found.counts);
          const previousCounts = byWorkspace(found.previousCounts);
          const rangeDays = daysOf(range);

          const previousSpan = {
            from: utcDayFrom(previous.from),
            to: utcDayFrom(previous.to),
          };

          const workspaces = new Map(
            ids.map((workspaceId) => [
              workspaceId,
              comparisonOf({
                accountDays: accountDays(workspaceId),
                counts: counts(workspaceId),
                platforms: new Map(
                  channels(workspaceId).map((followedChannel) => [
                    followedChannel.channelId,
                    followedChannel.platform,
                  ])
                ),
                previous,
                previousCounts: previousCounts(workspaceId),
                previousKeptOn: (platform) =>
                  keptSince(platform, before.start, now),
                previousSpan,
                range,
                rangeDays,
              }),
            ])
          );

          const answered: AcrossWorkspaces = { previous, range, workspaces };

          return answered;
        }
      );

      const bestTimes = Effect.fn("AnalyticsQueries.bestTimes")(
        function* bestTimes(
          actor: Actor,
          asked: Option.Option<ChannelId>,
          days: BestTimesPeriod,
          timeZone: TimeZoneId
        ) {
          yield* Effect.fromResult(authorize(actor, "analytics:read"));

          const { workspaceId } = actor;
          const followed = yield* reports.channels(workspaceId);

          const match = Option.flatMapNullishOr(asked, (channelId) =>
            followed.find((each) => each.channelId === channelId)
          );

          if (Option.isNone(match)) {
            return yield* new ChannelNotFound();
          }

          const { channelId, platform } = match.value;
          const now = yield* DateTime.now;
          const weighed = weighedCounts(platform);

          // No more days than the platform lets Peal keep.
          const kept = Math.floor(Duration.toDays(retentionOf(platform)));

          const covered = Math.min(days, kept);
          const to = localDateOf(now, timeZone);
          const from = addDays(to, 1 - covered);
          const starts = hourStarts(from, to, timeZone);
          const settled = DateTime.subtract(now, { hours: settlingHours });
          const [first] = starts;

          const read =
            first === undefined || weighed.length === 0
              ? []
              : yield* bestTimesReads.channelPosts(
                  workspaceId,
                  channelId,
                  first.at,
                  now
                );

          const old = read.filter(({ publishedAt }) =>
            DateTime.isLessThan(publishedAt, settled)
          );

          const scoreOf = (given: (typeof read)[number]) =>
            weighed.reduce(
              (sum, count) =>
                sum +
                (count === "quotes"
                  ? Option.getOrElse(given.quotes, () => 0)
                  : given[count]),
              0
            );

          const answered: ChannelBestTimes = {
            ...bestTimesOf(
              starts,
              old.map((given) => ({
                publishedAt: given.publishedAt,
                score: scoreOf(given),
              }))
            ),
            channelId,
            counted: weighed.length > 0,
            days: covered,
            from,
            platform,
            recent: read.length - old.length,
            timeZone,
            to,
          };

          return answered;
        }
      );

      return AnalyticsQueries.of({
        acrossWorkspaces,
        bestTimes,
        channel,
        dashboard,
        exportRows,
        post,
        summary,
      });
    })
  );
}
