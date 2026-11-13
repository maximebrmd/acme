import { DateTime, Effect, Option, Schema } from "effect";
import { CurrentMember, defaultActivityPageSize } from "peal-contract";
import type { CalendarDay } from "peal-contract";

import { toEventView } from "#activity/api/activity-view.ts";
import { ActivityLog } from "#activity/application/activity-log.ts";
import { ActivityEventIdSchema } from "#activity/domain/activity-event-id.ts";
import {
  bestTimesView,
  channelSeriesView,
  dashboardView,
  dateFrom,
  summaryView,
  targetView,
} from "#analytics/api/analytics-view.ts";
import {
  AnalyticsQueries,
  topPostCount,
} from "#analytics/application/analytics-queries.ts";
import type { RangeAsked } from "#analytics/application/analytics-queries.ts";
import type { PostHistory } from "#analytics/application/analytics-reports.ts";
import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import { ReportTools } from "#app/mcp/reports-tools.ts";
import { accountShown, billingView } from "#billing/api/billing-view.ts";
import { usageView } from "#billing/api/usage-view.ts";
import { AccountViews } from "#billing/application/account-views.ts";
import { BillingOverview } from "#billing/application/billing-overview.ts";
import { UsageReports } from "#billing/application/usage-reports.ts";
import { actorOf } from "#shared/api/actor.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  pageView,
  reportView,
  statusView,
} from "#shortlinks/api/short-links-view.ts";
import { ShortLinkBase } from "#shortlinks/application/short-link-base.ts";
import { ShortLinkReports } from "#shortlinks/application/short-link-reports.ts";
import { ShortLinkSettings } from "#shortlinks/application/short-link-settings.ts";
import { ShortLinkIdSchema } from "#shortlinks/domain/short-link-id.ts";

const decodePostId = Schema.decodeUnknownOption(PostIdSchema);

const decodeShortLinkId = Schema.decodeUnknownOption(ShortLinkIdSchema);

const decodeEventId = Schema.decodeUnknownOption(ActivityEventIdSchema);
const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

const noHistory: readonly PostHistory[] = [];

// A day the tool's schema checked, as its first instant (UTC).
const dayFrom = (day: CalendarDay) => DateTime.make(`${day}T00:00:00Z`);

const invalidRange = () =>
  refuse(
    "The range must end on or after the day it starts, and span 366 days at most."
  );

// The days a tool was asked for: `days`, or `from` and `to`.
const rangeAsked = (asked: {
  readonly days?: number;
  readonly from?: CalendarDay;
  readonly timeZone: string;
  readonly to?: CalendarDay;
}) =>
  Effect.gen(function* range() {
    const zone = decodeTimeZone(asked.timeZone);

    if (Option.isNone(zone)) {
      return yield* refuse(
        `${asked.timeZone} is not an IANA time zone, such as Europe/Paris.`
      );
    }

    const between = Option.all({
      from: Option.fromUndefinedOr(asked.from).pipe(Option.flatMap(dateFrom)),
      to: Option.fromUndefinedOr(asked.to).pipe(Option.flatMap(dateFrom)),
    });

    const dated = asked.from !== undefined || asked.to !== undefined;

    if (asked.days !== undefined && !dated) {
      const last: RangeAsked = {
        _tag: "last",
        days: asked.days,
        timeZone: zone.value,
      };

      return last;
    }

    if (asked.days === undefined && Option.isSome(between)) {
      const given: RangeAsked = {
        _tag: "between",
        ...between.value,
        timeZone: zone.value,
      };

      return given;
    }

    return yield* refuse(
      "Give `days`, or `from` and `to` together, not both: the range ends on or after the day it starts, and spans 366 days at most."
    );
  });

// A day asked, as its first instant (UTC).
const clickDay = (day: CalendarDay | undefined) =>
  Option.fromUndefinedOr(day).pipe(Option.flatMap(dayFrom));

// An id asked that is not one names nothing of the workspace.
const idAsked = <A>(
  text: string | undefined,
  decoded: (input: string) => Option.Option<A>,
  what: string
) =>
  text === undefined
    ? Effect.succeedNone
    : Option.match(decoded(text), {
        onNone: () => refuse(`${text} is not ${what}.`),
        onSome: (id) => Effect.succeed(Option.some(id)),
      });

/** What the report tools do, through the analytics and billing use cases. */
export const ReportToolsLive = ReportTools.toLayer(
  Effect.gen(function* reportTools() {
    const analytics = yield* AnalyticsQueries;
    const accounts = yield* AccountViews;
    const billing = yield* BillingOverview;
    const usage = yield* UsageReports;
    const activity = yield* ActivityLog;
    const shortLinkReports = yield* ShortLinkReports;
    const shortLinkSettings = yield* ShortLinkSettings;
    const { base } = yield* ShortLinkBase;
    const written = base.pipe(Option.map((url) => url.href));

    const clickRefusals = {
      DatabaseError: Effect.die,
      InvalidClickRange: ({ maxDays }: { readonly maxDays: number }) =>
        refuse(
          `The range must end on or after the day it starts, and span ${String(maxDays)} days at most.`
        ),
      MissingPermission: notAllowed("read analytics"),
    };

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    const refusals = {
      DatabaseError: Effect.die,
      InvalidReportRange: invalidRange,
      MissingPermission: notAllowed("read analytics"),
    };

    return ReportTools.of({
      analytics_dashboard: (asked) =>
        Effect.gen(function* dashboard() {
          const range = yield* rangeAsked(asked);

          const found = yield* analytics
            .dashboard(yield* actor, range, asked.topPosts ?? topPostCount)
            .pipe(Effect.catchTags(refusals));

          return dashboardView(found);
        }),
      analytics_summary: ({ from, timeZone, to }) =>
        Effect.gen(function* summary() {
          const zone = decodeTimeZone(timeZone);

          if (Option.isNone(zone)) {
            return yield* refuse(
              `${timeZone} is not an IANA time zone, such as Europe/Paris.`
            );
          }

          const first = dateFrom(from);
          const last = dateFrom(to);

          if (Option.isNone(first) || Option.isNone(last)) {
            return yield* invalidRange();
          }

          const found = yield* analytics
            .summary(yield* actor, {
              from: first.value,
              timeZone: zone.value,
              to: last.value,
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidReportRange: invalidRange,
                MissingPermission: notAllowed("read analytics"),
              })
            );

          return summaryView(found);
        }),
      best_times: ({ channelId, days, timeZone }) =>
        Effect.gen(function* bestTimes() {
          const zone = decodeTimeZone(timeZone);

          if (Option.isNone(zone)) {
            return yield* refuse(
              `${timeZone} is not an IANA time zone, such as Europe/Paris.`
            );
          }

          const found = yield* analytics
            .bestTimes(
              yield* actor,
              decodeChannelId(channelId),
              days ?? 90,
              zone.value
            )
            .pipe(
              Effect.catchTags({
                ChannelNotFound: () =>
                  refuse(
                    "The workspace follows no channel with this id: list_channels lists them."
                  ),
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read analytics"),
              })
            );

          return bestTimesView(found);
        }),
      channel_analytics: (asked) =>
        Effect.gen(function* channel() {
          const range = yield* rangeAsked(asked);

          const found = yield* analytics
            .channel(yield* actor, decodeChannelId(asked.channelId), range)
            .pipe(Effect.catchTags(refusals));

          return channelSeriesView(asked.channelId, found);
        }),
      get_billing: () =>
        Effect.gen(function* getBilling() {
          const found = yield* billing.of(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read the workspace's billing"),
            })
          );

          const account = yield* accountShown(
            found,
            accounts.of(yield* actor).pipe(Effect.orDie)
          );

          return billingView(found, account);
        }),
      get_short_link: ({ from, linkId, to }) =>
        Effect.gen(function* getShortLink() {
          const id = decodeShortLinkId(linkId);

          if (Option.isNone(id)) {
            return yield* refuse(
              "The workspace has no short link with this id: list_short_links lists them."
            );
          }

          const found = yield* shortLinkReports
            .get(yield* actor, id.value, {
              from: clickDay(from),
              to: clickDay(to),
            })
            .pipe(
              Effect.catchTags({
                ...clickRefusals,
                ShortLinkNotFound: () =>
                  refuse(
                    "The workspace has no short link with this id: list_short_links lists them."
                  ),
              })
            );

          return reportView(found, written);
        }),
      get_short_link_status: () =>
        Effect.gen(function* getShortLinkStatus() {
          const found = yield* shortLinkSettings.status(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read posts"),
            })
          );

          return statusView(found);
        }),
      get_usage: ({ from, to }) =>
        Effect.gen(function* getUsage() {
          const found = yield* usage
            .ofWorkspace(yield* actor, {
              from: Option.fromUndefinedOr(from).pipe(Option.flatMap(dayFrom)),
              to: Option.fromUndefinedOr(to).pipe(Option.flatMap(dayFrom)),
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidUsageRange: ({ maxDays }) =>
                  refuse(
                    `The range must end on or after the day it starts, and span ${String(maxDays)} days at most.`
                  ),
                MissingPermission: notAllowed("read the workspace's usage"),
              })
            );

          return usageView(found);
        }),
      list_activity: ({ actor: actorId, cursor, limit, operation }) =>
        Effect.gen(function* listed() {
          // A cursor is the id of the last event of the page before.
          const after = Option.fromUndefinedOr(cursor).pipe(
            Option.map(decodeEventId)
          );

          if (Option.isSome(after) && Option.isNone(after.value)) {
            return yield* refuse(
              "This cursor is not one of the activity log's: pass a page's nextCursor as it came."
            );
          }

          const page = yield* activity
            .list(yield* actor, {
              actorId: Option.fromUndefinedOr(actorId),
              after: Option.flatten(after),
              limit: limit ?? defaultActivityPageSize,
              operation: Option.fromUndefinedOr(operation),
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read the activity log"),
              })
            );

          return {
            items: page.items.map(toEventView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
      list_short_links: (asked) =>
        Effect.gen(function* listShortLinks() {
          const found = yield* shortLinkReports
            .list(yield* actor, {
              channelId: yield* idAsked(
                asked.channelId,
                decodeChannelId,
                "a channel's id"
              ),
              cursor: yield* idAsked(
                asked.cursor,
                decodeShortLinkId,
                "a page's nextCursor"
              ),
              from: clickDay(asked.from),
              limit: Option.fromUndefinedOr(asked.limit),
              postId: yield* idAsked(asked.postId, decodePostId, "a post's id"),
              to: clickDay(asked.to),
            })
            .pipe(Effect.catchTags(clickRefusals));

          return pageView(found, written);
        }),
      post_analytics: ({ postId }) =>
        Effect.gen(function* post() {
          const member = yield* actor;

          // An id that is not a post's names none: nothing was read of it.
          const found: Effect.Effect<
            readonly PostHistory[],
            DatabaseError | MissingPermission
          > = Option.match(decodePostId(postId), {
            onNone: () =>
              Effect.fromResult(authorize(member, "analytics:read")).pipe(
                Effect.as(noHistory)
              ),
            onSome: (id) => analytics.post(member, id),
          });

          const histories = yield* found.pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read analytics"),
            })
          );

          return { postId, targets: histories.map(targetView) };
        }),
    });
  })
);
