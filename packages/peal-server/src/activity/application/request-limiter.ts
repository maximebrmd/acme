import { Context, DateTime, Effect, Layer, Option } from "effect";

import {
  countRetentionSeconds,
  freePolicy,
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
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { RequestCounts } from "./request-counts.ts";
import { RequestLimitOverrides } from "./request-limit-overrides.ts";
import { RequestPolicy } from "./request-policy.ts";
import { RequestStandings } from "./request-standings.ts";
import type { AccountStanding } from "./request-standings.ts";
import { SubjectDigest } from "./subject-digest.ts";

/**
 * Whose standing decides a credential's limit, read only when the cache
 * does not hold it (`key` names it there):
 *
 * - `workspace`: the billing account of the workspace a key, a partner key
 *   or a bound token acts for (none when it has none: the free tier);
 * - `payer`: a person's own billing account (the one they pay for), for a
 *   token bound to no workspace, and the override staff set for the
 *   workspace it acts in now, if any.
 */
export type LimitHolder =
  | {
      readonly _tag: "workspace";
      readonly key: string;
      readonly workspace: Effect.Effect<
        Option.Option<WorkspaceId>,
        DatabaseError
      >;
    }
  | {
      readonly _tag: "payer";
      readonly actingIn: Option.Option<WorkspaceId>;
      readonly key: string;
      readonly userId: UserId;
    };

/** Where a credential stands, with the policy that applied. */
export interface CountedStanding extends LimitStanding {
  readonly policy: PolicyName;
  /** The limit a payment method would give, on the free tier's policy. */
  readonly withPaymentMethod: Option.Option<number>;
}

/** How long a holder's policy is kept before it is read again. */
export const policyLifetimeSeconds = 60;

/**
 * How long a policy is kept when reading it failed: the last one known,
 * or the free tier's, so a database in trouble is not asked again on
 * every request.
 */
export const failedReadSeconds = 5;

/** How many holders' policies are kept at once. */
export const policyCacheSize = 10_000;

interface Kept {
  /** What the free tier's count is kept under: its billing account. */
  readonly account: string;
  readonly policy: RateLimitPolicy;
  readonly until: number;
}

const noAccount: AccountStanding = { account: Option.none(), paying: false };

/**
 * The limit on how many requests a credential sends: each request is
 * counted before it is handled, refused or not, so a client that keeps
 * sending past the limit keeps being refused until its window ends. On a
 * server that does not bill, the setting is everyone's, counted per
 * credential, and nothing but the count is read. On one that bills, the
 * policy is the holder's (`policyOfWorkspaces`), read once a minute per
 * holder (`policyLifetimeSeconds`): a billing account that pays, or a
 * workspace staff gave its own limit, is counted per credential; the free
 * tier is counted per billing account, every key, partner key and
 * application on it together, so more credentials send no more.
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
      const kept = new Map<string, Kept>();

      // The workspace a holder acts in, and its billing account's standing.
      const standingOf_ = (
        holder: LimitHolder
      ): Effect.Effect<
        readonly [Option.Option<WorkspaceId>, AccountStanding],
        DatabaseError
      > =>
        holder._tag === "payer"
          ? standings
              .ofPayer(holder.userId)
              .pipe(Effect.map((standing) => [holder.actingIn, standing]))
          : holder.workspace.pipe(
              Effect.flatMap((found) =>
                Option.match(found, {
                  onNone: () => Effect.succeed([found, noAccount] as const),
                  onSome: (id) =>
                    standings
                      .ofWorkspaces([id])
                      .pipe(
                        Effect.map(
                          (each) => [found, each.get(id) ?? noAccount] as const
                        )
                      ),
                })
              )
            );

      // What the holder's policy is, and whose free tier it counts on.
      const read = Effect.fn("RequestLimiter.read")(function* read(
        holder: LimitHolder,
        withoutPaymentMethod: number
      ) {
        const [workspace, standing] = yield* standingOf_(holder);

        const override = yield* Option.match(workspace, {
          onNone: () => Effect.succeedNone,
          onSome: (id) =>
            overrides
              .of([id])
              .pipe(
                Effect.map((set) =>
                  Option.fromUndefinedOr(set.get(id)).pipe(
                    Option.map(({ requestsPerMinute }) => requestsPerMinute)
                  )
                )
              ),
        });

        return {
          account: Option.getOrElse(standing.account, () => holder.key),
          policy: policyOfWorkspaces(
            { setting: setting.limit, withoutPaymentMethod },
            [{ override, paying: standing.paying }]
          ),
        };
      });

      const keep = (key: string, entry: Kept) => {
        kept.delete(key);

        // The oldest go first once the cache is full.
        for (const old of kept.keys()) {
          if (kept.size < policyCacheSize) {
            break;
          }

          kept.delete(old);
        }

        kept.set(key, entry);
      };

      const policyOf = Effect.fn("RequestLimiter.policyOf")(function* policyOf(
        holder: LimitHolder,
        withoutPaymentMethod: number,
        now: DateTime.Utc
      ) {
        const millis = DateTime.toEpochMillis(now);
        const found = kept.get(holder.key);

        if (found !== undefined && found.until > millis) {
          return found;
        }

        // A read that fails keeps the last policy known, or the free
        // tier's, a few seconds, and fails the count no more.
        const fresh: Kept = yield* read(holder, withoutPaymentMethod).pipe(
          Effect.map((done) => ({
            ...done,
            until: millis + policyLifetimeSeconds * 1000,
          })),
          Effect.catchTag("DatabaseError", () =>
            Effect.logWarning(
              "Reading a credential's standing for the rate limit failed: the last one known, or the free tier's, holds a few seconds"
            ).pipe(
              Effect.as({
                account: found?.account ?? holder.key,
                policy:
                  found?.policy ??
                  freePolicy({ setting: setting.limit, withoutPaymentMethod }),
                until: millis + failedReadSeconds * 1000,
              })
            )
          )
        );

        keep(holder.key, fresh);

        return fresh;
      });

      return RequestLimiter.of({
        admit: Effect.fn("RequestLimiter.admit")(
          function* admit(subject, holder) {
            const now = yield* DateTime.now;

            const { account, policy } = yield* Option.match(
              standings.withoutPaymentMethod,
              {
                onNone: () =>
                  Effect.succeed({ account: subject, policy: setting }),
                onSome: (withoutPaymentMethod) =>
                  policyOf(holder, withoutPaymentMethod, now),
              }
            );

            // The free tier is one count per billing account.
            const counted =
              policy.name === "free" ? `free:${account}` : subject;
            const digest = yield* digestOf(counted);
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
