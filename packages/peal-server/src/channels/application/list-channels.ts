import { Context, Effect, Layer } from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelRepository } from "./channel-repository.ts";
import type { ChannelPage, ChannelPageRequest } from "./channel-repository.ts";

/** The most channels a page holds, and how many when not told. */
export const maxChannelPageSize = 100;

export const defaultChannelPageSize = 50;

/** Which channels to list, and which page of them. */
export type ChannelSearchRequest = Omit<ChannelPageRequest, "workspaceId">;

/** The channels connected to the actor's workspace. Needs channel:read. */
export class ListChannels extends Context.Service<
  ListChannels,
  {
    readonly list: (
      actor: Actor
    ) => Effect.Effect<readonly Channel[], DatabaseError | MissingPermission>;
    /**
     * A page of the workspace's channels, oldest first: those of a
     * platform, in a status, or whose handle or names hold some text, with
     * how many match by status.
     */
    readonly search: (
      actor: Actor,
      request: ChannelSearchRequest
    ) => Effect.Effect<ChannelPage, DatabaseError | MissingPermission>;
  }
>()("peal-server/channels/application/ListChannels") {
  static readonly layer = Layer.effect(
    ListChannels,
    Effect.gen(function* ListChannelsLive() {
      const channels = yield* ChannelRepository;

      const list = Effect.fn("ListChannels.list")(function* list(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "channel:read"));

        return yield* channels.list(actor.workspaceId);
      });

      const search = Effect.fn("ListChannels.search")(function* search(
        actor: Actor,
        request: ChannelSearchRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:read"));

        return yield* channels.search({
          ...request,
          limit: Math.min(Math.max(request.limit, 1), maxChannelPageSize),
          workspaceId: actor.workspaceId,
        });
      });

      return ListChannels.of({ list, search });
    })
  );
}
