import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { Audience } from "#ads/domain/audience.ts";
import { Boost, noObjects, planBoost } from "#ads/domain/boost.ts";
import type {
  BoostBudget,
  BoostPlan,
  BoostPlatform,
} from "#ads/domain/boost.ts";
import { AdAccountIdSchema, BoostIdSchema } from "#ads/domain/ids.ts";
import type { InvalidBoost } from "#ads/domain/invalid-boost.ts";
import type { Currency } from "#ads/domain/money.ts";
import type { SpecialAdCategory } from "#ads/domain/special-ad-category.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";

import type { AccountSpendCapExceeded } from "./account-spend-cap-exceeded.ts";
import { AdAccountNotFound } from "./ad-account-not-found.ts";
import { AdAccountUnusable } from "./ad-account-unusable.ts";
import { audit } from "./audit.ts";
import { BoostKeyReused } from "./boost-key-reused.ts";
import { BoostNotFound } from "./boost-not-found.ts";
import { AccountStore } from "./ports/account-store.ts";
import type { AuthorizedAccount } from "./ports/account-store.ts";
import { AdNetworks } from "./ports/ad-network.ts";
import { BoostGateway } from "./ports/boost-gateway.ts";
import type { BoostAction, ControlFailure } from "./ports/boost-gateway.ts";
import { BoostJobs } from "./ports/boost-jobs.ts";
import { BoostStore } from "./ports/boost-store.ts";
import type { SpendCall } from "./ports/boost-store.ts";
import { GrantStore } from "./ports/grant-store.ts";
import { PromotablePosts } from "./ports/promotable-posts.ts";
import type { PublishedOn } from "./ports/promotable-posts.ts";
import { PostNotPromotable } from "./post-not-promotable.ts";
import type { SpendCeilingExceeded } from "./spend-ceiling-exceeded.ts";
import { ensureRoom, ensureUsable } from "./spend-guards.ts";
import type { SpendRoom } from "./spend-guards.ts";
import type { SpendingNotEnabled } from "./spending-not-enabled.ts";
import { SpendingUnavailable } from "./spending-unavailable.ts";

/** What a member or an application asks a boost to be. */
export interface BoostAsk {
  readonly accountId: string;
  readonly audience: Audience;
  readonly beneficiary: Option.Option<string>;
  readonly budget: BoostBudget;
  /** The channel the post is boosted on, among those it was published on. */
  readonly channelId: ChannelId;
  readonly currency: Currency;
  readonly endsAt: DateTime.Utc;
  readonly payer: Option.Option<string>;
  readonly postId: string;
  readonly specialAdCategory: SpecialAdCategory;
  readonly startsAt: Option.Option<DateTime.Utc>;
}

/** What a boost as asked would cost at most, and the room it has. */
export interface BoostQuote {
  readonly account: AuthorizedAccount;
  readonly plan: BoostPlan;
  readonly room: SpendRoom;
}

export type BoostRefusal =
  | AccountSpendCapExceeded
  | AdAccountNotFound
  | AdAccountUnusable
  | DatabaseError
  | InvalidBoost
  | MissingPermission
  | PostNotPromotable
  | SpendCeilingExceeded
  | SpendingNotEnabled
  | SpendingUnavailable;

const decodeAccountId = Schema.decodeUnknownOption(AdAccountIdSchema);
const decodeBoostId = Schema.decodeUnknownOption(BoostIdSchema);
const decodePostId = Schema.decodeUnknownOption(PostIdSchema);

const boostPlatforms: ReadonlySet<string> = new Set(["facebook", "instagram"]);

// Instagram accounts connected through Instagram Login cannot run ads:
// only those reached through their Page can.
const instagramThroughPage = "facebookLogin";

// Staff acting as a member: the roles already withhold every ads
// permission from them, and nothing that spends trusts that alone.
const actsForAnother = (actor: Actor) =>
  actor.subject._tag === "user" && Option.isSome(actor.subject.impersonatedBy);

const spending = (actor: Actor) =>
  actsForAnother(actor)
    ? Effect.fail(new MissingPermission({ permission: "ads:spend" }))
    : Effect.fromResult(authorize(actor, "ads:spend"));

// Whether a boost is what an ask asks for: the same key then answers it.
const sameAsk = (boost: Boost, ask: BoostAsk) =>
  boost.adAccountId === ask.accountId &&
  boost.postId === ask.postId &&
  boost.channelId === ask.channelId &&
  boost.budget._tag === ask.budget._tag &&
  boost.budget.amount === ask.budget.amount &&
  boost.currency === ask.currency &&
  DateTime.Equivalence(boost.endsAt, ask.endsAt);

/** The most boosts a listing answers at once. */
export const boostPageSize = 50;

/**
 * Boosting a published post, for someone acting in a workspace.
 *
 * | Use case            | Needs                                   |
 * | ------------------- | --------------------------------------- |
 * | `list`, `get`       | ads:read                                |
 * | `quote`, `request`  | ads:spend                               |
 * | `resume`            | ads:spend                               |
 * | `pause`, `stop`     | ads:spend or ads:manage                 |
 *
 * `request` checks everything Peal can check before anything is reserved:
 * the server offers spending, an owner allowed the account to spend, the
 * account is usable and its sign-in may run ads, the post is one the
 * workspace published on a platform Peal boosts, the boost passes the
 * domain's rules, and the monthly ceiling and the account's own cap have
 * room, counted under the account's lock with the boost's insertion. It
 * then answers the boost, `requested`, whose job makes it. The same
 * idempotency key answers the same boost, and never makes another.
 *
 * Pausing and stopping reduce spending: whoever manages ad accounts may,
 * whatever the ceiling says. They are asked twice as once.
 */
export class Boosts extends Context.Service<
  Boosts,
  {
    readonly quote: (
      actor: Actor,
      ask: BoostAsk
    ) => Effect.Effect<BoostQuote, BoostRefusal>;
    readonly request: (
      actor: Actor,
      ask: BoostAsk,
      idempotencyKey: string
    ) => Effect.Effect<Boost, BoostKeyReused | BoostRefusal>;
    readonly get: (
      actor: Actor,
      boostId: string
    ) => Effect.Effect<
      { readonly boost: Boost; readonly calls: readonly SpendCall[] },
      BoostNotFound | DatabaseError | MissingPermission
    >;
    /** The workspace's boosts, newest first, of one post when given. */
    readonly list: (
      actor: Actor,
      filter: {
        readonly before: Option.Option<string>;
        readonly postId: Option.Option<string>;
      }
    ) => Effect.Effect<readonly Boost[], DatabaseError | MissingPermission>;
    readonly control: (
      actor: Actor,
      boostId: string,
      action: BoostAction
    ) => Effect.Effect<
      Boost,
      ControlFailure | DatabaseError | MissingPermission
    >;
  }
>()("peal-server/ads/application/Boosts") {
  static readonly layer = Layer.effect(
    Boosts,
    Effect.gen(function* BoostsLive() {
      const networks = yield* AdNetworks;
      const accounts = yield* AccountStore;
      const grants = yield* GrantStore;
      const boosts = yield* BoostStore;
      const posts = yield* PromotablePosts;
      const jobs = yield* BoostJobs;
      const gateway = yield* BoostGateway;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<BoostStore | Ids>();

      const found = Effect.fn("Boosts.found")(function* found(
        actor: Actor,
        boostId: string
      ) {
        const id = decodeBoostId(boostId);

        const boost = Option.isSome(id)
          ? yield* boosts.findIn(actor.workspaceId, id.value)
          : Option.none<Boost>();

        return Option.isSome(boost) ? boost.value : yield* new BoostNotFound();
      });

      // The post as published on the channel, if Peal can boost it there.
      const promotable = Effect.fn("Boosts.promotable")(function* promotable(
        actor: Actor,
        ask: BoostAsk
      ) {
        const postId = decodePostId(ask.postId);

        const published: readonly PublishedOn[] = Option.isSome(postId)
          ? yield* posts.ofPost(actor.workspaceId, postId.value)
          : [];

        const on = published.find(
          ({ channelId }) => channelId === ask.channelId
        );

        if (on === undefined) {
          return yield* new PostNotPromotable({ reason: "notPublished" });
        }

        if (!boostPlatforms.has(on.platform)) {
          return yield* new PostNotPromotable({ reason: "platform" });
        }

        if (
          on.platform === "instagram" &&
          Option.getOrNull(on.connection) !== instagramThroughPage
        ) {
          return yield* new PostNotPromotable({ reason: "connection" });
        }

        return on;
      });

      // Everything that must hold before a boost is reserved, but the
      // room, which is counted under the account's lock.
      const prepared = Effect.fn("Boosts.prepared")(function* prepared(
        actor: Actor,
        ask: BoostAsk
      ) {
        yield* spending(actor);

        if (networks.mode !== "spend") {
          return yield* new SpendingUnavailable();
        }

        const accountId = decodeAccountId(ask.accountId);

        const authorized = Option.isSome(accountId)
          ? yield* accounts.findIn(actor.workspaceId, accountId.value)
          : Option.none<AuthorizedAccount>();

        if (Option.isNone(authorized)) {
          return yield* new AdAccountNotFound();
        }

        const account = yield* ensureUsable(authorized.value.account);
        const grant = yield* grants.findIn(actor.workspaceId, account.grantId);

        const maySpend =
          Option.isSome(grant) &&
          Option.exists(networks.for(account.network), (client) =>
            client.maySpend(grant.value.scopes)
          );

        if (!maySpend) {
          return yield* new AdAccountUnusable({ reason: "permission" });
        }

        const on = yield* promotable(actor, ask);
        const now = yield* DateTime.now;
        const plan = yield* Effect.fromResult(planBoost(ask, account, now));

        return { authorized: authorized.value, now, on, plan };
      });

      // The room the account has for the plan, as it stands now.
      const roomFor = (authorized: AuthorizedAccount, plan: BoostPlan) =>
        ensureRoom(authorized.account, authorized.authorization, {
          committed: plan.committed,
          endsAt: plan.endsAt,
          id: Option.none(),
          startsAt: plan.startsAt,
        }).pipe(Effect.provide(ports));

      return Boosts.of({
        control: Effect.fn("Boosts.control")(
          function* control(actor, boostId, action) {
            // Whoever may spend, and, to pause or stop, whoever manages ad
            // accounts: neither is staff acting as a member.
            const allowed =
              !actsForAnother(actor) &&
              (actor.permissions.includes("ads:spend") ||
                (action !== "resume" &&
                  actor.permissions.includes("ads:manage")));

            if (!allowed) {
              return yield* new MissingPermission({ permission: "ads:spend" });
            }

            const boost = yield* found(actor, boostId);

            yield* gateway.control({
              accountId: boost.adAccountId,
              action,
              boostId: boost.id,
              by: actor.subject,
            });

            return yield* found(actor, boostId);
          }
        ),
        get: Effect.fn("Boosts.get")(function* get(actor, boostId) {
          yield* Effect.fromResult(authorize(actor, "ads:read"));

          const boost = yield* found(actor, boostId);

          return { boost, calls: yield* boosts.calls(boost.id) };
        }),
        list: Effect.fn("Boosts.list")(function* list(actor, filter) {
          yield* Effect.fromResult(authorize(actor, "ads:read"));

          return yield* boosts.list(actor.workspaceId, {
            before: filter.before.pipe(Option.flatMap(decodeBoostId)),
            limit: boostPageSize,
            postId: filter.postId.pipe(Option.flatMap(decodePostId)),
          });
        }),
        quote: Effect.fn("Boosts.quote")(function* quote(actor, ask) {
          const { authorized, plan } = yield* prepared(actor, ask);

          const quoted: BoostQuote = {
            account: authorized,
            plan,
            room: yield* roomFor(authorized, plan),
          };

          return quoted;
        }),
        request: Effect.fn("Boosts.request")(
          function* request(actor, ask, idempotencyKey) {
            yield* spending(actor);

            // Asked before under this key: the same boost, never another.
            const earlier = yield* boosts.byKey(
              actor.workspaceId,
              idempotencyKey
            );

            if (Option.isSome(earlier)) {
              return sameAsk(earlier.value, ask)
                ? earlier.value
                : yield* new BoostKeyReused();
            }

            const { authorized, now, on, plan } = yield* prepared(actor, ask);
            const { account } = authorized;

            const boost = new Boost({
              activatedAt: Option.none(),
              adAccountId: account.id,
              audience: ask.audience,
              beneficiary: ask.beneficiary,
              budget: ask.budget,
              channelId: on.channelId,
              committed: plan.committed,
              createdAt: now,
              currency: account.currency,
              endsAt: plan.endsAt,
              id: yield* newId(BoostIdSchema).pipe(Effect.provide(ports)),
              idempotencyKey,
              objective: "engagement",
              objects: noObjects,
              payer: ask.payer,
              // Checked by `promotable`: one of the platforms Peal boosts on.
              platform: Schema.decodeUnknownSync(Boost.fields.platform)(
                on.platform
              ) satisfies BoostPlatform,
              postId: on.postId,
              requestedBy: Option.some(actor.subject),
              startsAt: plan.startsAt,
              state: { _tag: "requested" },
              targetId: on.targetId,
              updatedAt: now,
              workspaceId: actor.workspaceId,
            });

            // Under the account's spending lock, in one transaction: the
            // room is counted, the boost stored and its job started
            // together, so of two boosts asked at once for the last of the
            // ceiling, one finds no room.
            return yield* accounts.spendingOn(
              account.id,
              transaction(
                Effect.gen(function* reserving() {
                  const current = yield* accounts.get(account.id);

                  if (Option.isNone(current)) {
                    return yield* new AdAccountNotFound();
                  }

                  // The same key sent twice at once: the second, which
                  // waited for the lock, finds the boost the first made.
                  const made = yield* boosts.byKey(
                    actor.workspaceId,
                    idempotencyKey
                  );

                  if (Option.isSome(made)) {
                    return sameAsk(made.value, ask)
                      ? made.value
                      : yield* new BoostKeyReused();
                  }

                  yield* roomFor(current.value, plan);
                  yield* boosts.insert(boost);
                  yield* audit({
                    accountId: account.id,
                    action: "boostRequested",
                    amounts: {
                      budget: boost.budget.amount,
                      committed: boost.committed,
                    },
                    boostId: boost.id,
                    by: actor.subject,
                    currency: boost.currency,
                    workspaceId: boost.workspaceId,
                  }).pipe(Effect.provide(ports));
                  yield* jobs.start(boost.id);

                  return boost;
                })
              )
            );
          }
        ),
      });
    })
  );
}
