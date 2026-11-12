import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** The query behind `InboxWaiting`, every workspace's id in one parameter. */
export class InboxWaitingReads extends Context.Service<
  InboxWaitingReads,
  {
    readonly unansweredIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DatabaseError>;
  }
>()("peal-server/engagement/application/InboxWaitingReads") {}
