import { Context, DateTime, Effect, Layer } from "effect";

import { excerptOf } from "#publishing/domain/post-excerpt.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { PostAttentionReads } from "./post-attention-reads.ts";
import type {
  AgendaPageRequest,
  AgendaPost,
  AttentionCounts,
  StoredWeekPost,
  WeekPost,
  WeekWindow,
  WorkspaceWeek,
} from "./post-attention-reads.ts";

export type {
  AgendaPageRequest,
  AgendaPost,
  AgendaStatus,
  AttentionCounts,
  WeekCounts,
  WeekPost,
  WeekWindow,
  WorkspaceWeek,
} from "./post-attention-reads.ts";

const weekPostOf = ({ textStart, ...post }: StoredWeekPost): WeekPost => ({
  ...post,
  excerpt: excerptOf(textStart),
});

/**
 * The posts of several workspaces at once, for the view across a person's
 * workspaces: what needs attention in each, counted, and the posts with a
 * time in a range, a page at a time by time then id. Counts and excerpts
 * only, so it checks no permission: the caller decided which workspaces
 * the person may read posts in, and names only those.
 */
export class PostAttention extends Context.Service<
  PostAttention,
  {
    /** Each workspace's counts; one with nothing to count is left out. */
    readonly countsIn: (
      workspaceIds: readonly WorkspaceId[],
      now: DateTime.Utc
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, AttentionCounts>,
      DatabaseError
    >;
    /** `limit` posts at most, after `after`, by time then id. */
    readonly agenda: (
      request: AgendaPageRequest
    ) => Effect.Effect<readonly AgendaPost[], DatabaseError>;
    /**
     * One workspace's week and the week after it, by the time each post
     * had: counted, and the first `listed` of each, for a digest.
     */
    readonly week: (
      workspaceId: WorkspaceId,
      window: WeekWindow
    ) => Effect.Effect<WorkspaceWeek<WeekPost>, DatabaseError>;
  }
>()("peal-server/publishing/application/PostAttention") {
  static readonly layer = Layer.effect(
    PostAttention,
    Effect.gen(function* PostAttentionLive() {
      const reads = yield* PostAttentionReads;

      return PostAttention.of({
        agenda: (request) =>
          (request.workspaceIds.length === 0
            ? Effect.succeed([])
            : reads.agenda(request)
          ).pipe(
            Effect.map((stored) =>
              stored.map(({ textStart, ...post }): AgendaPost => ({
                ...post,
                excerpt: excerptOf(textStart),
              }))
            ),
            Effect.withSpan("PostAttention.agenda")
          ),
        countsIn: (workspaceIds, now) =>
          (workspaceIds.length === 0
            ? Effect.succeed(new Map<WorkspaceId, AttentionCounts>())
            : reads.countsIn(workspaceIds, {
                finishedFrom: DateTime.subtract(now, { days: 7 }),
                scheduledFrom: now,
                scheduledTo: DateTime.add(now, { days: 7 }),
              })
          ).pipe(Effect.withSpan("PostAttention.countsIn")),
        week: (workspaceId, window) =>
          reads.week(workspaceId, window).pipe(
            Effect.map(({ counts, planned, wentOut }) => ({
              counts,
              planned: planned.map(weekPostOf),
              wentOut: wentOut.map(weekPostOf),
            })),
            Effect.withSpan("PostAttention.week")
          ),
      });
    })
  );
}
