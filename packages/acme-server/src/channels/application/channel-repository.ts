import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

import type { ChannelAlreadyConnected } from "./channel-already-connected.ts";
import type { ChannelCredentials } from "./channel-credentials.ts";

/**
 * The channels of every workspace, and their encrypted tokens. Reads that
 * name a workspace only find its own channels, whatever the id; tokens are
 * read on their own, by the code that calls the platform.
 */
export class ChannelRepository extends Context.Service<
  ChannelRepository,
  {
    /** The workspace's channels, oldest first. */
    readonly list: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly Channel[], DatabaseError>;
    readonly findById: (
      workspaceId: WorkspaceId,
      channelId: ChannelId
    ) => Effect.Effect<Option.Option<Channel>, DatabaseError>;
    /** The workspace's channel for a platform account, if it has one. */
    readonly findByAccount: (
      workspaceId: WorkspaceId,
      platform: Platform,
      accountId: string
    ) => Effect.Effect<Option.Option<Channel>, DatabaseError>;
    readonly credentials: (
      channelId: ChannelId
    ) => Effect.Effect<Option.Option<ChannelCredentials>, DatabaseError>;
    /**
     * Saves a newly connected channel with its tokens. Fails with
     * ChannelAlreadyConnected, saving nothing, when the workspace already has
     * a channel for the account.
     */
    readonly insert: (
      channel: Channel,
      credentials: ChannelCredentials
    ) => Effect.Effect<void, ChannelAlreadyConnected | DatabaseError>;
    /**
     * Saves a changed channel, and replaces its tokens when new ones are
     * given. Says whether the channel was still there.
     */
    readonly update: (
      channel: Channel,
      credentials: Option.Option<ChannelCredentials>
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Deletes the channel and its tokens. Says whether it was there. */
    readonly remove: (
      workspaceId: WorkspaceId,
      channelId: ChannelId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("acme-server/channels/application/ChannelRepository") {}
