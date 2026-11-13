import { Context, Option } from "effect";
import type { DateTime, Duration, Effect } from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import type { SignedInChannels } from "#channels/domain/data-deletion.ts";
import type { Platform } from "#channels/domain/platform.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

import type { ChannelAlreadyConnected } from "./channel-already-connected.ts";
import type { ChannelCredentials } from "./channel-credentials.ts";

/** Tokens of `platform` expiring before `before` are due for a refresh. */
export interface RefreshCutoff {
  readonly before: DateTime.Utc;
  readonly platform: Platform;
}

/**
 * Where a page of `dueForRefresh` ended: its last channel's expiry and id.
 * The jobs page with it rather than an offset, as the channels they handle
 * leave the list.
 */
export interface RefreshCursor {
  readonly channelId: ChannelId;
  readonly expiresAt: DateTime.Utc;
}

/** The cursor after `channel`, the last of a page; none without an expiry. */
export const refreshCursorOf = (
  channel: Channel
): Option.Option<RefreshCursor> =>
  channel.token._tag === "nonExpiring"
    ? Option.none()
    : Option.some({
        channelId: channel.id,
        expiresAt: channel.token.expiresAt,
      });

/**
 * Where a page of `needingReconnect` ended: whether its last channel was
 * already marked, when it last changed, and its id.
 */
export interface ReconnectCursor {
  readonly channelId: ChannelId;
  readonly marked: boolean;
  readonly updatedAt: DateTime.Utc;
}

/** The cursor after `channel`, the last of a page. */
export const reconnectCursorOf = (channel: Channel): ReconnectCursor => ({
  channelId: channel.id,
  marked: channel.status._tag === "refreshNeeded",
  updatedAt: channel.updatedAt,
});

/** Which of a workspace's channels to list, and which page of them. */
export interface ChannelPageRequest {
  /** The last channel of the page before, if this is not the first. */
  readonly after: Option.Option<ChannelId>;
  readonly limit: number;
  readonly platform: Option.Option<Platform>;
  /**
   * Text the channel's handle, the name its platform shows or the name the
   * workspace gave it holds, whatever its case.
   */
  readonly query: Option.Option<string>;
  readonly status: Option.Option<Channel["status"]["_tag"]>;
  readonly workspaceId: WorkspaceId;
}

/** How many channels are in each status. */
export interface ChannelStatusCounts {
  readonly active: number;
  readonly disabled: number;
  readonly refreshNeeded: number;
}

/** A page of channels, oldest first. */
export interface ChannelPage {
  /**
   * The channels the platform and text asked for match, by status: what a
   * list shows beside each status it can be narrowed to.
   */
  readonly counts: ChannelStatusCounts;
  readonly items: readonly Channel[];
  /** Where the next page starts, if there is one. */
  readonly next: Option.Option<ChannelId>;
}

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
    /**
     * How many channels each of these workspaces has; one without any is
     * left out.
     */
    readonly countIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DatabaseError>;
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
    /** Forgets every channel's token owner: how many it forgot. */
    readonly forgetTokenOwners: Effect.Effect<number, DatabaseError>;
    /**
     * A page of the active channels whose token renews itself and expires
     * before the cutoff given for their platform, soonest first, at most
     * `limit` of those that come after `after`. Platforms without a cutoff
     * are left out.
     */
    readonly dueForRefresh: (request: {
      readonly after: Option.Option<RefreshCursor>;
      readonly cutoffs: readonly RefreshCutoff[];
      readonly limit: number;
    }) => Effect.Effect<readonly Channel[], DatabaseError>;
    /** How many channels `dueForRefresh` would list for the cutoffs. */
    readonly countDueForRefresh: (
      cutoffs: readonly RefreshCutoff[]
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * A page of the channels the user must reconnect, at most `limit` of
     * those that come after `after`: the active ones whose token cannot be
     * renewed and is within `leadTime` of expiring, or half its lifetime
     * when that is shorter (`reconnectWarningFrom` in the domain), expired
     * or not; then those that already need a refresh. Each group comes
     * oldest change first. The active ones come first, so a run cut short
     * warns them before it tells again of the marked channels nobody
     * reconnects.
     */
    readonly needingReconnect: (request: {
      readonly after: Option.Option<ReconnectCursor>;
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
    /**
     * Writes the name the workspace gives the channel, or none, and
     * nothing else of it. Says whether the channel was there.
     */
    readonly setLabel: (
      workspaceId: WorkspaceId,
      channelId: ChannelId,
      label: Option.Option<string>,
      now: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Writes whether the channel is on, off or to reconnect, and nothing
     * else of it: its tokens and profile stay as the row has them. Says
     * whether the channel was there.
     */
    readonly setStatus: (
      channel: Channel
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * A page of the workspace's channels that match, oldest first, and how
     * many match by status, whatever the status asked for.
     */
    readonly search: (
      request: ChannelPageRequest
    ) => Effect.Effect<ChannelPage, DatabaseError>;
    /** Deletes the channel and its tokens. Says whether it was there. */
    readonly remove: (
      workspaceId: WorkspaceId,
      channelId: ChannelId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/channels/application/ChannelRepository") {}
