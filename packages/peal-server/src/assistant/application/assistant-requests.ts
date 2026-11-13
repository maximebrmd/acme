import { Context, DateTime, Effect, Layer } from "effect";

import { usageWindowAt } from "#assistant/domain/usage-window.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import { pooledUsed } from "./pooled-requests.ts";
import { AssistantAllowance } from "./ports/assistant-allowance.ts";
import { AssistantUsage } from "./ports/assistant-usage.ts";

/**
 * The requests a workspace's pool sent today, as its limit counts them,
 * and when the day's count resets.
 */
export interface RequestsToday {
  readonly resetsAt: DateTime.Utc;
  readonly used: number;
}

/**
 * How many requests each workspace sent the assistant today (UTC), for
 * billing to show against its plan. Counts only, so it checks no
 * permission: the caller has.
 */
export class AssistantRequests extends Context.Service<
  AssistantRequests,
  {
    readonly today: (workspaceId: WorkspaceId) => Effect.Effect<RequestsToday>;
    /**
     * How many requests each of these workspaces sent on a day (UTC), for
     * billing's daily usage; one that sent none is left out.
     */
    readonly onDay: (
      workspaceIds: readonly WorkspaceId[],
      day: LocalDate
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>>;
  }
>()("peal-server/assistant/application/AssistantRequests") {
  static readonly layer = Layer.effect(
    AssistantRequests,
    Effect.gen(function* AssistantRequestsLive() {
      const usage = yield* AssistantUsage;
      const allowance = yield* AssistantAllowance;

      const today = Effect.fn("AssistantRequests.today")(function* today(
        workspaceId: WorkspaceId
      ) {
        const window = usageWindowAt(yield* DateTime.now);

        const used = yield* pooledUsed(workspaceId, window.day).pipe(
          Effect.provideService(AssistantUsage, usage),
          Effect.provideService(AssistantAllowance, allowance)
        );

        const requests: RequestsToday = { resetsAt: window.resetsAt, used };

        return requests;
      });

      return AssistantRequests.of({
        onDay: (workspaceIds, day) =>
          usage
            .usedIn(workspaceIds, day)
            .pipe(Effect.withSpan("AssistantRequests.onDay")),
        today,
      });
    })
  );
}
