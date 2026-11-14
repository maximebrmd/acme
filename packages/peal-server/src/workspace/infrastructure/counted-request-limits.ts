import { Duration, Effect, Layer, Option } from "effect";

import { RequestLimiter } from "#activity/application/request-limiter.ts";
import type { LimitHolder } from "#activity/application/request-limiter.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PartnerStore } from "#workspace/application/partner-store.ts";
import { RequestLimits } from "#workspace/application/request-limits.ts";
import { limitSubjectOf } from "#workspace/domain/limit-subject.ts";
import type { Principal } from "#workspace/domain/principal.ts";

/**
 * How long a request waits to be counted: a database that is slow, or a
 * pool with no connection to give, lets it through as a failure does.
 */
export const countingTimeout = Duration.seconds(2);

/**
 * The rate limit, counted by the activity context. A count the database
 * cannot keep is logged, and the request goes through. Whose standing
 * decides the limit, on a server that bills: an API key's workspace's
 * billing account; a partner key's partner's home workspace's, whose
 * plan its customers share; an OAuth application's bound workspace's;
 * and for a token bound to no workspace, as the command line's, its
 * user's own billing account (the one they pay for, else the free tier),
 * with the limit staff set for the workspace it acts in, if any.
 */
export const CountedRequestLimits = Layer.effect(
  RequestLimits,
  Effect.gen(function* CountedRequestLimits() {
    const limiter = yield* RequestLimiter;
    const partners = yield* PartnerStore;

    const holderOf = (
      principal: Principal,
      actingIn: Option.Option<WorkspaceId>
    ): LimitHolder => {
      if (principal._tag === "ApiKeyPrincipal") {
        return {
          _tag: "workspace",
          key: `workspace:${principal.workspaceId}`,
          workspace: Effect.succeed(Option.some(principal.workspaceId)),
        };
      }

      if (principal._tag === "PartnerKeyPrincipal") {
        return {
          _tag: "workspace",
          key: `partner:${principal.partnerId}`,
          workspace: partners
            .get(principal.partnerId)
            .pipe(Effect.map(Option.map(({ workspaceId }) => workspaceId))),
        };
      }

      const bound = principal.oauth.pipe(
        Option.flatMap(({ workspaceId }) => workspaceId)
      );

      return Option.match(bound, {
        onNone: (): LimitHolder => ({
          _tag: "payer",
          actingIn,
          key: `user:${principal.userId}@${Option.getOrElse(actingIn, () => "-")}`,
          userId: principal.userId,
        }),
        onSome: (workspaceId): LimitHolder => ({
          _tag: "workspace",
          key: `workspace:${workspaceId}`,
          workspace: Effect.succeed(Option.some(workspaceId)),
        }),
      });
    };

    return RequestLimits.of({
      admit: (principal, actingIn) =>
        Option.match(limitSubjectOf(principal), {
          onNone: () => Effect.succeedNone,
          onSome: (subject) =>
            limiter.admit(subject, holderOf(principal, actingIn)).pipe(
              Effect.map(Option.some),
              Effect.timeoutOrElse({
                duration: countingTimeout,
                orElse: () =>
                  Effect.logWarning(
                    "Counting a request for the rate limit took too long: it goes through uncounted"
                  ).pipe(Effect.as(Option.none())),
              }),
              Effect.catchCause((cause) =>
                Effect.logWarning(
                  "Counting a request for the rate limit failed",
                  cause
                ).pipe(Effect.as(Option.none()))
              )
            ),
        }),
    });
  })
);
