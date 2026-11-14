import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { SpendGroup } from "#billing/domain/meter-claims.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Meter } from "#shared/domain/meter.ts";

/**
 * A holder's meter in a month: the units used, those past the allowance
 * reported to Stripe, and how many meter events the row made.
 */
export interface MeterRow {
  readonly events: number;
  /** Units given back for a failure this month. */
  readonly forgiven: number;
  readonly meter: Meter;
  readonly reported: number;
  readonly used: number;
}

/** A billing account's ceiling on a group, as a member set it. */
export interface SpendCeiling {
  readonly cents: number;
  readonly group: SpendGroup;
  readonly setAt: DateTime.Utc;
}

/**
 * The billing accounts' meters by month, on their holders, and the
 * ceilings they set, in the billing schema.
 */
export class MeterUsageStore extends Context.Service<
  MeterUsageStore,
  {
    /**
     * The holder's rows of these meters in the month, those of `written`
     * written at 0 where missing (all of them by default), held to the end
     * of the caller's transaction, in the meters' order: claims of one
     * holder's meters take turns.
     */
    readonly hold: (
      holder: WorkspaceId,
      month: DateTime.Utc,
      meters: readonly Meter[],
      written?: readonly Meter[]
    ) => Effect.Effect<readonly MeterRow[], DatabaseError>;
    /** Writes the rows `hold` answered, changed, in the caller's transaction. */
    readonly save: (
      holder: WorkspaceId,
      month: DateTime.Utc,
      rows: readonly MeterRow[]
    ) => Effect.Effect<void, DatabaseError>;
    /** The holder's rows of the month, holding nothing. */
    readonly ofMonth: (
      holder: WorkspaceId,
      month: DateTime.Utc
    ) => Effect.Effect<readonly MeterRow[], DatabaseError>;
    /**
     * The holder's rows of the months from `from` to before `before`,
     * holding nothing: what the cap on an unpaid balance adds up.
     */
    readonly between: (
      holder: WorkspaceId,
      from: DateTime.Utc,
      before: DateTime.Utc
    ) => Effect.Effect<
      readonly (MeterRow & { readonly month: DateTime.Utc })[],
      DatabaseError
    >;
    /** The ceilings the holder set. */
    readonly ceilings: (
      holder: WorkspaceId
    ) => Effect.Effect<readonly SpendCeiling[], DatabaseError>;
    /** Sets the holder's ceiling on its group, replacing the one before. */
    readonly setCeiling: (
      holder: WorkspaceId,
      ceiling: SpendCeiling
    ) => Effect.Effect<void, DatabaseError>;
    /** Deletes the months before `cutoff`: how many rows. */
    readonly purgeBefore: (
      cutoff: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /** Deletes the workspace's rows and ceilings, in the caller's transaction. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** Every month and ceiling the workspace holds, for its export. */
    readonly allOf: (workspaceId: WorkspaceId) => Effect.Effect<
      {
        readonly ceilings: readonly SpendCeiling[];
        readonly months: readonly (MeterRow & {
          readonly month: DateTime.Utc;
        })[];
      },
      DatabaseError
    >;
  }
>()("peal-server/billing/application/MeterUsageStore") {}
