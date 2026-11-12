import { DateTime, Effect, Option } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  InvalidDateRange,
  PartnerNotFound,
} from "peal-contract";
import type { CalendarDay } from "peal-contract";

import { UsageReports } from "#billing/application/usage-reports.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import {
  partnerClosed,
  partnerKeyOnly,
  withoutPartnerScope,
} from "#shared/api/partner-key.ts";

import { partnerUsageView, usageView } from "./usage-view.ts";

// A day the contract checked, as its first instant (UTC).
const dayAsked = (day: CalendarDay | undefined): Option.Option<DateTime.Utc> =>
  Option.fromUndefinedOr(day).pipe(
    Option.map((written) => DateTime.makeUnsafe(`${written}T00:00:00Z`))
  );

const outOfRange = ({ maxDays }: { readonly maxDays: number }) =>
  Effect.fail(
    new InvalidDateRange({
      message: `The range of days ends before it starts, or spans more than ${maxDays} days.`,
    })
  );

const notACursor = () => Effect.fail(new HttpApiError.BadRequest());

// The period and the page a partner's report was asked with.
const partnerAsked = (query: {
  readonly before?: string;
  readonly from?: CalendarDay;
  readonly limit?: number;
  readonly to?: CalendarDay;
}) => ({
  before: Option.fromUndefinedOr(query.before),
  from: dayAsked(query.from),
  limit: Option.fromUndefinedOr(query.limit),
  to: dayAsked(query.to),
});

export const UsageHandlers = HttpApiBuilder.group(
  Api,
  "usage",
  Effect.fn(function* usageHandlers(handlers) {
    const reports = yield* UsageReports;

    return handlers
      .handle("get", ({ query }) =>
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
                InvalidUsageRange: outOfRange,
                MissingPermission: forbidden,
              })
            );

          return usageView(report);
        })
      )
      .handle("partner", ({ query }) =>
        Effect.gen(function* partner() {
          const actor = actorOf(yield* CurrentMember);

          const report = yield* reports
            .ofPartner(actor, partnerAsked(query))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidTenantCursor: notACursor,
                InvalidUsageRange: outOfRange,
                MissingPermission: forbidden,
                NoPartnerAccount: () => Effect.fail(new PartnerNotFound()),
              })
            );

          return partnerUsageView(report);
        })
      );
  })
);

/**
 * A partner's usage per customer, for its backend: a partner key with the
 * scope workspaces:read, refused as the rest of the partner API refuses.
 */
export const PartnerUsageHandlers = HttpApiBuilder.group(
  Api,
  "partnerUsage",
  Effect.fn(function* partnerUsageHandlers(handlers) {
    const reports = yield* UsageReports;

    return handlers.handle("get", ({ query }) =>
      Effect.gen(function* get() {
        const key = yield* partnerKeyOnly;

        const report = yield* reports
          .ofPartnerKey(
            { partnerId: key.partnerId, scopes: key.scopes },
            partnerAsked(query)
          )
          .pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidTenantCursor: notACursor,
              InvalidUsageRange: outOfRange,
              // The key's account went between its check and this read.
              NoPartnerAccount: partnerClosed,
              PartnerScopeMissing: withoutPartnerScope,
            })
          );

        return partnerUsageView(report);
      })
    );
  })
);
