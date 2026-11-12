import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { InboxWaitingReads } from "./inbox-waiting-reads.ts";

/**
 * How many threads of each workspace have a comment waiting for an answer,
 * as the inbox's `unanswered` filter finds them, for the view across a
 * person's workspaces. A count of threads, never a comment's text or
 * author, so it checks no permission: the caller decided which workspaces
 * the person may read the inbox of.
 */
export class InboxWaiting extends Context.Service<
  InboxWaiting,
  {
    /** Each workspace's count; one with none waiting is left out. */
    readonly unansweredIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DatabaseError>;
  }
>()("peal-server/engagement/application/InboxWaiting") {
  static readonly layer = Layer.effect(
    InboxWaiting,
    Effect.gen(function* InboxWaitingLive() {
      const reads = yield* InboxWaitingReads;

      return InboxWaiting.of({
        unansweredIn: (workspaceIds) =>
          (workspaceIds.length === 0
            ? Effect.succeed(new Map<WorkspaceId, number>())
            : reads.unansweredIn(workspaceIds)
          ).pipe(Effect.withSpan("InboxWaiting.unansweredIn")),
      });
    })
  );
}
