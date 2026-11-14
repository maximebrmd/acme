import { Duration, Effect, Layer, Option } from "effect";

import { RequestLimiter } from "#activity/application/request-limiter.ts";
import type { LimitHolder } from "#activity/application/request-limiter.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
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
 * decides the limit, on a server that bills: an API key's workspace; a
 * partner key's partner's home workspace, whose plan its customers share;
 * an OAuth application's workspace when its token is bound to one, else
 * every workspace its user belongs to (the most generous counts, as one
 * credential has one count), read only when the limiter's cache does not
 * hold it.
 */
export const CountedRequestLimits = Layer.effect(
  RequestLimits,
  Effect.gen(function* CountedRequestLimits() {
    const limiter = yield* RequestLimiter;
    const partners = yield* PartnerStore;
    const directory = yield* MemberDirectory;

    const holderOf = (principal: Principal): LimitHolder => {
      if (principal._tag === "ApiKeyPrincipal") {
        return {
          key: `workspace:${principal.workspaceId}`,
          workspaces: Effect.succeed([principal.workspaceId]),
        };
      }

      if (principal._tag === "PartnerKeyPrincipal") {
        return {
          key: `partner:${principal.partnerId}`,
          workspaces: partners
            .get(principal.partnerId)
            .pipe(
              Effect.map((partner) =>
                Option.toArray(partner).map(({ workspaceId }) => workspaceId)
              )
            ),
        };
      }

      const bound = principal.oauth.pipe(
        Option.flatMap(({ workspaceId }) => workspaceId)
      );

      return Option.match(bound, {
        onNone: () => ({
          key: `user:${principal.userId}`,
          workspaces: directory.account(principal.userId).pipe(
            Effect.map((account) =>
              Option.toArray(account).flatMap(({ workspaces }) =>
                workspaces.map(({ id }) => id)
              )
            ),
            Effect.mapError(({ cause }) => new DatabaseError({ cause }))
          ),
        }),
        onSome: (workspaceId) => ({
          key: `workspace:${workspaceId}`,
          workspaces: Effect.succeed([workspaceId]),
        }),
      });
    };

    return RequestLimits.of({
      admit: (principal) =>
        Option.match(limitSubjectOf(principal), {
          onNone: () => Effect.succeedNone,
          onSome: (subject) =>
            limiter.admit(subject, holderOf(principal)).pipe(
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
