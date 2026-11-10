import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { AdAccount } from "#ads/domain/ad-account.ts";
import { ended } from "#ads/domain/boost.ts";
import type { Boost } from "#ads/domain/boost.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

import { audit } from "./audit.ts";
import { AccountStore } from "./ports/account-store.ts";
import { AdNotices } from "./ports/ad-notices.ts";
import { BoostStore } from "./ports/boost-store.ts";
import { ReadModel } from "./ports/read-model.ts";

/**
 * What Peal finds out about boosts after the fact, without asking the
 * network for anything more: a boost whose end date passed has ended (the
 * network stops it at its end time), and one whose ad spent its whole
 * budget has reached it. Each is told to the owners once, in the
 * transaction that records it.
 */
export class BoostFollowUp extends Context.Service<
  BoostFollowUp,
  {
    /** Ends the boosts whose end date passed by now; says how many. */
    readonly endDue: Effect.Effect<number, DatabaseError>;
    /** Compares an account's running boosts with what its days say. */
    readonly afterSync: (
      account: AdAccount
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/ads/application/BoostFollowUp") {
  static readonly layer = Layer.effect(
    BoostFollowUp,
    Effect.gen(function* BoostFollowUpLive() {
      const boosts = yield* BoostStore;
      const accounts = yield* AccountStore;
      const readModel = yield* ReadModel;
      const notices = yield* AdNotices;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<BoostStore | Ids>();

      const end = Effect.fn("BoostFollowUp.end")(function* end(
        boost: Boost,
        now: DateTime.Utc
      ) {
        const over = ended(boost, now);
        const account = yield* accounts.get(boost.adAccountId);

        if (over._tag === "Failure" || Option.isNone(account)) {
          return false;
        }

        return yield* transaction(
          Effect.gen(function* ending() {
            // Stopped or paused meanwhile: the state it was read in no
            // longer holds, and nothing is told.
            if (!(yield* boosts.save(over.success, boost.state._tag))) {
              return false;
            }

            yield* audit({
              accountId: boost.adAccountId,
              action: "boostEnded",
              amounts: { committed: boost.committed },
              boostId: boost.id,
              currency: boost.currency,
              workspaceId: boost.workspaceId,
            }).pipe(Effect.provide(ports));
            yield* notices.boost(over.success, account.value.account, "ended");

            return true;
          })
        );
      });

      return BoostFollowUp.of({
        afterSync: Effect.fn("BoostFollowUp.afterSync")(
          function* afterSync(account) {
            for (const boost of yield* boosts.runningOn(account.id)) {
              const { adId } = boost.objects;

              // A daily budget has no end to reach: only a total one does.
              if (boost.budget._tag !== "total" || Option.isNone(adId)) {
                continue;
              }

              const spent = yield* readModel.spentBy(account.id, adId.value);

              if (spent >= boost.budget.amount) {
                yield* transaction(
                  Effect.gen(function* reaching() {
                    if (
                      yield* boosts.markBudgetReached(
                        boost.id,
                        yield* DateTime.now
                      )
                    ) {
                      yield* notices.boost(boost, account, "budgetReached");
                    }
                  })
                );
              }
            }
          }
        ),
        endDue: Effect.gen(function* endDue() {
          const now = yield* DateTime.now;
          let count = 0;

          // A page at a time until none is left: each one ended leaves
          // the listing.
          for (;;) {
            const due = yield* boosts.dueToEnd(now, 200);
            let moved = 0;

            for (const boost of due) {
              if (yield* end(boost, now)) {
                moved += 1;
              }
            }

            count += moved;

            if (due.length < 200 || moved === 0) {
              return count;
            }
          }
        }),
      });
    })
  );
}
