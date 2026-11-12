import { and, gt, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { InboxWaitingReads } from "#engagement/application/inbox-waiting-reads.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { threads } from "./schema.ts";

/**
 * The threads waiting for an answer across workspaces, in one query with
 * every id in one parameter (`anyUuid`), on the index of a workspace's
 * listed threads (`threads_workspace_listed`): those with comments.
 */
export const DrizzleInboxWaitingReads = Layer.effect(
  InboxWaitingReads,
  Effect.gen(function* DrizzleInboxWaitingReads() {
    const db = yield* Drizzle;

    return InboxWaitingReads.of({
      unansweredIn: (workspaceIds) =>
        db
          .select({
            unanswered: sql<number>`count(*)::int`,
            workspaceId: threads.workspaceId,
          })
          .from(threads)
          .where(
            and(
              anyUuid(threads.workspaceId, workspaceIds),
              // As the inbox lists them: threads with comments, one of
              // them waiting.
              gt(threads.commentCount, 0),
              gt(threads.unansweredCount, 0)
            )
          )
          .groupBy(threads.workspaceId)
          .pipe(
            Effect.mapError((cause) => new DatabaseError({ cause })),
            Effect.map(
              (rows) =>
                new Map(
                  rows.map(({ unanswered, workspaceId }) => [
                    WorkspaceIdSchema.make(workspaceId),
                    unanswered,
                  ])
                )
            ),
            Effect.withSpan("InboxWaitingReads.unansweredIn")
          ),
    });
  })
);
