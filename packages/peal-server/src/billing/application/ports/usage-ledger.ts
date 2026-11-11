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
