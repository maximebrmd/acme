import { Context, Effect, Layer } from "effect";
import type { DateTime } from "effect";

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
      workspaceId: WorkspaceId,
      before?: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * The channels each of these workspaces has connected itself; one
     * without any is left out.
     */
    readonly connectedIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DatabaseError>;
    /**
     * What `connected` answers, for each of these workspaces, every one
     * of them: the pools they are in read at once, then the channels of
     * every workspace among them in one count, each pool's once however
     * many of its workspaces are asked. It holds no pool, so it reports
     * how they stand and decides nothing. With `before`, the channels
     * connected before it, for both.
     */
    readonly connectedAcross: (
      workspaceIds: readonly WorkspaceId[],
      before?: DateTime.Utc
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DatabaseError>;
  }
>()("peal-server/channels/application/ChannelUsage") {
  static readonly layer = Layer.effect(
    ChannelUsage,
    Effect.gen(function* ChannelUsageLive() {
      const channels = yield* ChannelRepository;
      const allowance = yield* ChannelAllowance;

      return ChannelUsage.of({
        connected: (workspaceId, before) =>
          allowance.sharedWith(workspaceId).pipe(
            Effect.flatMap((shared) =>
              channels.countIn([workspaceId, ...shared], before)
            ),
            Effect.map((held) =>
              [...held.values()].reduce((sum, count) => sum + count, 0)
            ),
            Effect.withSpan("ChannelUsage.connected")
          ),
        connectedAcross: (workspaceIds, before) =>
          Effect.gen(function* connectedAcross() {
            if (workspaceIds.length === 0) {
              return new Map<WorkspaceId, number>();
            }

            const shared = yield* allowance.sharingIn(workspaceIds);

            const held = yield* channels.countIn(
              [...new Set([...workspaceIds, ...[...shared.values()].flat()])],
              before
            );

            return new Map(
              workspaceIds.map((workspaceId) => [
                workspaceId,
                [workspaceId, ...(shared.get(workspaceId) ?? [])].reduce(
                  (sum, id) => sum + (held.get(id) ?? 0),
                  0
                ),
              ])
            );
          }).pipe(Effect.withSpan("ChannelUsage.connectedAcross")),
        connectedIn: (workspaceIds) =>
          channels
            .countIn(workspaceIds)
            .pipe(Effect.withSpan("ChannelUsage.connectedIn")),
      });
    })
  );
}
