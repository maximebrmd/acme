import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

/**
 * How many requests each workspace sent the assistant, day by day: the
 * counts the daily quota reads, and that billing can later charge.
 */
export class AssistantUsage extends Context.Service<
  AssistantUsage,
  {
    /**
     * Counts one request of the workspace on the day if fewer than
     * `dailyLimit` were counted, and returns the count after it; none, and
     * nothing counted, once the limit is reached. Requests sent at the same
     * time are counted one after the other, so none slips past the limit.
     */
    readonly claim: (
      workspaceId: WorkspaceId,
      day: LocalDate,
      dailyLimit: number
    ) => Effect.Effect<Option.Option<number>>;
    /** Takes back a request counted on the day that never ran. */
    readonly release: (
      workspaceId: WorkspaceId,
      day: LocalDate
    ) => Effect.Effect<void>;
    /** How many requests the workspace sent on the day. */
    readonly used: (
      workspaceId: WorkspaceId,
      day: LocalDate
    ) => Effect.Effect<number>;
  }
>()("acme-server/assistant/application/AssistantUsage") {}
