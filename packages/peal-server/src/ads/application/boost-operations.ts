import { Context, DateTime, Effect, Layer, Option, Result } from "effect";
import type { Redacted } from "effect";

import type { AdAccount } from "#ads/domain/ad-account.ts";
import type { AuditAction } from "#ads/domain/audit-action.ts";
import {
  activated,
  failed,
  networkNameOf,
  paused,
  stopped,
  unconfirmed,
  withObjects,
} from "#ads/domain/boost.ts";
import type {
  Boost,
  BoostFailureReason,
  BoostObjects,
} from "#ads/domain/boost.ts";
import { SpendCallIdSchema } from "#ads/domain/ids.ts";
import type { BoostId, NetworkObjectId } from "#ads/domain/ids.ts";
import { InvalidBoostTransition } from "#ads/domain/invalid-boost-transition.ts";
import type { SpendStep } from "#ads/domain/spend-step.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { ActorSubject } from "#shared/domain/access.ts";

import { AdAccountUnusable } from "./ad-account-unusable.ts";
import { AdNetworkUnavailable } from "./ad-network-unavailable.ts";
import { audit } from "./audit.ts";
import type { Audited } from "./audit.ts";
import { BoostNotFound } from "./boost-not-found.ts";
import { BoostStateConflict } from "./boost-state-conflict.ts";
import { AccountStore } from "./ports/account-store.ts";
import type { AuthorizedAccount } from "./ports/account-store.ts";
import { AdNetworks } from "./ports/ad-network.ts";
import type {
  AdNetworkClient,
  LookUp,
  NewObject,
  WriteFailure,
} from "./ports/ad-network.ts";
import { AdNotices } from "./ports/ad-notices.ts";
import type { BoostNews } from "./ports/ad-notices.ts";
import type {
  BoostAction,
  ControlFailure,
  ControlRequest,
  PlaceResult,
} from "./ports/boost-gateway.ts";
import { BoostStore } from "./ports/boost-store.ts";
import { GrantSecrets } from "./ports/grant-secrets.ts";
import { GrantStore } from "./ports/grant-store.ts";
import { PromotablePosts } from "./ports/promotable-posts.ts";
import type { PublishedOn } from "./ports/promotable-posts.ts";
import { ensureRoom, ensureUsable } from "./spend-guards.ts";
import { SpendingUnavailable } from "./spending-unavailable.ts";

// What a boost's requests are sent with.
interface Reach {
  readonly account: AdAccount;
  readonly authorized: AuthorizedAccount;
  readonly client: AdNetworkClient;
  readonly token: Redacted.Redacted;
}

// How a step of a placement ended: go on, come back later, or the boost
// is settled (failed, or left unconfirmed).
type StepEnd<A> =
  | { readonly _tag: "done"; readonly value: A }
  | { readonly _tag: "retry" }
  | { readonly _tag: "settled" };

const done = <A>(value: A): StepEnd<A> => ({ _tag: "done", value });
const retry: StepEnd<never> = { _tag: "retry" };
const settled: StepEnd<never> = { _tag: "settled" };

// What the last check before the campaign runs found against it: a reason
// to fail the boost, or `gone`, settled or erased elsewhere meanwhile.
type LastCheck = BoostFailureReason | "gone";

const unavailable = () => Effect.fail(new AdNetworkUnavailable({}));

// Where a boost already stands when an action asked again has nothing
// left to do.
const alreadyDone = {
  pause: "paused",
  resume: "active",
  stop: "stopped",
} as const;

// The boost after the change, if it may be made from where it stands.
const changed = (
  boost: Boost,
  action: BoostAction,
  now: DateTime.Utc,
  account: AdAccount
): Result.Result<Boost, InvalidBoostTransition> => {
  if (action === "pause") {
    return paused(boost, now);
  }

  if (action === "stop") {
    return stopped(boost, now, account.timeZone);
  }

  return boost.state._tag === "paused"
    ? activated(boost, now)
    : Result.fail(
        new InvalidBoostTransition({ action, from: boost.state._tag })
      );
};

// What a member's change is called, in the audit trail and to listeners.
const memberChanges = {
  pause: { action: "boostPaused", change: "paused" },
  resume: { action: "boostResumed", change: "resumed" },
  stop: { action: "boostStopped", change: "stopped" },
} as const;

const logged =
  (boostId: BoostId) =>
  (failure: DatabaseError): Effect.Effect<PlaceResult> =>
    Effect.logWarning(
      "A boost's placement could not be read or recorded",
      failure
    ).pipe(Effect.annotateLogs({ boostId }), Effect.as("retry"));

/**
 * The requests of a boost, as its ad account's gate runs them, one at a
 * time per account. Nothing here is called by a handler: members go
 * through `Boosts`, and the durable job through `BoostGateway`.
 *
 * Every request that changes something is journalled, and the row
 * committed, before it leaves. A request whose answer was lost is never
 * sent again as it is: the object is looked up first, by the name Peal
 * chose for it, and only one the network says it does not hold is made
 * again. Everything is made paused, and turned on from the innermost out:
 * the campaign last, which is the one request that starts spending.
 * Before it, the ceiling, the owner's decision and the account's state
 * are checked once more. When that last request's answer is lost and the
 * network cannot say whether the campaign runs, the boost is left
 * `unconfirmed`, still counted, for a person to settle.
 */
export class BoostOperations extends Context.Service<
  BoostOperations,
  {
    /** Makes, or goes on making, a requested boost. */
    readonly place: (boostId: BoostId) => Effect.Effect<PlaceResult>;
    /** Fails a boost its job gave up on, if it never ran. */
    readonly giveUp: (boostId: BoostId) => Effect.Effect<void>;
    /** Pauses, resumes or stops a boost. */
    readonly control: (
      request: ControlRequest
    ) => Effect.Effect<void, ControlFailure>;
  }
>()("peal-server/ads/application/BoostOperations") {
  static readonly layer = Layer.effect(
    BoostOperations,
    Effect.gen(function* BoostOperationsLive() {
      const networks = yield* AdNetworks;
      const accounts = yield* AccountStore;
      const boosts = yield* BoostStore;
      const grants = yield* GrantStore;
      const secrets = yield* GrantSecrets;
      const posts = yield* PromotablePosts;
      const notices = yield* AdNotices;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<BoostStore | Ids>();

      // The account, its network's client and its token, if all three are
      // there and work.
      const reachOf = Effect.fn("BoostOperations.reachOf")(function* reachOf(
        boost: Boost
      ) {
        const authorized = yield* accounts.get(boost.adAccountId);

        if (Option.isNone(authorized)) {
          return Option.none<Reach>();
        }

        const { account } = authorized.value;
        const client = networks.for(account.network);
        const stored = yield* grants.token(account.grantId);

        if (Option.isNone(client) || Option.isNone(stored)) {
          return Option.none<Reach>();
        }

        const token = yield* secrets
          .open(stored.value.token, account.grantId)
          .pipe(Effect.option);

        return token.pipe(
          Option.map((opened): Reach => ({
            account,
            authorized: authorized.value,
            client: client.value,
            token: opened,
          }))
        );
      });

      // The network refused the grant's token: its person is told once.
      const tokenRejected = Effect.fn("BoostOperations.tokenRejected")(
        function* tokenRejected(account: AdAccount) {
          const stored = yield* grants.token(account.grantId);

          if (
            Option.isSome(stored) &&
            (yield* grants.markRejected(account.grantId, yield* DateTime.now))
          ) {
            yield* notices.reconnectNeeded(stored.value.grant);
          }
        }
      );

      // Records what happened to a boost, and tells the workspace, in one
      // transaction with the boost's new state. Answers false, and tells
      // nothing, when the boost no longer stands where it was read.
      const settle = Effect.fn("BoostOperations.settle")(function* settle(
        account: AdAccount,
        before: Boost,
        after: Boost,
        told: {
          readonly action: AuditAction;
          readonly by?: ActorSubject;
          readonly change?: "paused" | "resumed" | "stopped";
          readonly news?: BoostNews;
        }
      ) {
        return yield* transaction(
          Effect.gen(function* settling() {
            if (!(yield* boosts.save(after, before.state._tag))) {
              return false;
            }

            const entry: Audited = {
              accountId: account.id,
              action: told.action,
              amounts: { committed: after.committed },
              boostId: after.id,
              currency: after.currency,
              workspaceId: after.workspaceId,
            };

            yield* audit(
              told.by === undefined ? entry : { ...entry, by: told.by }
            ).pipe(Effect.provide(ports));

            if (told.news !== undefined) {
              yield* notices.boost(after, account, told.news);
            }

            if (told.change !== undefined) {
              yield* notices.boostChanged(after, account, told.change);
            }

            return true;
          })
        );
      });

      const fail = Effect.fn("BoostOperations.fail")(function* fail(
        account: AdAccount,
        boost: Boost,
        reason: BoostFailureReason,
        code: Option.Option<string> = Option.none()
      ) {
        const now = yield* DateTime.now;
        const over = failed(boost, reason, code, now);

        if (Result.isSuccess(over)) {
          yield* settle(account, boost, over.success, {
            action: "boostFailed",
            news: "failed",
          });
        }
      });

      // Journals a request, sends it, and records how it ended.
      const journalled = Effect.fn("BoostOperations.journalled")(
        function* journalled<A>(
          boost: Boost,
          step: SpendStep,
          request: Effect.Effect<A, WriteFailure>,
          objectOf: (value: A) => Option.Option<NetworkObjectId>
        ) {
          const callId = yield* newId(SpendCallIdSchema).pipe(
            Effect.provide(ports)
          );

          // Committed before the request leaves: a run cut short finds it.
          yield* boosts.beginCall({
            boostId: boost.id,
            id: callId,
            startedAt: yield* DateTime.now,
            step,
            workspaceId: boost.workspaceId,
          });

          const result = yield* request.pipe(Effect.result);

          const finish = (
            outcome: "absent" | "done" | "found" | "refused" | "unknown",
            objectId: Option.Option<NetworkObjectId>,
            networkCode: Option.Option<string> = Option.none()
          ) =>
            DateTime.now.pipe(
              Effect.flatMap((finishedAt) =>
                boosts.finishCall(callId, {
                  finishedAt,
                  networkCode,
                  objectId,
                  outcome,
                })
              )
            );

          if (Result.isSuccess(result)) {
            yield* finish("done", objectOf(result.success));
          } else if (result.failure._tag !== "OutcomeUnknown") {
            yield* finish(
              "refused",
              Option.none(),
              result.failure._tag === "AdNetworkRefused"
                ? Option.some(result.failure.code)
                : Option.some(result.failure._tag)
            );
          }

          return { finish, result };
        }
      );

      // What a refusal of the network means for a boost being placed.
      const refused = Effect.fn("BoostOperations.refused")(function* refused(
        reach: Reach,
        boost: Boost,
        failure: Exclude<WriteFailure, { readonly _tag: "OutcomeUnknown" }>
      ) {
        if (
          failure._tag === "RateLimited" ||
          failure._tag === "PlatformUnavailable"
        ) {
          return retry;
        }

        if (failure._tag === "TokenRejected") {
          yield* tokenRejected(reach.account);
          yield* fail(reach.account, boost, "reconnectNeeded");

          return settled;
        }

        const reasons = {
          accountUnusable: "accountUnusable",
          budgetTooLow: "budgetTooLow",
          other: "refused",
          permission: "permissionMissing",
          postNotPromotable: "postNotPromotable",
        } as const;

        yield* fail(
          reach.account,
          boost,
          reasons[failure.kind],
          Option.some(failure.code)
        );

        return settled;
      });

      // Makes one of the boost's objects, unless it is already made: one
      // an earlier run may have made is looked up before anything is sent.
      const made = Effect.fn("BoostOperations.made")(function* made(
        reach: Reach,
        boost: Boost,
        step: SpendStep,
        object: NewObject,
        held: Option.Option<NetworkObjectId>,
        keep: (id: NetworkObjectId) => BoostObjects
      ) {
        if (Option.isSome(held)) {
          return done({ boost, id: held.value });
        }

        const { account, client, token } = reach;

        const kept = Effect.fn("BoostOperations.kept")(function* kept(
          id: NetworkObjectId
        ) {
          const now = yield* DateTime.now;
          const next = withObjects(boost, keep(id), now);

          // Settled elsewhere meanwhile: the object stays paused, and
          // nothing more is made or turned on.
          if (!(yield* boosts.save(next, boost.state._tag))) {
            return settled;
          }

          return done({ boost: next, id });
        });

        const earlier = (yield* boosts.calls(boost.id)).findLast(
          (call) => call.step === step
        );

        // An earlier request that was not refused may have made it.
        const mayExist =
          earlier !== undefined && !Option.contains(earlier.outcome, "refused");

        if (mayExist) {
          const looked = yield* client.find(token, account.externalId, object);

          if (looked._tag === "found") {
            return yield* kept(looked.value);
          }

          if (looked._tag === "unknown") {
            return retry;
          }
        }

        const { finish, result } = yield* journalled(
          boost,
          step,
          client.create(token, account.externalId, object),
          (id: NetworkObjectId) => Option.some(id)
        );

        if (Result.isSuccess(result)) {
          return yield* kept(result.success);
        }

        if (result.failure._tag !== "OutcomeUnknown") {
          return yield* refused(reach, boost, result.failure);
        }

        const looked = yield* client.find(token, account.externalId, object);

        if (looked._tag === "found") {
          yield* finish("found", Option.some(looked.value));

          return yield* kept(looked.value);
        }

        // Absent now may be made a moment later: the next attempt looks
        // again before it makes anything.
        yield* finish(looked._tag, Option.none());

        return retry;
      });

      // Tells the network to run an object, or to pause it, and reads the
      // state back when the answer is lost.
      const set = Effect.fn("BoostOperations.set")(function* set(
        reach: Reach,
        boost: Boost,
        step: SpendStep,
        objectId: NetworkObjectId,
        running: boolean
      ) {
        const { finish, result } = yield* journalled(
          boost,
          step,
          reach.client.setRunning(reach.token, objectId, running),
          () => Option.some(objectId)
        );

        if (Result.isSuccess(result)) {
          return { _tag: "set" } as const;
        }

        if (result.failure._tag !== "OutcomeUnknown") {
          return { _tag: "refused", failure: result.failure } as const;
        }

        const looked: LookUp<boolean> = yield* reach.client.isRunning(
          reach.token,
          objectId
        );

        if (looked._tag === "found" && looked.value === running) {
          yield* finish("found", Option.some(objectId));

          return { _tag: "set" } as const;
        }

        yield* finish(
          looked._tag === "found" ? "absent" : "unknown",
          Option.some(objectId)
        );

        return looked._tag === "found"
          ? ({ _tag: "notSet" } as const)
          : ({ _tag: "unknown" } as const);
      });

      // The post the boost shows, as its platform knows it now.
      const promoted = Effect.fn("BoostOperations.promoted")(function* promoted(
        boost: Boost
      ) {
        const published = yield* posts.ofPost(boost.workspaceId, boost.postId);

        return Option.fromUndefinedOr(
          published.find(({ targetId }) => targetId === boost.targetId)
        );
      });

      // What must hold of the account and the post before anything is
      // made: read from the network now, not as last synced.
      const ready = Effect.fn("BoostOperations.ready")(function* ready(
        reach: Reach,
        boost: Boost
      ) {
        const { account, client, token } = reach;

        if (networks.mode !== "spend") {
          yield* fail(account, boost, "spendingUnavailable");

          return settled;
        }

        const facts = yield* client
          .account(token, account.externalId)
          .pipe(Effect.result);

        if (Result.isFailure(facts)) {
          return yield* refused(reach, boost, facts.failure);
        }

        yield* accounts.saveFacts(account.id, facts.success);

        if (facts.success.currency !== boost.currency) {
          yield* fail(account, boost, "currencyMismatch");

          return settled;
        }

        if (facts.success.status !== "active") {
          yield* fail(account, boost, "accountUnusable");

          return settled;
        }

        const post = yield* promoted(boost);

        if (Option.isNone(post)) {
          yield* fail(account, boost, "postNotPromotable");

          return settled;
        }

        return done(post.value);
      });

      // The campaign, its ad set and its ad, each paused, each made once.
      const objectsOf = Effect.fn("BoostOperations.objectsOf")(
        function* objectsOf(reach: Reach, boost: Boost, post: PublishedOn) {
          const name = networkNameOf(boost.id);

          const campaign = yield* made(
            reach,
            boost,
            "createCampaign",
            { _tag: "campaign", name },
            boost.objects.campaignId,
            (id) => ({ ...boost.objects, campaignId: Option.some(id) })
          );

          if (campaign._tag !== "done") {
            return campaign;
          }

          const adSet = yield* made(
            reach,
            campaign.value.boost,
            "createAdSet",
            {
              _tag: "adSet",
              audience: boost.audience,
              beneficiary: boost.beneficiary,
              budget: boost.budget,
              campaignId: campaign.value.id,
              endsAt: boost.endsAt,
              name,
              payer: boost.payer,
              startsAt: boost.startsAt,
            },
            campaign.value.boost.objects.adSetId,
            (id) => ({
              ...campaign.value.boost.objects,
              adSetId: Option.some(id),
            })
          );

          if (adSet._tag !== "done") {
            return adSet;
          }

          const ad = yield* made(
            reach,
            adSet.value.boost,
            "createAd",
            {
              _tag: "ad",
              adSetId: adSet.value.id,
              name,
              post: {
                accountId: post.accountId,
                platform: boost.platform,
                platformPostId: post.platformPostId,
              },
            },
            adSet.value.boost.objects.adId,
            (id) => ({ ...adSet.value.boost.objects, adId: Option.some(id) })
          );

          if (ad._tag !== "done") {
            return ad;
          }

          return done({
            adId: ad.value.id,
            adSetId: adSet.value.id,
            boost: ad.value.boost,
            campaignId: campaign.value.id,
          });
        }
      );

      // Why the boost may not run after all, if anything says so now:
      // read under the account's spending lock, with the owner's decision
      // and the ceiling as they are, and the cap as the network just gave
      // it.
      const lastCheck = (account: AdAccount, whole: Boost) =>
        accounts.spendingOn(
          account.id,
          Effect.gen(function* checking() {
            // The boost as it stands now: failed, stopped or erased since,
            // by the job giving up, a member, a workspace's erasure or a
            // platform's deletion request, it starts nothing, as nothing
            // would count what it spends.
            const now = yield* boosts.get(whole.id);

            if (
              Option.isNone(now) ||
              now.value.state._tag !== "requested" ||
              now.value.committed !== whole.committed
            ) {
              return Option.some<LastCheck>("gone");
            }

            const current = yield* accounts.get(account.id);

            if (Option.isNone(current)) {
              return Option.some<LastCheck>("accountUnusable");
            }

            return yield* ensureRoom(
              current.value.account,
              current.value.authorization,
              {
                committed: whole.committed,
                endsAt: whole.endsAt,
                id: Option.some(whole.id),
                startsAt: whole.startsAt,
              }
            ).pipe(
              Effect.provide(ports),
              Effect.as(Option.none<LastCheck>()),
              Effect.catchTags({
                AccountSpendCapExceeded: () =>
                  Effect.succeed(Option.some<LastCheck>("accountSpendCap")),
                SpendCeilingExceeded: () =>
                  Effect.succeed(Option.some<LastCheck>("ceilingExceeded")),
                SpendingNotEnabled: () =>
                  Effect.succeed(Option.some<LastCheck>("spendingOff")),
              })
            );
          })
        );

      // The one request that starts spending, and what its answer means.
      const started = Effect.fn("BoostOperations.started")(function* started(
        reach: Reach,
        whole: Boost,
        campaignId: NetworkObjectId
      ) {
        const { account } = reach;

        const turned = yield* set(
          reach,
          whole,
          "activateCampaign",
          campaignId,
          true
        );

        const now = yield* DateTime.now;

        if (turned._tag === "refused") {
          return yield* refused(reach, whole, turned.failure);
        }

        // The network holds it paused: nothing spends, and the next
        // attempt checks everything again.
        if (turned._tag === "notSet") {
          return retry;
        }

        // Running, or, when the network cannot say, maybe running: then
        // it is counted, told, and left for a person to settle.
        const next =
          turned._tag === "set"
            ? activated(whole, now)
            : unconfirmed(whole, now);

        if (Result.isSuccess(next)) {
          const saved = yield* settle(
            account,
            whole,
            next.success,
            turned._tag === "set"
              ? { action: "boostStarted", news: "started" }
              : { action: "boostUnconfirmed", news: "unconfirmed" }
          );

          // The boost was settled or erased in the moment the campaign was
          // turned on: nothing would count what it spends, so it is told
          // to stop at once.
          if (!saved) {
            yield* Effect.logError(
              "A boost's campaign was turned on as the boost was settled elsewhere: it is paused again"
            ).pipe(Effect.annotateLogs({ boostId: whole.id }));
            yield* reach.client
              .setRunning(reach.token, campaignId, false)
              .pipe(
                Effect.catch((error) =>
                  Effect.logError(
                    "A boost's campaign could not be paused again: pause it at the network",
                    error._tag
                  ).pipe(Effect.annotateLogs({ boostId: whole.id }))
                )
              );
          }
        }

        return settled;
      });

      const placed = Effect.fn("BoostOperations.placed")(function* placed(
        reach: Reach,
        boost: Boost
      ) {
        const post = yield* ready(reach, boost);

        if (post._tag !== "done") {
          return post;
        }

        const objects = yield* objectsOf(reach, boost, post.value);

        if (objects._tag !== "done") {
          return objects;
        }

        const { adId, adSetId, boost: whole, campaignId } = objects.value;

        // The ad, then its ad set: neither runs while the campaign is
        // paused, so either may be sent again.
        for (const [step, objectId] of [
          ["activateAd", adId],
          ["activateAdSet", adSetId],
        ] as const) {
          const turned = yield* set(reach, whole, step, objectId, true);

          if (turned._tag === "refused") {
            return yield* refused(reach, whole, turned.failure);
          }

          if (turned._tag !== "set") {
            return retry;
          }
        }

        const refusal = yield* lastCheck(reach.account, whole);

        // Settled elsewhere meanwhile: nothing more to do here.
        if (Option.contains(refusal, "gone")) {
          return settled;
        }

        if (Option.isSome(refusal) && refusal.value !== "gone") {
          yield* fail(reach.account, whole, refusal.value);

          return settled;
        }

        return yield* started(reach, whole, campaignId);
      });

      const placing = Effect.fn("BoostOperations.placing")(function* placing(
        boost: Boost
      ) {
        const reach = yield* reachOf(boost);

        if (Option.isSome(reach)) {
          const end = yield* placed(reach.value, boost);

          return end._tag === "retry"
            ? ("retry" as const)
            : ("settled" as const);
        }

        // The sign-in is gone, or its token no longer opens.
        const account = yield* accounts.get(boost.adAccountId);

        if (Option.isSome(account)) {
          yield* tokenRejected(account.value.account);
          yield* fail(account.value.account, boost, "reconnectNeeded");
        }

        return "settled" as const;
      });

      // What resuming a boost takes, as resuming spends: a server that
      // offers spending, a run not yet over, an account that can run ads
      // now, and room under the ceiling as it is, counting what the boost
      // already commits.
      const resumable = Effect.fn("BoostOperations.resumable")(
        function* resumable(reach: Reach, boost: Boost, now: DateTime.Utc) {
          const { account } = reach;

          if (networks.mode !== "spend") {
            return yield* new SpendingUnavailable();
          }

          if (DateTime.isGreaterThanOrEqualTo(now, boost.endsAt)) {
            return yield* new BoostStateConflict({ state: boost.state._tag });
          }

          const facts = yield* reach.client
            .account(reach.token, account.externalId)
            .pipe(Effect.catch(unavailable));

          yield* accounts.saveFacts(account.id, facts);

          const current = yield* accounts.get(account.id);

          if (Option.isNone(current)) {
            return yield* new BoostNotFound();
          }

          yield* ensureUsable(current.value.account);

          return yield* accounts.spendingOn(
            account.id,
            ensureRoom(current.value.account, current.value.authorization, {
              committed: boost.committed,
              endsAt: boost.endsAt,
              id: Option.some(boost.id),
              startsAt: boost.startsAt,
            }).pipe(Effect.provide(ports))
          );
        }
      );

      // Why the network did not make a change, as a member is told.
      const notMade = Effect.fn("BoostOperations.notMade")(function* notMade(
        account: AdAccount,
        failure: Exclude<WriteFailure, { readonly _tag: "OutcomeUnknown" }>
      ) {
        if (failure._tag === "TokenRejected") {
          yield* tokenRejected(account);

          return yield* new AdAccountUnusable({ reason: "reconnectNeeded" });
        }

        return yield* new AdNetworkUnavailable(
          failure._tag === "RateLimited" && failure.retryAfter !== undefined
            ? { retryAfter: failure.retryAfter }
            : {}
        );
      });

      // Sends the change to the network, and records it once confirmed.
      const sent = Effect.fn("BoostOperations.sent")(function* sent(
        request: ControlRequest,
        boost: Boost,
        after: Boost,
        campaignId: NetworkObjectId,
        now: DateTime.Utc
      ) {
        const reach = yield* reachOf(boost);

        if (Option.isNone(reach)) {
          return yield* new AdAccountUnusable({ reason: "reconnectNeeded" });
        }

        const { account } = reach.value;
        const resuming = request.action === "resume";

        if (resuming) {
          yield* resumable(reach.value, boost, now);
        }

        const turned = yield* set(
          reach.value,
          boost,
          resuming ? "resume" : "pause",
          campaignId,
          resuming
        );

        if (turned._tag === "refused") {
          return yield* notMade(account, turned.failure);
        }

        if (turned._tag === "set") {
          yield* settle(account, boost, after, {
            ...memberChanges[request.action],
            by: request.by,
          });

          return true;
        }

        // Told to run again, and the network cannot say whether it does:
        // counted, told, and left for a person to settle.
        if (turned._tag === "unknown" && resuming) {
          const unknown = unconfirmed(boost, now);

          if (Result.isSuccess(unknown)) {
            yield* settle(account, boost, unknown.success, {
              action: "boostUnconfirmed",
              by: request.by,
              news: "unconfirmed",
            });
          }
        }

        // The network did not take it, or cannot say: the boost stays
        // where it was, still counted, and the member asks again.
        return yield* new AdNetworkUnavailable({});
      });

      const controlling = Effect.fn("BoostOperations.controlling")(
        function* controlling(request: ControlRequest) {
          const found = yield* boosts.get(request.boostId);

          const boost = found.pipe(
            Option.filter(
              ({ adAccountId }) => adAccountId === request.accountId
            )
          );

          const authorized = Option.isSome(boost)
            ? yield* accounts.get(boost.value.adAccountId)
            : Option.none<AuthorizedAccount>();

          if (Option.isNone(boost) || Option.isNone(authorized)) {
            return yield* new BoostNotFound();
          }

          const { state } = boost.value;

          // Asked twice, done once.
          if (state._tag === alreadyDone[request.action]) {
            return true;
          }

          const { account } = authorized.value;
          const { campaignId } = boost.value.objects;
          const now = yield* DateTime.now;
          const after = changed(boost.value, request.action, now, account);

          if (Result.isFailure(after)) {
            return yield* new BoostStateConflict({ state: state._tag });
          }

          if (Option.isSome(campaignId)) {
            return yield* sent(
              request,
              boost.value,
              after.success,
              campaignId.value,
              now
            );
          }

          // Nothing was made yet: there is nothing to tell the network,
          // and only stopping makes sense.
          return request.action === "stop"
            ? yield* settle(account, boost.value, after.success, {
                ...memberChanges.stop,
                by: request.by,
              })
            : yield* new BoostStateConflict({ state: state._tag });
        }
      );

      // Gives up on a boost that could not be placed. Its campaign, if one
      // was made, is told to stay paused first: a request to run it whose
      // answer was lost must not take effect after Peal stopped counting
      // it. If the network cannot confirm that, the boost is left
      // unconfirmed rather than failed.
      const givingUp = Effect.fn("BoostOperations.givingUp")(function* givingUp(
        boostId: BoostId
      ) {
        const found = yield* boosts.get(boostId);

        if (Option.isNone(found) || found.value.state._tag !== "requested") {
          return;
        }

        const boost = found.value;
        const authorized = yield* accounts.get(boost.adAccountId);

        if (Option.isNone(authorized)) {
          return;
        }

        const { account } = authorized.value;
        const { campaignId } = boost.objects;
        const reach = yield* reachOf(boost);

        const tried = (yield* boosts.calls(boost.id)).some(
          ({ step }) => step === "activateCampaign"
        );

        if (tried && Option.isSome(campaignId)) {
          const held = Option.isSome(reach)
            ? yield* set(reach.value, boost, "pause", campaignId.value, false)
            : ({ _tag: "unknown" } as const);

          if (held._tag !== "set") {
            const unknown = unconfirmed(boost, yield* DateTime.now);

            if (Result.isSuccess(unknown)) {
              yield* settle(account, boost, unknown.success, {
                action: "boostUnconfirmed",
                news: "unconfirmed",
              });
            }

            return;
          }
        }

        yield* fail(account, boost, "networkUnavailable");
      });

      return BoostOperations.of({
        control: (request) =>
          controlling(request).pipe(
            Effect.catchTag("DatabaseError", (failure) =>
              Effect.logWarning(
                "A change to a boost could not be read or recorded",
                failure
              ).pipe(
                Effect.annotateLogs({ boostId: request.boostId }),
                Effect.andThen(unavailable())
              )
            ),
            Effect.withSpan("BoostOperations.control")
          ),
        giveUp: (boostId) =>
          givingUp(boostId).pipe(
            Effect.catchTag("DatabaseError", (failure) =>
              Effect.logError(
                "A boost given up on could not be failed",
                failure
              )
            ),
            Effect.withSpan("BoostOperations.giveUp")
          ),
        place: (boostId) =>
          boosts.get(boostId).pipe(
            Effect.flatMap((found) =>
              Option.isSome(found) && found.value.state._tag === "requested"
                ? placing(found.value)
                : Effect.succeed<PlaceResult>("settled")
            ),
            Effect.catchTag("DatabaseError", logged(boostId)),
            Effect.withSpan("BoostOperations.place")
          ),
      });
    })
  );
}
