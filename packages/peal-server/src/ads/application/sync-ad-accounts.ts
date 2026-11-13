import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Metric,
  Option,
  Ref,
} from "effect";

import type { AdAccount } from "#ads/domain/ad-account.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { AccountStore } from "./ports/account-store.ts";
import type { SyncCursor } from "./ports/account-store.ts";
import { AccountSyncer } from "./ports/account-syncer.ts";
import type { SyncOutcome } from "./ports/account-syncer.ts";

/** How the hourly sync is paced. */
export interface SyncPace {
  /** How many accounts are read at the same time, each through its gate. */
  readonly accountConcurrency: number;
  /** How many due accounts are listed at once. */
  readonly accountsPerPage: number;
  /**
   * How long after its scheduled time a run still starts reading an
   * account: it stops before the next run starts.
   */
  readonly budget: Duration.Duration;
}

/**
 * The pace of the sync: 4 accounts at once, few on purpose, as networks
 * hold an ad account that is called in bursts, and 50 minutes a run.
 */
export const SyncPaceRef = Context.Reference<SyncPace>(
  "peal-server/ads/application/SyncPace",
  {
    defaultValue: () => ({
      accountConcurrency: 4,
      accountsPerPage: 200,
      budget: Duration.minutes(50),
    }),
  }
);

/** How long the last run of the sync took, in seconds. */
export const syncDuration = Metric.gauge("peal.ads.sync.duration", {
  description: "How long the last sync of ad accounts took, in seconds",
});

/** How many accounts were still due when the last run ended. */
export const syncLeft = Metric.gauge("peal.ads.sync.left", {
  description:
    "Ad accounts still due for a sync when the last run ended: put off by their network, or not reached in time",
});

/** The runs that stopped at their budget with accounts still due. */
export const syncsUnfinished = Metric.counter("peal.ads.sync.unfinished", {
  description:
    "Syncs of ad accounts that stopped at their budget with accounts still due",
  incremental: true,
});

/** What a run of the sync did. */
export interface SyncReport extends Readonly<Record<SyncOutcome, number>> {
  /** The accounts still due when it ended. */
  readonly left: number;
}

const noneYet: Record<SyncOutcome, number> = {
  gone: 0,
  halted: 0,
  postponed: 0,
  reconnectNeeded: 0,
  synced: 0,
  unread: 0,
};

/**
 * The hourly sync of every connected ad account that is due: those that
 * waited longest first, a page at a time by cursor, never with a cap, a
 * few at once, each through its gate. A run stops starting reads at its
 * budget, says what it left, and the next one starts after where it
 * stopped (in this process), so accounts whose network hangs never take
 * every run.
 */
export class SyncAdAccounts extends Context.Service<
  SyncAdAccounts,
  {
    /** Reads what is due at `at`, the run's scheduled time. */
    readonly run: (
      at: DateTime.Utc
    ) => Effect.Effect<SyncReport, DatabaseError>;
  }
>()("peal-server/ads/application/SyncAdAccounts") {
  static readonly layer = Layer.effect(
    SyncAdAccounts,
    Effect.gen(function* SyncAdAccountsLive() {
      const accounts = yield* AccountStore;
      const syncer = yield* AccountSyncer;
      const pace = yield* SyncPaceRef;
      const stoppedAt = yield* Ref.make(Option.none<SyncCursor>());

      // Reads a page of due accounts, a few at once, and stops starting
      // reads at the deadline: answers whether it ran out of time, and the
      // last account it read.
      const readPage = Effect.fn("SyncAdAccounts.readPage")(function* readPage(
        due: readonly {
          readonly account: AdAccount;
          readonly dueAt: DateTime.Utc;
        }[],
        deadline: DateTime.Utc,
        tally: Ref.Ref<Record<SyncOutcome, number>>
      ) {
        const reached = yield* Ref.make(Option.none<SyncCursor>());
        const late = yield* Ref.make(false);

        yield* Effect.forEach(
          due,
          ({ account, dueAt }) =>
            Effect.gen(function* syncing() {
              if (
                (yield* Ref.get(late)) ||
                DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
              ) {
                yield* Ref.set(late, true);

                return;
              }

              const outcome = yield* syncer.sync(account.id);

              yield* Ref.update(tally, (counts) => ({
                ...counts,
                [outcome]: counts[outcome] + 1,
              }));
              yield* Ref.set(
                reached,
                Option.some({ accountId: account.id, dueAt })
              );
            }),
          { concurrency: pace.accountConcurrency, discard: true }
        );

        return { late: yield* Ref.get(late), reached: yield* Ref.get(reached) };
      });

      // Reads the accounts due after `from`, up to `until` when given;
      // answers where it stopped, if it ran out of time.
      const leg = Effect.fn("SyncAdAccounts.leg")(function* leg(
        at: DateTime.Utc,
        deadline: DateTime.Utc,
        from: Option.Option<SyncCursor>,
        until: Option.Option<SyncCursor>,
        tally: Ref.Ref<Record<SyncOutcome, number>>
      ) {
        let after = from;

        for (;;) {
          if (DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)) {
            return Option.some(after);
          }

          const listed = yield* accounts.dueForSync(
            at,
            pace.accountsPerPage,
            after
          );

          const due = Option.match(until, {
            onNone: () => listed,
            onSome: (end) =>
              listed.filter(
                ({ account, dueAt }) =>
                  DateTime.isLessThan(dueAt, end.dueAt) ||
                  (DateTime.Equivalence(dueAt, end.dueAt) &&
                    account.id <= end.accountId)
              ),
          });

          const page = yield* readPage(due, deadline, tally);

          if (page.late) {
            return Option.some(
              Option.isSome(page.reached) ? page.reached : after
            );
          }

          after = Option.map(Option.fromUndefinedOr(listed.at(-1)), (last) => ({
            accountId: last.account.id,
            dueAt: last.dueAt,
          }));

          if (
            listed.length < pace.accountsPerPage ||
            due.length < listed.length
          ) {
            return Option.none<Option.Option<SyncCursor>>();
          }
        }
      });

      const run = Effect.fn("SyncAdAccounts.run")(function* run(
        at: DateTime.Utc
      ) {
        const startedAt = yield* DateTime.now;
        const deadline = DateTime.addDuration(at, pace.budget);
        const tally = yield* Ref.make(noneYet);
        const from = yield* Ref.get(stoppedAt);

        // Those after where the last run stopped, then, from the one that
        // waited longest, those up to there.
        const rest = yield* leg(at, deadline, from, Option.none(), tally);

        const stopped =
          Option.isSome(rest) || Option.isNone(from)
            ? rest
            : yield* leg(at, deadline, Option.none(), from, tally);

        yield* Ref.set(stoppedAt, Option.flatten(stopped));

        const left = yield* accounts.countDueForSync(at);
        const took = DateTime.distance(startedAt, yield* DateTime.now);
        const report: SyncReport = { ...(yield* Ref.get(tally)), left };

        yield* Metric.update(syncDuration, Duration.toSeconds(took));
        yield* Metric.update(syncLeft, left);

        if (Option.isSome(stopped)) {
          yield* Metric.update(syncsUnfinished, 1);
          yield* Effect.logWarning(
            "The sync of ad accounts could not finish before the next run: the accounts left are read by the runs that follow, later than their schedule says"
          ).pipe(
            Effect.annotateLogs({
              ...report,
              seconds: Duration.toSeconds(took),
            })
          );
        }

        return report;
      });

      return SyncAdAccounts.of({ run });
    })
  );
}
