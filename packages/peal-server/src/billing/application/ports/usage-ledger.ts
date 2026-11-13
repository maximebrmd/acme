import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { UsagePeriod, UsageRecord } from "#billing/domain/usage-meter.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's count to keep. */
export interface WorkspaceUsageRecord {
  readonly record: UsageRecord;
  readonly workspaceId: WorkspaceId;
}

/**
 * Each workspace's usage, day by day (UTC), meter by meter (see
 * `usage-meter.ts`). Counts and ids only.
 */
export class UsageLedger extends Context.Service<
  UsageLedger,
  {
    /**
     * Adds the record's quantity to the day's count, in the caller's
     * transaction, so it commits with the fact it counts or not at all.
     * Records added at the same time all count.
     */
    readonly add: (
      entry: WorkspaceUsageRecord
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Takes the record's quantity back from the day's count, never below
     * zero, in the caller's transaction: a counter's unit given back.
     */
    readonly takeBack: (
      entry: WorkspaceUsageRecord
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Replaces each day's count with the record's, in one statement: the
     * end-of-day states, which a second run writes again unchanged.
     */
    readonly set: (
      entries: readonly WorkspaceUsageRecord[]
    ) => Effect.Effect<void, DatabaseError>;
    /** The workspace's records of the period's days, oldest first. */
    readonly ofWorkspace: (
      workspaceId: WorkspaceId,
      period: UsagePeriod
    ) => Effect.Effect<readonly UsageRecord[], DatabaseError>;
    /**
     * The records of these workspaces over the period's days, in one read,
     * in no order: nothing is asked for none.
     */
    readonly ofWorkspaces: (
      workspaceIds: readonly WorkspaceId[],
      period: UsagePeriod
    ) => Effect.Effect<readonly WorkspaceUsageRecord[], DatabaseError>;
    /**
     * The posts that went out in these workspaces over the period's days,
     * added up by day and platform, oldest first, and the billing
     * meters' counters by day: nothing is asked for none.
     */
    readonly postsAcross: (
      workspaceIds: readonly WorkspaceId[],
      period: UsagePeriod
    ) => Effect.Effect<readonly UsageRecord[], DatabaseError>;
    /**
     * Every record the ledger keeps of the workspace, oldest day first, for
     * its export.
     */
    readonly allOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly UsageRecord[], DatabaseError>;
    /** Deletes the workspace's counts, in the caller's transaction. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Deletes every count of a day before `day`, and answers how many it
     * deleted.
     */
    readonly purgeBefore: (
      day: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/billing/application/UsageLedger") {}
