import { Context, DateTime, Effect, Layer, Option } from "effect";

import { usageCutoff, usageDayOf } from "#billing/domain/usage-meter.ts";
import type { UsageRecord } from "#billing/domain/usage-meter.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { BillingAccounts } from "./billing-accounts.ts";
import { AccountDayStore } from "./ports/account-day-store.ts";
import { UsageLedger } from "./ports/usage-ledger.ts";
import type { WorkspaceUsageRecord } from "./ports/usage-ledger.ts";
import { UsageStates } from "./ports/usage-states.ts";
import type { WorkspaceDayState } from "./ports/usage-states.ts";
import { StartAccountDays } from "./start-account-days.ts";

/** What a snapshot did. */
export interface UsageSnapshotRun {
  /** The billing accounts whose day (today) it started. */
  readonly accountDays: number;
  /** The account-days and sent reports deleted, past their 400 days. */
  readonly accountDaysPurged: number;
  /** The day (UTC, its first instant) it wrote the states of. */
  readonly day: DateTime.Utc;
  /** The ledger's rows deleted, past their 400 days. */
  readonly purged: number;
  /** The workspaces whose states it wrote. */
  readonly workspaces: number;
}

/** How many workspaces one batch reads and writes. */
export const snapshotBatchSize = 500;

const recordsOf = (
  day: DateTime.Utc,
  state: WorkspaceDayState
): readonly WorkspaceUsageRecord[] => {
  const recorded = (
    meter: Exclude<UsageRecord["meter"], "publishedPosts">,
    quantity: number
  ): WorkspaceUsageRecord => ({
    record: { day, dimension: "", meter, quantity },
    workspaceId: state.workspaceId,
  });

  return [
    recorded("channels", state.channels),
    recorded("members", state.members),
    recorded("mediaStorage", state.mediaStorage),
    recorded("assistantRequests", state.assistantRequests),
  ];
};

/**
 * The daily snapshot of the usage ledger, for the day (UTC) that just
 * ended: every workspace that existed by its end gets the channels it
 * connected, its members and the media it stores as they stand when the
 * snapshot runs, and the day's assistant requests. It goes through the
 * workspaces by id, a batch at a time, each batch's rows written in one
 * statement, and replaces what a run before wrote, so a second run, or a
 * second server, changes nothing. A day it never ran for keeps no state:
 * none is written for it later. A workspace erased while its batch was
 * written has those rows deleted again. Each batch's workspaces are given
 * their billing account, those nobody read yet included (the sweep). Then
 * it starts today's account-days of every billing account
 * (`StartAccountDays`, on a server that bills), and, whether the snapshot
 * went through or not, it deletes the ledger's rows, the account-days and
 * the reports sent past their 400 days.
 */
export class SnapshotUsage extends Context.Service<
  SnapshotUsage,
  { readonly run: Effect.Effect<UsageSnapshotRun, DatabaseError> }
>()("peal-server/billing/application/SnapshotUsage") {
  /** The snapshot, `batchSize` workspaces at a time. */
  static readonly make = (batchSize: number) =>
    Layer.effect(
      SnapshotUsage,
      Effect.gen(function* SnapshotUsageLive() {
        const states = yield* UsageStates;
        const ledger = yield* UsageLedger;
        const accounts = yield* BillingAccounts;
        const startDays = yield* StartAccountDays;
        const accountDays = yield* AccountDayStore;

        // Every workspace's states, batch by batch: how many it wrote.
        const snapshot = Effect.fn("SnapshotUsage.snapshot")(function* snapshot(
          today: DateTime.Utc,
          day: DateTime.Utc
        ) {
          let after = Option.none<WorkspaceDayState["workspaceId"]>();
          let workspaces = 0;
          let more = true;

          while (more) {
            const request = {
              after,
              createdBefore: today,
              day,
              limit: batchSize,
            };

            const page = yield* states.page(request);

            yield* ledger.set(page.flatMap((state) => recordsOf(day, state)));

            // A workspace erased between the read and the write had its
            // rows deleted before these came: they go again.
            const still = new Set(yield* states.workspaces(request));

            yield* Effect.forEach(
              page.filter(({ workspaceId }) => !still.has(workspaceId)),
              ({ workspaceId }) => ledger.eraseWorkspace(workspaceId),
              { discard: true }
            );

            // The sweep: each workspace is given its billing account, or
            // the one it belongs on now; one that fails is left to the next
            // read, or run, and stops none of the others.
            yield* accounts.sweepIn(page.map(({ workspaceId }) => workspaceId));

            workspaces += page.length;
            more = page.length === batchSize;
            after = Option.fromUndefinedOr(page.at(-1)?.workspaceId);
          }

          return workspaces;
        });

        const run = Effect.gen(function* run() {
          const now = yield* DateTime.now;
          const today = usageDayOf(now);
          const day = DateTime.subtract(today, { days: 1 });

          // The purge runs whatever became of the snapshot, so rows past
          // their days go even on a day the states cannot be read.
          const taken = yield* snapshot(today, day).pipe(Effect.exit);

          // Accounts whose billing workspace is gone, and lapsed offers.
          yield* accounts
            .repair(batchSize)
            .pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning("Repairing billing accounts failed", cause)
              )
            );

          // Today's account-days, once every workspace has its account; a
          // failure leaves them to the day's first connection.
          const started = yield* startDays.run.pipe(
            Effect.catchCause((cause) =>
              Effect.logWarning(
                "Starting the day's account-days failed",
                cause
              ).pipe(Effect.as(0))
            )
          );

          const purged = yield* ledger.purgeBefore(usageCutoff(now));

          const accountDaysPurged = yield* accountDays.purgeBefore(
            usageCutoff(now)
          );

          const workspaces = yield* taken;

          const done: UsageSnapshotRun = {
            accountDays: started,
            accountDaysPurged,
            day,
            purged,
            workspaces,
          };

          return done;
        }).pipe(Effect.withSpan("SnapshotUsage.run"));

        return SnapshotUsage.of({ run });
      })
    );

  static readonly layer = SnapshotUsage.make(snapshotBatchSize);
}
