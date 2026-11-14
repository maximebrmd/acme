import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Result,
} from "effect";

import type { AccountSnapshot } from "#ads/domain/account-snapshot.ts";
import type { AdAccount } from "#ads/domain/ad-account.ts";
import type { AdAccountId } from "#ads/domain/ids.ts";
import { firstSyncDays, resyncDays } from "#ads/domain/insight-retention.ts";
import type { Ids } from "#shared/application/ids.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { addDays, localDateOf } from "#shared/domain/wall-clock.ts";

import { BoostFollowUp } from "./boost-follow-up.ts";
import { AccountStore } from "./ports/account-store.ts";
import type { SyncOutcome } from "./ports/account-syncer.ts";
import { ActiveAdMonths } from "./ports/active-ad-months.ts";
import { AdNetworks } from "./ports/ad-network.ts";
import type { ReadFailure } from "./ports/ad-network.ts";
import { AdNotices } from "./ports/ad-notices.ts";
import { BoostStore } from "./ports/boost-store.ts";
import { GrantSecrets } from "./ports/grant-secrets.ts";
import { GrantStore } from "./ports/grant-store.ts";
import { PromotablePosts } from "./ports/promotable-posts.ts";
import { ReadModel } from "./ports/read-model.ts";

/** How often an account is read when nothing holds it back. */
export const syncInterval = Duration.hours(1);

// The least and the most an account is put off when its network asks to
// slow down, whatever wait it gave.
const shortestHalt = Duration.minutes(15);
const longestHalt = Duration.hours(6);

const clamp = (wait: Duration.Duration) =>
  Duration.max(shortestHalt, Duration.min(longestHalt, wait));

/**
 * Reads one ad account from its network and saves what it found: the
 * account's own state, its campaigns, ad sets and ads, and each ad's days
 * (90 days the first time, the last 7 after, as networks correct recent
 * days). It then says when the account is next read: in an hour, or once
 * the wait its network asked for is over.
 *
 * It runs inside the account's gate, one call at a time. A token the
 * network refuses marks the sign-in, whose person is told once; the
 * account is read again when they sign in again.
 */
export class SyncAccount extends Context.Service<
  SyncAccount,
  {
    readonly run: (accountId: AdAccountId) => Effect.Effect<SyncOutcome>;
  }
>()("peal-server/ads/application/SyncAccount") {
  static readonly layer = Layer.effect(
    SyncAccount,
    Effect.gen(function* SyncAccountLive() {
      const networks = yield* AdNetworks;
      const accounts = yield* AccountStore;
      const grants = yield* GrantStore;
      const secrets = yield* GrantSecrets;
      const readModel = yield* ReadModel;
      const posts = yield* PromotablePosts;
      const notices = yield* AdNotices;
      const followUp = yield* BoostFollowUp;
      const ports = yield* Effect.context<BoostStore | Ids>();
      const activeMonths = yield* ActiveAdMonths;
      const boostStore = yield* BoostStore;
      const meters = yield* MeteredUsage;
      const { transaction } = yield* TransactionRunner;

      // Counts each ad seen delivering or in review once a month, as one
      // of the billing account's managed ads, and answers the snapshot to
      // keep: once the meter pauses (no payment method, the month's
      // allowance used), the ads it could not count are not recorded and
      // their numbers stop updating. Nothing a network runs is touched.
      // Counts `ids` as managed ads of the month, as many as the meter
      // grants, in one claim: answers how many, from the first.
      const counted = Effect.fn("SyncAccount.counted")(function* counted(
        workspaceId: AdAccount["workspaceId"],
        month: DateTime.Utc,
        ids: readonly string[]
      ) {
        const recordFirst = (units: number) =>
          units === 0
            ? Effect.succeed(0)
            : transaction(
                meters
                  .claim(workspaceId, "managedAds", units)
                  .pipe(
                    Effect.andThen(
                      Effect.forEach(
                        ids.slice(0, units),
                        (id) => activeMonths.record(workspaceId, month, id),
                        { discard: true }
                      )
                    ),
                    Effect.as(units)
                  )
              );

        return yield* recordFirst(ids.length).pipe(
          Effect.catchTag("AllowanceReached", ({ allowed, used }) =>
            recordFirst(Math.max(0, Math.min(ids.length, allowed - used))).pipe(
              Effect.catchTag("AllowanceReached", () => Effect.succeed(0))
            )
          )
        );
      });

      // Counts each ad seen delivering or in review once a month, as one
      // of the billing account's managed ads, and answers the snapshot to
      // keep. The ads of the account's own boosts come first, and are
      // tracked even past the allowance; once the meter refuses (no
      // payment method, or a legacy plan, at the month's allowance) the
      // other ads not counted yet are not tracked: their days are not
      // saved, while those already counted keep updating. Nothing a
      // network runs is touched. Where no billing counts (a server that
      // does not bill), nothing is recorded.
      const metered = Effect.fn("SyncAccount.metered")(function* metered<
        S extends AccountSnapshot,
      >(account: AdAccount, taken: S, now: DateTime.Utc) {
        const { workspaceId } = account;

        if (Option.isNone(yield* meters.state(workspaceId, "managedAds"))) {
          return taken;
        }

        const month = DateTime.startOf(now, "month");

        const running = taken.ads
          .filter(({ status }) => status === "active" || status === "inReview")
          .map(({ externalId }) => externalId);

        const owned = new Set<string>(
          (yield* boostStore.runningOn(account.id)).flatMap(({ objects }) =>
            Option.toArray(objects.adId)
          )
        );

        const unseen = yield* activeMonths.unseen(workspaceId, month, running);

        const ordered = [
          ...unseen.filter((id) => owned.has(id)),
          ...unseen.filter((id) => !owned.has(id)),
        ];

        const granted = yield* counted(workspaceId, month, ordered);
        const left = ordered.slice(granted);

        // The ads of Peal's own boosts are always tracked.
        yield* Effect.forEach(
          left.filter((id) => owned.has(id)),
          (id) => activeMonths.record(workspaceId, month, id),
          { discard: true }
        );

        const untracked = new Set(left.filter((id) => !owned.has(id)));

        if (untracked.size === 0) {
          return taken;
        }

        yield* Effect.logInfo(
          "A billing account's managed ads are paused: new ads past the month's allowance are not tracked"
        ).pipe(
          Effect.annotateLogs({
            accountId: account.id,
            untracked: untracked.size,
          })
        );

        const kept: S = {
          ...taken,
          insights: taken.insights.filter(
            ({ adExternalId }) => !untracked.has(adExternalId)
          ),
        };

        return kept;
      });

      const putOff = (account: AdAccount, wait: Duration.Duration) =>
        DateTime.now.pipe(
          Effect.flatMap((now) =>
            accounts.scheduleSync(
              account.id,
              DateTime.addDuration(now, wait),
              Option.none()
            )
          )
        );

      // What a failed read means for the account's next read.
      const failedRead = Effect.fn("SyncAccount.failedRead")(
        function* failedRead(account: AdAccount, failure: ReadFailure) {
          if (failure._tag === "TokenRejected") {
            const stored = yield* grants.token(account.grantId);

            if (
              Option.isSome(stored) &&
              (yield* grants.markRejected(account.grantId, yield* DateTime.now))
            ) {
              yield* notices.reconnectNeeded(stored.value.grant);
            }

            return "reconnectNeeded" as const;
          }

          if (failure._tag === "AdNetworkRefused") {
            yield* Effect.logWarning("An ad network refused a sync").pipe(
              Effect.annotateLogs({
                accountId: account.id,
                code: failure.code,
              })
            );
          }

          yield* putOff(
            account,
            failure._tag === "RateLimited" && failure.retryAfter !== undefined
              ? clamp(failure.retryAfter)
              : syncInterval
          );

          return "postponed" as const;
        }
      );

      const read = Effect.fn("SyncAccount.read")(function* read(
        account: AdAccount
      ) {
        const client = networks.for(account.network);
        const stored = yield* grants.token(account.grantId);

        if (Option.isNone(client) || Option.isNone(stored)) {
          return "gone" as const;
        }

        const token = yield* secrets
          .open(stored.value.token, account.grantId)
          .pipe(Effect.option);

        // A token the keyring no longer opens works no more than one the
        // network refuses.
        if (Option.isNone(token)) {
          return yield* failedRead(account, new TokenRejected());
        }

        const now = yield* DateTime.now;
        const today = localDateOf(now, account.timeZone);

        const snapshot = yield* client.value
          .snapshot(token.value, {
            currency: account.currency,
            externalId: account.externalId,
            since: addDays(
              today,
              -(Option.isNone(account.syncedAt) ? firstSyncDays : resyncDays)
            ),
            timeZone: account.timeZone,
            until: today,
          })
          .pipe(Effect.result);

        if (Result.isFailure(snapshot)) {
          return yield* failedRead(account, snapshot.failure);
        }

        const taken = yield* metered(account, snapshot.success, now);

        const promoted = taken.ads.flatMap((ad) => [
          ...Option.toArray(ad.promotedPagePostId),
          ...Option.toArray(ad.promotedInstagramMediaId),
        ]);

        yield* readModel.save({
          account,
          complete: taken.complete,
          matched: yield* posts.matching(account.workspaceId, promoted),
          now,
          snapshot: taken,
        });

        if (Option.isSome(taken.facts)) {
          yield* accounts.saveFacts(account.id, taken.facts.value);
        }

        // What the account's own boosts spent, now that its days are in.
        yield* followUp.afterSync(account).pipe(Effect.provide(ports));

        const halted = taken.haltedFor.pipe(Option.map(clamp));

        yield* accounts.scheduleSync(
          account.id,
          DateTime.addDuration(
            now,
            Option.getOrElse(halted, () => syncInterval)
          ),
          // A sync cut short reads the same days again: the account is
          // read whole only when nothing held it back.
          Option.isSome(halted) ? Option.none() : Option.some(now)
        );

        return Option.isSome(halted)
          ? ("halted" as const)
          : ("synced" as const);
      });

      return SyncAccount.of({
        run: (accountId) =>
          accounts.get(accountId).pipe(
            Effect.flatMap((found) =>
              Option.match(found, {
                onNone: () => Effect.succeed<SyncOutcome>("gone"),
                onSome: ({ account }) => read(account),
              })
            ),
            // The database failing leaves the account due: the next run
            // reads it.
            Effect.catchTag("DatabaseError", (failure) =>
              Effect.logWarning(
                "An ad account's sync could not be saved",
                failure
              ).pipe(
                Effect.annotateLogs({ accountId }),
                Effect.as<SyncOutcome>("unread")
              )
            ),
            Effect.withSpan("SyncAccount.run")
          ),
      });
    })
  );
}
