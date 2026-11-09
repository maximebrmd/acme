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
  readonly members: number;
  /** The posts scheduled to go out this month (UTC). */
  readonly scheduledPosts: PeriodCount;
}

/** Counts what each context holds for a workspace, against its plan. */
export class WorkspaceUsage extends Context.Service<
  WorkspaceUsage,
  {
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Usage, DatabaseError>;
  }
>()("peal-server/billing/application/WorkspaceUsage") {}
