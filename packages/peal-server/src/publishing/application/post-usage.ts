import { Context, DateTime, Effect, Layer, Option } from "effect";

import { postingMonthOf } from "#publishing/domain/posting-month.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { PostRepository } from "./post-repository.ts";

/** The posts going out this month, and when the next month starts. */
export interface MonthlyPosts {
  readonly resetsAt: DateTime.Utc;
  readonly scheduled: number;
}

/**
 * How many posts each workspace has going out this month (UTC), for billing
 * to show against its plan. Counts only, so it checks no permission: the
 * caller has.
 */
export class PostUsage extends Context.Service<
  PostUsage,
  {
    readonly thisMonth: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<MonthlyPosts, DatabaseError>;
  }
>()("acme-server/publishing/application/PostUsage") {
  static readonly layer = Layer.effect(
    PostUsage,
    Effect.gen(function* PostUsageLive() {
      const posts = yield* PostRepository;

      const thisMonth = Effect.fn("PostUsage.thisMonth")(function* thisMonth(
        workspaceId: WorkspaceId
      ) {
        const month = postingMonthOf(yield* DateTime.now);

        const scheduled = yield* posts.countGoingOut(
          workspaceId,
          month,
          Option.none()
        );

        const usage: MonthlyPosts = { resetsAt: month.to, scheduled };

        return usage;
      });

      return PostUsage.of({ thisMonth });
    })
  );
}
