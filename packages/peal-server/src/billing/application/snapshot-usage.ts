import { Context, DateTime, Effect, Layer, Option } from "effect";

import { usageCutoff, usageDayOf } from "#billing/domain/usage-meter.ts";
import type { UsageRecord } from "#billing/domain/usage-meter.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { UsageLedger } from "./ports/usage-ledger.ts";
import type { WorkspaceUsageRecord } from "./ports/usage-ledger.ts";
import { UsageStates } from "./ports/usage-states.ts";
import type { WorkspaceDayState } from "./ports/usage-states.ts";

/** What a snapshot did. */
export interface UsageSnapshotRun {
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
 * none is written for it later. Then it deletes the rows past their 400
 * days.
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

        const run = Effect.gen(function* run() {
          const now = yield* DateTime.now;
          const today = usageDayOf(now);
          const day = DateTime.subtract(today, { days: 1 });
          let after = Option.none<WorkspaceDayState["workspaceId"]>();
          let workspaces = 0;
          let more = true;

          while (more) {
            const page = yield* states.page({
              after,
              createdBefore: today,
              day,
              limit: batchSize,
            });

            yield* ledger.set(page.flatMap((state) => recordsOf(day, state)));
            workspaces += page.length;
            more = page.length === batchSize;
            after = Option.fromUndefinedOr(page.at(-1)?.workspaceId);
          }

          const purged = yield* ledger.purgeBefore(usageCutoff(now));
          const done: UsageSnapshotRun = { day, purged, workspaces };

          return done;
        }).pipe(Effect.withSpan("SnapshotUsage.run"));

        return SnapshotUsage.of({ run });
      })
    );

  static readonly layer = SnapshotUsage.make(snapshotBatchSize);
}
