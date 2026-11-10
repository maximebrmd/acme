import { Effect, Option, Schema, Stream } from "effect";
import { HttpServerResponse } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  CurrentMember,
  Forbidden,
  InvalidDateRange,
  InvalidTimeZone,
} from "peal-contract";
import type { CalendarDay } from "peal-contract";

import {
  AnalyticsQueries,
  topPostCount,
} from "#analytics/application/analytics-queries.ts";
import type { RangeAsked } from "#analytics/application/analytics-queries.ts";
import type { PostHistory } from "#analytics/application/analytics-reports.ts";
import { actorOf } from "#shared/api/actor.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

import { contentTypes, headerOf, lineOf } from "./analytics-export.ts";
import {
  channelSeriesView,
  dashboardView,
  dateFrom,
  summaryView,
  targetView,
} from "./analytics-view.ts";

const decodePostId = Schema.decodeUnknownOption(PostIdSchema);

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

const forbidden = () => Effect.fail(new Forbidden());

const noHistory: readonly PostHistory[] = [];

// The days a request asks for: `days`, or `from` and `to`, never both
// nor neither.
const rangeAsked = (query: {
  readonly days?: number;
  readonly from?: CalendarDay;
  readonly timeZone: string;
  readonly to?: CalendarDay;
}): Effect.Effect<RangeAsked, InvalidDateRange | InvalidTimeZone> =>
  Effect.gen(function* asked() {
    const timeZone = decodeTimeZone(query.timeZone);

    if (Option.isNone(timeZone)) {
      return yield* new InvalidTimeZone({ timeZone: query.timeZone });
    }

    const between = Option.all({
      from: Option.fromUndefinedOr(query.from).pipe(Option.flatMap(dateFrom)),
      to: Option.fromUndefinedOr(query.to).pipe(Option.flatMap(dateFrom)),
    });

    if (query.days !== undefined) {
      return query.from === undefined && query.to === undefined
        ? { _tag: "last", days: query.days, timeZone: timeZone.value }
        : yield* new InvalidDateRange();
    }

    return Option.isSome(between)
      ? { _tag: "between", ...between.value, timeZone: timeZone.value }
      : yield* new InvalidDateRange();
  });

export const AnalyticsHandlers = HttpApiBuilder.group(
  Api,
  "analytics",
  Effect.fn(function* analyticsHandlers(handlers) {
    const queries = yield* AnalyticsQueries;

    const refusals = {
      DatabaseError: Effect.die,
      InvalidReportRange: () => Effect.fail(new InvalidDateRange()),
      MissingPermission: forbidden,
    };

    return handlers.handleAll({
      channel: ({ params, query }) =>
        Effect.gen(function* channel() {
          const actor = actorOf(yield* CurrentMember);
          const asked = yield* rangeAsked(query);

          const series = yield* queries
            .channel(actor, decodeChannelId(params.channelId), asked)
            .pipe(Effect.catchTags(refusals));

          return channelSeriesView(params.channelId, series);
        }),
      dashboard: ({ query }) =>
        Effect.gen(function* dashboard() {
          const actor = actorOf(yield* CurrentMember);
          const asked = yield* rangeAsked(query);

          const found = yield* queries
            .dashboard(actor, asked, query.topPosts ?? topPostCount)
            .pipe(Effect.catchTags(refusals));

          return dashboardView(found);
        }),
      export: ({ query }) =>
        Effect.gen(function* exporting() {
          const actor = actorOf(yield* CurrentMember);
          const asked = yield* rangeAsked(query);
          const format = query.format ?? "csv";

          const rows = yield* queries.exportRows(actor, query.kind, asked).pipe(
            Effect.catchTags({
              InvalidReportRange: refusals.InvalidReportRange,
              MissingPermission: refusals.MissingPermission,
            })
          );

          // A line a row, as the rows are read: a page of them is all the
          // server holds, however long the file.
          const lines = Stream.concat(
            Stream.make(headerOf(query.kind, format)),
            rows.pipe(Stream.map((row) => lineOf(query.kind, format, row)))
          ).pipe(Stream.encodeText, Stream.orDie);

          return HttpServerResponse.stream(lines, {
            contentType: contentTypes[format],
            headers: {
              "cache-control": "no-store",
              "content-disposition": `attachment; filename="peal-analytics-${query.kind}.${format === "csv" ? "csv" : "ndjson"}"`,
            },
          });
        }),
      post: ({ params }) =>
        Effect.gen(function* post() {
          const actor = actorOf(yield* CurrentMember);
          const postId = decodePostId(params.postId);

          // An id that is not a post's names none: nothing was read of it.
          const found: Effect.Effect<
            readonly PostHistory[],
            DatabaseError | MissingPermission
          > = Option.match(postId, {
            onNone: () =>
              Effect.fromResult(authorize(actor, "analytics:read")).pipe(
                Effect.as(noHistory)
              ),
            onSome: (id) => queries.post(actor, id),
          });

          const histories = yield* found.pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return { postId: params.postId, targets: histories.map(targetView) };
        }),
      summary: ({ query }) =>
        Effect.gen(function* summary() {
          const actor = actorOf(yield* CurrentMember);
          const timeZone = decodeTimeZone(query.timeZone);

          if (Option.isNone(timeZone)) {
            return yield* new InvalidTimeZone({ timeZone: query.timeZone });
          }

          const from = dateFrom(query.from);
          const to = dateFrom(query.to);

          if (Option.isNone(from) || Option.isNone(to)) {
            return yield* new InvalidDateRange();
          }

          const found = yield* queries
            .summary(actor, {
              from: from.value,
              timeZone: timeZone.value,
              to: to.value,
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidReportRange: () => Effect.fail(new InvalidDateRange()),
                MissingPermission: forbidden,
              })
            );

          return summaryView(found);
        }),
    });
  })
);
