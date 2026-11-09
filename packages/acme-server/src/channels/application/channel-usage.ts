import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { ChannelRepository } from "./channel-repository.ts";

/**
 * How many channels each workspace has, for billing to show against its
 * plan. Counts only, so it checks no permission: the caller has.
 */
export class ChannelUsage extends Context.Service<
  ChannelUsage,
  {
    readonly connected: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("acme-server/channels/application/ChannelUsage") {
  static readonly layer = Layer.effect(
    ChannelUsage,
    Effect.gen(function* ChannelUsageLive() {
      const channels = yield* ChannelRepository;

      return ChannelUsage.of({
        connected: (workspaceId) =>
          channels.list(workspaceId).pipe(
            Effect.map((connected) => connected.length),
            Effect.withSpan("ChannelUsage.connected")
          ),
      });
    })
  );
}
