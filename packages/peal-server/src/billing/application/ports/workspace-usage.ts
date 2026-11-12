import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A count that starts again from zero at `resetsAt`. */
export interface PeriodCount {
  readonly resetsAt: DateTime.Utc;
  readonly used: number;
}

/** How much of each limit a workspace uses now. */
export interface Usage {
  /** The writing assistant's requests today (UTC). */
  readonly assistantRequests: PeriodCount;
  readonly channels: number;
  /** The bytes of media stored, uploads in progress included. */
  readonly mediaStorage: number;
  readonly members: number;
  /** The posts scheduled to go out this month (UTC). */
  readonly scheduledPosts: PeriodCount;
}

/**
 * What a workspace holds of the limits that decide whether it must reduce:
 * its channels, counted as `Usage.channels` is, and its members.
 */
export interface Seated {
  readonly channels: number;
  readonly members: number;
}

/** Counts what each context holds for a workspace, against its plan. */
export class WorkspaceUsage extends Context.Service<
  WorkspaceUsage,
  {
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Usage, DatabaseError>;
    /**
     * The channels and members of each of these workspaces, every one of
     * them, as `of` counts them: one read a context, whatever their
     * number, holding nothing.
     */
    readonly heldIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, Seated>, DatabaseError>;
  }
>()("peal-server/billing/application/WorkspaceUsage") {}
