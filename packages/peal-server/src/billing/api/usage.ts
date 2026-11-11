import { DateTime, Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { Api, CurrentMember, InvalidDateRange } from "peal-contract";
import type { CalendarDay } from "peal-contract";

import { UsageReports } from "#billing/application/usage-reports.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";

import { usageView } from "./usage-view.ts";

// A day the contract checked, as its first instant (UTC).
const dayAsked = (day: CalendarDay | undefined): Option.Option<DateTime.Utc> =>
  Option.fromUndefinedOr(day).pipe(
    Option.map((written) => DateTime.makeUnsafe(`${written}T00:00:00Z`))
  );

export const UsageHandlers = HttpApiBuilder.group(
  Api,
  "usage",
  Effect.fn(function* usageHandlers(handlers) {
    const reports = yield* UsageReports;

    return handlers.handle("get", ({ query }) =>
      Effect.gen(function* get() {
        const actor = actorOf(yield* CurrentMember);

        const report = yield* reports
          .ofWorkspace(actor, {
            from: dayAsked(query.from),
            to: dayAsked(query.to),
          })
          .pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidUsageRange: ({ maxDays }) =>
                Effect.fail(
                  new InvalidDateRange({
                    message: `The range of days ends before it starts, or spans more than ${maxDays} days.`,
                  })
                ),
              MissingPermission: forbidden,
            })
          );

        return usageView(report);
      })
    );
  })
);
