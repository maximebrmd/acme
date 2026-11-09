import { Context } from "effect";
import type { DateTime, Duration, Effect, Option } from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import type { SignedInChannels } from "#channels/domain/data-deletion.ts";
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
    /**
     * Whether any workspace has a channel for the platform account, as
     * before revoking the grant its channels share.
     */
    readonly accountInUse: (
      platform: Platform,
      accountId: string
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * The channels of every workspace among those signed in that rest on
     * the platform user: granted by them, or their own account, as a Meta
     * deauthorization names them.
     */
    readonly restingOn: (request: {
      readonly signedIn: readonly SignedInChannels[];
      readonly userId: string;
    }) => Effect.Effect<readonly Channel[], DatabaseError>;
    /** Any workspace's channel, for jobs that act on channels by id. */
    readonly get: (
      channelId: ChannelId
    ) => Effect.Effect<Option.Option<Channel>, DatabaseError>;
    readonly credentials: (
      channelId: ChannelId
    ) => Effect.Effect<Option.Option<ChannelCredentials>, DatabaseError>;
    /**
     * Active channels whose token renews itself and expires before the
     * cutoff given for their platform, soonest first, at most `limit`.
     * Platforms without a cutoff are left out.
     */
    readonly dueForRefresh: (request: {
      readonly cutoffs: readonly {
        readonly before: DateTime.Utc;
        readonly platform: Platform;
      }[];
      readonly limit: number;
    }) => Effect.Effect<readonly Channel[], DatabaseError>;
    /**
     * Channels the user must reconnect, at most `limit`: the active ones
     * whose token cannot be renewed and is within `leadTime` of expiring, or
     * half its lifetime when that is shorter (`reconnectWarningFrom` in the
     * domain), expired or not; then those that already need a refresh. Each
     * group comes oldest change first. The active ones come first, so the
     * marked channels nobody reconnects never crowd them out.
     */
    readonly needingReconnect: (request: {
      readonly leadTime: Duration.Duration;
      readonly limit: number;
      readonly now: DateTime.Utc;
    }) => Effect.Effect<readonly Channel[], DatabaseError>;
    /**
     * Runs `adding` in a transaction that holds back, until it ends, any
     * other one adding a channel to the workspace: counting its channels,
     * then adding one, takes turns.
     */
    readonly addingTo: <A, E, R>(
      workspaceId: WorkspaceId,
      adding: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, DatabaseError | E, R>;
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
>()("peal-server/channels/application/ChannelRepository") {}
