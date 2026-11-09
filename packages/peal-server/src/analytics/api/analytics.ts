import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  CurrentMember,
  Forbidden,
  InvalidDateRange,
  InvalidTimeZone,
} from "peal-contract";

import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";
import type { PostHistory } from "#analytics/application/analytics-reports.ts";
import { actorOf } from "#shared/api/actor.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

import { dateFrom, summaryView, targetView } from "./analytics-view.ts";

const decodePostId = Schema.decodeUnknownOption(PostIdSchema);

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

const forbidden = () => Effect.fail(new Forbidden());

const noHistory: readonly PostHistory[] = [];

export const AnalyticsHandlers = HttpApiBuilder.group(
  Api,
  "analytics",
  Effect.fn(function* analyticsHandlers(handlers) {
    const queries = yield* AnalyticsQueries;

    return handlers.handleAll({
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
