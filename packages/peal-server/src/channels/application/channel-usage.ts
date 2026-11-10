import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { ChannelAllowance } from "./channel-allowance.ts";
import { ChannelRepository } from "./channel-repository.ts";

/**
 * How many channels each workspace has, for billing to show against its
 * plan. Counts only, so it checks no permission: the caller has.
 */
export class ChannelUsage extends Context.Service<
  ChannelUsage,
  {
    /**
     * The channels that count against the workspace's plan: its own, and
     * those of the workspaces that share the plan (`ChannelAllowance`), as
     * a partner's do.
     */
    readonly connected: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * The channels each of these workspaces has connected itself; one
     * without any is left out.
     */
    readonly connectedIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DatabaseError>;
  }
>()("peal-server/channels/application/ChannelUsage") {
  static readonly layer = Layer.effect(
    ChannelUsage,
    Effect.gen(function* ChannelUsageLive() {
      const channels = yield* ChannelRepository;
      const allowance = yield* ChannelAllowance;

      return ChannelUsage.of({
        connected: (workspaceId) =>
          allowance.sharedWith(workspaceId).pipe(
            Effect.flatMap((shared) =>
              channels.countIn([workspaceId, ...shared])
            ),
            Effect.map((held) =>
              [...held.values()].reduce((sum, count) => sum + count, 0)
            ),
            Effect.withSpan("ChannelUsage.connected")
          ),
        connectedIn: (workspaceIds) =>
          channels
            .countIn(workspaceIds)
            .pipe(Effect.withSpan("ChannelUsage.connectedIn")),
      });
    })
  );
}
