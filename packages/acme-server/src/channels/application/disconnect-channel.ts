import { Context, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelNotFound } from "./channel-not-found.ts";
import { ChannelRepository } from "./channel-repository.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

/**
 * Disconnects a channel of the actor's workspace: the channel and its tokens
 * are deleted. Needs channel:disconnect. An id that names no channel of the
 * workspace, including one that is not a channel id at all, is
 * ChannelNotFound.
 */
export class DisconnectChannel extends Context.Service<
  DisconnectChannel,
  {
    readonly disconnect: (
      actor: Actor,
      channelId: string
    ) => Effect.Effect<
      void,
      ChannelNotFound | DatabaseError | MissingPermission
    >;
  }
>()("acme-server/channels/application/DisconnectChannel") {
  static readonly layer = Layer.effect(
    DisconnectChannel,
    Effect.gen(function* DisconnectChannelLive() {
      const channels = yield* ChannelRepository;

      const disconnect = Effect.fn("DisconnectChannel.disconnect")(
        function* disconnect(actor: Actor, channelId: string) {
          yield* Effect.fromResult(authorize(actor, "channel:disconnect"));

          const id = decodeChannelId(channelId);

          const removed = Option.isSome(id)
            ? yield* channels.remove(actor.workspaceId, id.value)
            : false;

          if (!removed) {
            yield* new ChannelNotFound({ channelId });
          }
        }
      );

      return DisconnectChannel.of({ disconnect });
    })
  );
}
