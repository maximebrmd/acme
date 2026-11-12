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
     * Counts a request of the workspace on the day as `cost` requests (one
     * for a suggestion, `imageRequestCost` for an image) if the count stays
     * within `dailyLimit`, and returns the count after it; none, and
     * nothing counted, when it would not. Requests sent at the same time
     * are counted one after the other, so none slips past the limit.
     */
    readonly claim: (
      workspaceId: WorkspaceId,
      day: LocalDate,
      dailyLimit: number,
      cost: number
    ) => Effect.Effect<Option.Option<number>>;
    /**
     * Takes back a request of `cost` counted on the day that never ran,
     * never below zero.
     */
    readonly release: (
      workspaceId: WorkspaceId,
      day: LocalDate,
      cost: number
    ) => Effect.Effect<void>;
    /** How many requests the workspace sent on the day. */
    readonly used: (
      workspaceId: WorkspaceId,
      day: LocalDate
    ) => Effect.Effect<number>;
    /**
     * How many requests each of these workspaces sent on the day, in one
     * query; one that sent none is left out.
     */
    readonly usedIn: (
      workspaceIds: readonly WorkspaceId[],
      day: LocalDate
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>>;
  }
>()("peal-server/assistant/application/AssistantUsage") {}
