import { Effect } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import { AssistantAllowance } from "./ports/assistant-allowance.ts";
import { AssistantUsage } from "./ports/assistant-usage.ts";

/**
 * The requests the workspace's pool sent on the day, as its limit counts
 * them: its own and those of the workspaces it shares the day with. A
 * report: it takes no hold, and reads no pool where none is shared.
 */
export const pooledUsed = Effect.fn("AssistantUsage.pooledUsed")(
  function* pooledUsed(workspaceId: WorkspaceId, day: LocalDate) {
    const usage = yield* AssistantUsage;
    const allowance = yield* AssistantAllowance;

    const others = allowance.pooled
      ? yield* allowance.sharingWith(workspaceId)
      : [];

    if (others.length === 0) {
      return yield* usage.used(workspaceId, day);
    }

    const sent = yield* usage.usedIn([workspaceId, ...others], day);

    return [...sent.values()].reduce((sum, requests) => sum + requests, 0);
  }
);
