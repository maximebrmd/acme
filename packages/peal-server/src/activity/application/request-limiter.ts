import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import {
  countRetentionSeconds,
  policyOfWorkspaces,
  raisedByPaymentMethod,
  standingOf,
  windowStart,
} from "#activity/domain/rate-limit.ts";
import type {
  LimitStanding,
  PolicyName,
  RateLimitPolicy,
} from "#activity/domain/rate-limit.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { RequestCounts } from "./request-counts.ts";
import { RequestLimitOverrides } from "./request-limit-overrides.ts";
import { RequestPolicy } from "./request-policy.ts";
import { RequestStandings } from "./request-standings.ts";
import { SubjectDigest } from "./subject-digest.ts";

/**
 * Whose standing decides a credential's limit: `key` names it in the
 * cache (`workspace:<id>`, `partner:<id>`, `user:<id>`), and `workspaces`
 * reads the workspaces it acts for, only when the cache does not hold it.
 */
export interface LimitHolder {
  readonly key: string;
  readonly workspaces: Effect.Effect<readonly WorkspaceId[], DatabaseError>;
}

/** Where a credential stands, with the policy that applied. */
export interface CountedStanding extends LimitStanding {
  readonly policy: PolicyName;
  /** The limit a payment method would give, on the free tier's policy. */
  readonly withPaymentMethod: Option.Option<number>;
}

/** How long a holder's policy is kept before it is read again. */
export const policyLifetimeSeconds = 60;

/** How many holders' policies are kept at once. */
export const policyCacheSize = 10_000;

interface Kept {
  readonly policy: RateLimitPolicy;
  readonly until: number;
}

/**
 * The limit on how many requests a credential sends: each request is
 * counted before it is handled, refused or not, so a client that keeps
 * sending past the limit keeps being refused until its window ends. On a
 * server that does not bill, the setting is everyone's, and nothing but
 * the count is read. On one that bills, the policy is the holder's
 * (`policyOfWorkspaces`): its workspaces' standings and staff's overrides,
 * read once a minute per holder (`policyLifetimeSeconds`), so a request
 * adds no query but its count.
 */
export class RequestLimiter extends Context.Service<
  RequestLimiter,
  {
    /**
     * Counts a request for `subject` (a key, or an application acting for
     * a user) and says where it stands under its holder's policy.
     */
    readonly admit: (
      subject: string,
      holder: LimitHolder
    ) => Effect.Effect<CountedStanding, DatabaseError>;
    /** Deletes the counts no window reads any more. */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/activity/application/RequestLimiter") {
  static readonly layer = Layer.effect(
    RequestLimiter,
    Effect.gen(function* requestLimiter() {
      const counts = yield* RequestCounts;
      const setting = yield* RequestPolicy;
      const standings = yield* RequestStandings;
      const overrides = yield* RequestLimitOverrides;
      const digestOf = yield* SubjectDigest;
      const kept = yield* Ref.make(new Map<string, Kept>());

      // The holder's policy, read from its workspaces.
      const read = (holder: LimitHolder, withoutPaymentMethod: number) =>
        Effect.gen(function* readPolicy() {
          const workspaces = yield* holder.workspaces;
          const paying = yield* standings.paying(workspaces);
          const set = yield* overrides.of(workspaces);

          return policyOfWorkspaces(
            { setting: setting.limit, withoutPaymentMethod },
            workspaces.map((id) => ({
              override: Option.fromUndefinedOr(set.get(id)).pipe(
                Option.map(({ requestsPerMinute }) => requestsPerMinute)
              ),
              paying: paying.has(id),
            }))
          );
        });

      const policyOf = Effect.fn("RequestLimiter.policyOf")(function* policyOf(
        holder: LimitHolder,
        withoutPaymentMethod: number,
        now: DateTime.Utc
      ) {
        const millis = DateTime.toEpochMillis(now);
        const found = (yield* Ref.get(kept)).get(holder.key);

        if (found !== undefined && found.until > millis) {
          return found.policy;
        }

        const policy = yield* read(holder, withoutPaymentMethod);

        yield* Ref.update(kept, (cache) => {
          const next = new Map(cache);

          next.delete(holder.key);

          // The oldest go first once the cache is full.
          for (const key of next.keys()) {
            if (next.size < policyCacheSize) {
              break;
            }

            next.delete(key);
          }

          next.set(holder.key, {
            policy,
            until: millis + policyLifetimeSeconds * 1000,
          });

          return next;
        });

        return policy;
      });

      return RequestLimiter.of({
        admit: Effect.fn("RequestLimiter.admit")(
          function* admit(subject, holder) {
            const now = yield* DateTime.now;

            const policy = yield* Option.match(standings.withoutPaymentMethod, {
              onNone: () => Effect.succeed(setting),
              onSome: (withoutPaymentMethod) =>
                policyOf(holder, withoutPaymentMethod, now),
            });

            const digest = yield* digestOf(subject);
            const count = yield* counts.count(digest, windowStart(policy, now));

            return {
              ...standingOf(policy, count, now),
              policy: policy.name,
              withPaymentMethod: standings.withoutPaymentMethod.pipe(
                Option.flatMap((withoutPaymentMethod) =>
                  raisedByPaymentMethod(
                    { setting: setting.limit, withoutPaymentMethod },
                    policy
                  )
                )
              ),
            };
          }
        ),
        purge: Effect.gen(function* purge() {
          const now = yield* DateTime.now;

          return yield* counts.purge(
            DateTime.subtract(now, { seconds: countRetentionSeconds })
          );
        }),
      });
    })
  );
}
