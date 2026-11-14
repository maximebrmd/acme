import { Context, DateTime, Effect, Layer, Option } from "effect";

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
 *   token bound to no workspace, kept once per person (`user:<id>`), with
 *   the overrides staff set for the workspaces they are a member of
 *   (`memberships`): the one of the workspace a request acts in applies,
 *   and a workspace they are not in names nothing.
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
      readonly memberships: Effect.Effect<
        readonly WorkspaceId[],
        DatabaseError
      >;
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
 * How long a policy is kept when reading it failed (once, then once
 * more): the last one known, or else the setting, as before the limit
 * read any standing, so a payer is never held to the free tier by a
 * database in trouble, and it is not asked again on every request.
 */
export const failedReadSeconds = 5;

/** How many holders' policies are kept at once. */
export const policyCacheSize = 10_000;

interface Kept {
  /** What the free tier's count is kept under: its billing account. */
  readonly account: string;
  /** A person's: the override of each workspace they are a member of. */
  readonly overrides: ReadonlyMap<WorkspaceId, RateLimitPolicy>;
  readonly policy: RateLimitPolicy;
  readonly until: number;
}

type Read = Omit<Kept, "until">;

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
 * application on it together, so more credentials send no more, and a
 * person who pays for no account once.
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

      const overridesOf = (workspaceIds: readonly WorkspaceId[]) =>
        workspaceIds.length === 0
          ? Effect.succeed(new Map<WorkspaceId, number>())
          : overrides
              .of(workspaceIds)
              .pipe(
                Effect.map(
                  (set) =>
                    new Map(
                      [...set].map(
                        ([id, { requestsPerMinute }]) =>
                          [id, requestsPerMinute] as const
                      )
                    )
                )
              );

      // A person's: their own account's standing, and the override of each
      // workspace they are a member of.
      const readPayer = Effect.fn("RequestLimiter.readPayer")(
        function* readPayer(
          holder: Extract<LimitHolder, { readonly _tag: "payer" }>,
          withoutPaymentMethod: number
        ) {
          const terms = { setting: setting.limit, withoutPaymentMethod };
          const standing = yield* standings.ofPayer(holder.userId);
          const set = yield* overridesOf(yield* holder.memberships);

          const read: Read = {
            account: Option.getOrElse(
              standing.account,
              () => `user:${holder.userId}`
            ),
            overrides: new Map(
              [...set].map(
                ([id, limit]) =>
                  [
                    id,
                    policyOfWorkspaces(terms, [
                      { override: Option.some(limit), paying: standing.paying },
                    ]),
                  ] as const
              )
            ),
            policy: policyOfWorkspaces(terms, [
              { override: Option.none(), paying: standing.paying },
            ]),
          };

          return read;
        }
      );

      // A workspace's: its billing account's standing, and its override.
      const readWorkspace = Effect.fn("RequestLimiter.readWorkspace")(
        function* readWorkspace(
          holder: Extract<LimitHolder, { readonly _tag: "workspace" }>,
          withoutPaymentMethod: number
        ) {
          const workspace = yield* holder.workspace;

          const standing = yield* Option.match(workspace, {
            onNone: () => Effect.succeed(noAccount),
            onSome: (id) =>
              standings
                .ofWorkspaces([id])
                .pipe(Effect.map((each) => each.get(id) ?? noAccount)),
          });

          const set = yield* overridesOf(Option.toArray(workspace));

          const read: Read = {
            account: Option.getOrElse(standing.account, () => holder.key),
            overrides: new Map(),
            policy: policyOfWorkspaces(
              { setting: setting.limit, withoutPaymentMethod },
              [
                {
                  override: workspace.pipe(
                    Option.flatMap((id) => Option.fromUndefinedOr(set.get(id)))
                  ),
                  paying: standing.paying,
                },
              ]
            ),
          };

          return read;
        }
      );

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

        const read =
          holder._tag === "payer"
            ? readPayer(holder, withoutPaymentMethod)
            : readWorkspace(holder, withoutPaymentMethod);

        // A read that fails is tried once more; failing again, the last
        // policy known, or else the setting, holds a few seconds, and the
        // count goes on.
        const fresh: Kept = yield* read.pipe(
          Effect.retry({ times: 1 }),
          Effect.map((done) => ({
            ...done,
            until: millis + policyLifetimeSeconds * 1000,
          })),
          Effect.catchTag("DatabaseError", () =>
            Effect.logWarning(
              "Reading a credential's standing for the rate limit failed: the last one known, or the setting, holds a few seconds"
            ).pipe(
              Effect.as({
                account: found?.account ?? holder.key,
                overrides: found?.overrides ?? new Map(),
                policy: found?.policy ?? setting,
                until: millis + failedReadSeconds * 1000,
              })
            )
          )
        );

        keep(holder.key, fresh);

        return fresh;
      });

      // The policy a request of the holder sends under: a person's in a
      // workspace of theirs with its own limit takes that one.
      const applying = (holder: LimitHolder, entry: Kept) =>
        holder._tag === "payer"
          ? Option.getOrElse(
              holder.actingIn.pipe(
                Option.flatMap((id) =>
                  Option.fromUndefinedOr(entry.overrides.get(id))
                )
              ),
              () => entry.policy
            )
          : entry.policy;

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
                  policyOf(holder, withoutPaymentMethod, now).pipe(
                    Effect.map((entry) => ({
                      account: entry.account,
                      policy: applying(holder, entry),
                    }))
                  ),
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
