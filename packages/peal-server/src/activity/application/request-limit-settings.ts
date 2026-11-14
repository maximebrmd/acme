import { Context, DateTime, Effect, Layer, Option } from "effect";

import { policyOfWorkspaces } from "#activity/domain/rate-limit.ts";
import type { PolicyName } from "#activity/domain/rate-limit.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { RequestLimitOverrides } from "./request-limit-overrides.ts";
import type { RequestLimitOverride } from "./request-limit-overrides.ts";
import { RequestLimitsUnbilled } from "./request-limits-unbilled.ts";
import { RequestPolicy } from "./request-policy.ts";
import { RequestStandings } from "./request-standings.ts";

/** A workspace's rate limit, as staff read it. */
export interface WorkspaceRequestLimit {
  /** Whether this server bills: else the setting is everyone's. */
  readonly bills: boolean;
  /** The limit its keys send under now, and the policy it comes from. */
  readonly policy: PolicyName;
  readonly requestsPerMinute: number;
  /** What staff set for it, if they did. */
  readonly override: Option.Option<RequestLimitOverride>;
  /** Whether its billing account pays; false where the server does not bill. */
  readonly paying: boolean;
}

/**
 * A workspace's own rate limit, which staff set on request (the rate
 * card's 1,200 a minute): read with what applies to its keys now, set or
 * removed. A change reaches the limiter within its cache's minute. On a
 * server that does not bill, the setting is everyone's: reading says so,
 * and setting is refused.
 */
export class RequestLimitSettings extends Context.Service<
  RequestLimitSettings,
  {
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<WorkspaceRequestLimit, DatabaseError>;
    readonly set: (
      workspaceId: WorkspaceId,
      requestsPerMinute: Option.Option<number>
    ) => Effect.Effect<
      WorkspaceRequestLimit,
      DatabaseError | RequestLimitsUnbilled
    >;
  }
>()("peal-server/activity/application/RequestLimitSettings") {
  static readonly layer = Layer.effect(
    RequestLimitSettings,
    Effect.gen(function* RequestLimitSettingsLive() {
      const setting = yield* RequestPolicy;
      const standings = yield* RequestStandings;
      const overrides = yield* RequestLimitOverrides;

      const of = Effect.fn("RequestLimitSettings.of")(function* of(
        workspaceId: WorkspaceId
      ) {
        if (Option.isNone(standings.withoutPaymentMethod)) {
          const unbilled: WorkspaceRequestLimit = {
            bills: false,
            override: Option.none(),
            paying: false,
            policy: "default",
            requestsPerMinute: setting.limit,
          };

          return unbilled;
        }

        const paying = (yield* standings.paying([workspaceId])).has(
          workspaceId
        );

        const override = Option.fromUndefinedOr(
          (yield* overrides.of([workspaceId])).get(workspaceId)
        );

        const policy = policyOfWorkspaces(
          {
            setting: setting.limit,
            withoutPaymentMethod: standings.withoutPaymentMethod.value,
          },
          [
            {
              override: override.pipe(
                Option.map(({ requestsPerMinute }) => requestsPerMinute)
              ),
              paying,
            },
          ]
        );

        const limit: WorkspaceRequestLimit = {
          bills: true,
          override,
          paying,
          policy: policy.name,
          requestsPerMinute: policy.limit,
        };

        return limit;
      });

      const set = Effect.fn("RequestLimitSettings.set")(function* set(
        workspaceId: WorkspaceId,
        requestsPerMinute: Option.Option<number>
      ) {
        if (Option.isNone(standings.withoutPaymentMethod)) {
          return yield* new RequestLimitsUnbilled();
        }

        yield* Option.match(requestsPerMinute, {
          onNone: () => overrides.remove(workspaceId),
          onSome: (limit) =>
            DateTime.now.pipe(
              Effect.flatMap((now) => overrides.set(workspaceId, limit, now))
            ),
        });

        return yield* of(workspaceId);
      });

      return RequestLimitSettings.of({ of, set });
    })
  );
}
