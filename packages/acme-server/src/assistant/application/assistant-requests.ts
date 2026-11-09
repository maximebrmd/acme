import { Context, DateTime, Effect, Layer } from "effect";

import { usageWindowAt } from "#assistant/domain/usage-window.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { AssistantUsage } from "./ports/assistant-usage.ts";

/** The requests a workspace sent today, and when the day's count resets. */
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
  }
>()("acme-server/assistant/application/AssistantRequests") {
  static readonly layer = Layer.effect(
    AssistantRequests,
    Effect.gen(function* AssistantRequestsLive() {
      const usage = yield* AssistantUsage;

      const today = Effect.fn("AssistantRequests.today")(function* today(
        workspaceId: WorkspaceId
      ) {
        const window = usageWindowAt(yield* DateTime.now);
        const used = yield* usage.used(workspaceId, window.day);
        const requests: RequestsToday = { resetsAt: window.resetsAt, used };

        return requests;
      });

      return AssistantRequests.of({ today });
    })
  );
}
