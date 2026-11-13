import { Context, DateTime, Effect, Layer, Metric, Option } from "effect";

import type {
  BillingAccount,
  BillingAccountId,
} from "#billing/domain/billing-account.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { AccountDays } from "./account-days.ts";
import { AccountChannels } from "./ports/account-channels.ts";
import type { PeakRaise } from "./ports/account-day-store.ts";
import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { BillingMode } from "./ports/billing-mode.ts";

/** How many billing accounts one batch reads and raises. */
export const startBatchSize = 500;

/** The billing accounts the last run of the day's start went through. */
export const accountDaysAccounts = Metric.gauge(
  "peal.billing.account_days.accounts",
  {
    description:
      "Billing accounts the last start of the day's account-days went through",
  }
);

/** Those of them whose day it started: their batch went through. */
export const accountDaysStarted = Metric.gauge(
  "peal.billing.account_days.started",
  {
    description:
      "Billing accounts whose day the last start of the day's account-days started",
  }
);

/**
 * The last UTC day whose start went through for every billing account, as
 * its first second since the epoch: an alert rule reads it, so a day not
 * started by 02:00 UTC is heard of (peal-account-days-unstarted).
 */
export const accountDaysStartedDay = Metric.gauge(
  "peal.billing.account_days.started_day",
  {
    description:
      "The last UTC day whose account-days were started for every billing account, in seconds since the epoch",
  }
);

/** What a start of the day did. */
export interface DayStart {
  /** The billing accounts it went through. */
  readonly accounts: number;
  /** Those whose day it raised: the others' batch failed. */
  readonly started: number;
}

const secondsOf = (day: DateTime.Utc) =>
  Math.floor(DateTime.toEpochMillis(day) / 1000);

/**
 * Starts the day (UTC) of every billing account that holds accounts: its
 * billing workspace's row for today raised to the channels its workspaces
 * connected now, reported for those that pay, as a connection would. It
 * goes through the accounts by id, a batch at a time: three reads (the
 * accounts, their workspaces, their channels) and one transaction a
 * batch, whatever their number. A batch that fails is logged and left,
 * and the run goes on with the next; raising keeps the higher count, so
 * the next run (hourly, and the snapshot's) changes nothing more and
 * starts what was left. The gauges say how many it went through, how many
 * it started, and the last day started whole. It also counts and raises
 * one account's pool, for a subscription recorded or a workspace moved in
 * during the day. A server that does not bill starts nothing.
 */
export class StartAccountDays extends Context.Service<
  StartAccountDays,
  {
    readonly run: Effect.Effect<DayStart, DatabaseError>;
    /** The accounts connected across the pool `holder` bills. */
    readonly pooledOf: (
      holder: WorkspaceId
    ) => Effect.Effect<number, DatabaseError>;
    /** Raises the account's day to its pool's accounts now. */
    readonly raiseAccount: (
      accountId: BillingAccountId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/StartAccountDays") {
  static readonly make = (batchSize: number) =>
    Layer.effect(
      StartAccountDays,
      Effect.gen(function* StartAccountDaysLive() {
        const { enabled } = yield* BillingMode;
        const store = yield* BillingAccountStore;
        const channels = yield* AccountChannels;
        const days = yield* AccountDays;

        // On a server that bills, no day is started whole until a run says
        // so: the day before is the last one known.
        if (enabled) {
          const today = DateTime.startOf(yield* DateTime.now, "day");

          yield* Metric.update(
            accountDaysStartedDay,
            secondsOf(DateTime.subtract(today, { days: 1 }))
          );
        }

        // The accounts each account's workspaces connected themselves.
        const countsOf = Effect.fn("StartAccountDays.countsOf")(
          function* countsOf(page: readonly BillingAccount[]) {
            const held = yield* store.workspacesOfEach(
              page.map(({ id }) => id)
            );

            const counts = yield* channels.ownIn([
              ...new Set([...held.values()].flat()),
            ]);

            return page.flatMap((account): readonly PeakRaise[] => {
              let count = 0;

              for (const workspaceId of held.get(account.id) ?? []) {
                count += counts.get(workspaceId) ?? 0;
              }

              return count > 0 ? [{ count, holder: account.holder }] : [];
            });
          }
        );

        const run = Effect.gen(function* run() {
          if (!enabled) {
            const nothing: DayStart = { accounts: 0, started: 0 };

            return nothing;
          }

          const now = yield* DateTime.now;
          let after = Option.none<BillingAccountId>();
          let more = true;
          let accounts = 0;
          let started = 0;

          while (more) {
            const page = yield* store.page(after, batchSize);

            const raisedBatch = yield* countsOf(page).pipe(
              Effect.flatMap((raises) => days.raise(now, raises)),
              Effect.as(true),
              Effect.catchCause((cause) =>
                Effect.logWarning(
                  "Starting a batch of the day's account-days failed: the next run starts it",
                  cause
                ).pipe(
                  Effect.annotateLogs({ accounts: page.length }),
                  Effect.as(false)
                )
              )
            );

            accounts += page.length;
            started += raisedBatch ? page.length : 0;
            more = page.length === batchSize;
            after = Option.fromUndefinedOr(page.at(-1)?.id);
          }

          yield* Metric.update(accountDaysAccounts, accounts);
          yield* Metric.update(accountDaysStarted, started);

          if (started === accounts) {
            yield* Metric.update(
              accountDaysStartedDay,
              secondsOf(DateTime.startOf(now, "day"))
            );
          }

          const done: DayStart = { accounts, started };

          return done;
        }).pipe(Effect.withSpan("StartAccountDays.run"));

        const pooledOf = Effect.fn("StartAccountDays.pooledOf")(
          function* pooledOf(holder: WorkspaceId) {
            const account = yield* store.accountOf(holder);

            if (Option.isNone(account)) {
              const own = yield* channels.ownIn([holder]);

              return own.get(holder) ?? 0;
            }

            const [raise] = yield* countsOf([account.value]);

            return raise?.count ?? 0;
          }
        );

        const raiseAccount = Effect.fn("StartAccountDays.raiseAccount")(
          function* raiseAccount(accountId: BillingAccountId) {
            if (!enabled) {
              return;
            }

            const account = yield* store.get(accountId);

            if (Option.isNone(account)) {
              return;
            }

            yield* days.raise(
              yield* DateTime.now,
              yield* countsOf([account.value])
            );
          }
        );

        return StartAccountDays.of({ pooledOf, raiseAccount, run });
      })
    );

  static readonly layer = StartAccountDays.make(startBatchSize);
}
