import { Effect, Layer } from "effect";

import { WorkspaceHoldings } from "#billing/application/ports/workspace-holdings.ts";
import { ReductionRefused } from "#billing/domain/reduction-refused.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import { WorkspaceMembers } from "#workspace/application/workspace-members.ts";

/**
 * What a workspace holds, through the contexts that hold it: its channels
 * are listed and disconnected by the channels context's use cases, with the
 * platforms' revocations, and its members kept by the workspace context's,
 * which refuses an API key or staff impersonating the member, as billing
 * does before it.
 */
export const ContextWorkspaceHoldingsLive = Layer.effect(
  WorkspaceHoldings,
  Effect.gen(function* ContextWorkspaceHoldingsLive() {
    const channels = yield* ListChannels;
    const disconnecting = yield* DisconnectChannel;
    const members = yield* WorkspaceMembers;

    return WorkspaceHoldings.of({
      channels: (actor) =>
        channels.list(actor).pipe(
          Effect.map((connected) => connected.map(({ id }): string => id)),
          Effect.withSpan("WorkspaceHoldings.channels")
        ),
      disconnect: (actor, channelId) =>
        disconnecting.disconnect(actor, channelId).pipe(
          // Disconnected meanwhile: it is gone, as asked.
          Effect.catchTag("ChannelNotFound", () => Effect.void),
          Effect.withSpan("WorkspaceHoldings.disconnect")
        ),
      keepMembers: (actor, kept) =>
        members.keepOnly(actor, kept).pipe(
          Effect.catchTags({
            DirectoryUnavailable: ({ cause }) =>
              Effect.fail(new DatabaseError({ cause })),
            MembersNotRemovable: ({ reason }) =>
              Effect.fail(new ReductionRefused({ reason })),
            // Billing let only a member in person this far.
            UserRequired: () =>
              Effect.fail(
                new MissingPermission({ permission: "member:delete" })
              ),
          }),
          Effect.withSpan("WorkspaceHoldings.keepMembers")
        ),
    });
  })
);
