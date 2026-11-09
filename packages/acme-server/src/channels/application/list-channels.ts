import { Context, Effect, Layer } from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelRepository } from "./channel-repository.ts";

/** The channels connected to the actor's workspace. Needs channel:read. */
export class ListChannels extends Context.Service<
  ListChannels,
  {
    readonly list: (
      actor: Actor
    ) => Effect.Effect<readonly Channel[], DatabaseError | MissingPermission>;
  }
>()("acme-server/channels/application/ListChannels") {
  static readonly layer = Layer.effect(
    ListChannels,
    Effect.gen(function* ListChannelsLive() {
      const channels = yield* ChannelRepository;

      const list = Effect.fn("ListChannels.list")(function* list(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "channel:read"));

        return yield* channels.list(actor.workspaceId);
      });

      return ListChannels.of({ list });
    })
  );
}
