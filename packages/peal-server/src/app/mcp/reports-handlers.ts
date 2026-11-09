import { CurrentMember } from "acme-contract";
import { Effect, Option, Schema } from "effect";

import {
  dateFrom,
  summaryView,
  targetView,
} from "#analytics/api/analytics-view.ts";
import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";
import type { PostHistory } from "#analytics/application/analytics-reports.ts";
import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import { ReportTools } from "#app/mcp/reports-tools.ts";
import { billingView } from "#billing/api/billing-view.ts";
import { BillingOverview } from "#billing/application/billing-overview.ts";
import { actorOf } from "#shared/api/actor.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const decodePostId = Schema.decodeUnknownOption(PostIdSchema);

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

const noHistory: readonly PostHistory[] = [];

const invalidRange = () =>
  refuse(
    "The range must end on or after the day it starts, and span 366 days at most."
  );

/** What the report tools do, through the analytics and billing use cases. */
export const ReportToolsLive = ReportTools.toLayer(
  Effect.gen(function* reportTools() {
    const analytics = yield* AnalyticsQueries;
    const billing = yield* BillingOverview;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return ReportTools.of({
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
      get_billing: () =>
        Effect.gen(function* getBilling() {
          const found = yield* billing.of(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read the workspace's billing"),
            })
          );

          return billingView(found);
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
