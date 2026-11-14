import { DateTime, Duration, Effect, Option, Schema } from "effect";

import { ChannelConnectionSchema } from "#shared/domain/channel-connection.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

import { AvatarUrlSchema } from "./avatar-url.ts";
import type { AvatarUrl } from "./avatar-url.ts";
import { PlatformSchema } from "./platform.ts";
import type { Platform } from "./platform.ts";

/**
 * - `active`: posts go out.
 * - `refreshNeeded`: the token no longer works, and the user must reconnect.
 * - `disabled`: turned off; nothing goes out and no reminders are sent. It
 *   remembers whether the token stopped working, so turning the channel back
 *   on asks the user to reconnect rather than posting with a dead token.
 */
export const ChannelStatusSchema = Schema.Union([
  Schema.TaggedStruct("active", {}),
  Schema.TaggedStruct("refreshNeeded", {}),
  Schema.TaggedStruct("disabled", { refreshNeeded: Schema.Boolean }),
]);

export type ChannelStatus = typeof ChannelStatusSchema.Type;

/** How long the channel's access token lasts. */
export const TokenLifetimeSchema = Schema.Union([
  // The token works until it is revoked.
  Schema.TaggedStruct("nonExpiring", {}),
  // The token expires, and a refresh token renews it without the user.
  Schema.TaggedStruct("refreshable", { expiresAt: Schema.DateTimeUtc }),
  // The token expires and cannot be renewed: the user reconnects in time.
  Schema.TaggedStruct("nonRefreshable", {
    expiresAt: Schema.DateTimeUtc,
    issuedAt: Schema.DateTimeUtc,
  }),
]);

export type TokenLifetime = typeof TokenLifetimeSchema.Type;

/** The longest name a workspace gives one of its channels. */
export const maxChannelLabelLength = 60;

/**
 * The name a workspace gives a channel, for its members to tell their
 * accounts apart: one line, shown in Peal only, never sent to a platform.
 */
export const ChannelLabelSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxChannelLabelLength),
  Schema.makeFilter((label: string) => label === label.trim(), {
    expected: "a name without spaces around it",
  }),
  Schema.makeFilter((label: string) => !/\p{Cc}/u.test(label), {
    expected: "a name on one line, without control characters",
  })
);

/** A social account connected to a workspace. */
export class Channel extends Schema.Class<Channel>(
  "peal-server/channels/domain/Channel"
)({
  // The account's own id on the platform, which never changes: a workspace
  // connects each account once.
  accountId: Schema.NonEmptyString,
  avatarUrl: Schema.Option(AvatarUrlSchema),
  // How an Instagram channel reaches its account (Instagram Login, or
  // Facebook Login through a Page); none on other platforms.
  connection: Schema.Option(ChannelConnectionSchema),
  createdAt: Schema.DateTimeUtc,
  // The account's name as the platform shows it, if it has one besides its
  // handle.
  displayName: Schema.Option(Schema.NonEmptyString),
  // The name people mention the account by, such as "@peal_example".
  handle: Schema.NonEmptyString,
  id: ChannelIdSchema,
  // The name the workspace gave it, if any: Peal's own, beside the handle
  // and name the platform shows, which it never replaces.
  label: Schema.Option(ChannelLabelSchema).pipe(
    Schema.withConstructorDefault(Effect.succeed(Option.none()))
  ),
  platform: PlatformSchema,
  // What the account allowed Peal to do, in the platform's own words.
  scopes: Schema.Array(Schema.NonEmptyString),
  status: ChannelStatusSchema,
  token: TokenLifetimeSchema,
  updatedAt: Schema.DateTimeUtc,
  workspaceId: WorkspaceIdSchema,
}) {}

/**
 * What the platform tells about an account each time it is connected: its
 * profile, the scopes it granted and how long its new token lasts.
 */
export interface ConnectedAccount {
  readonly avatarUrl: Option.Option<AvatarUrl>;
  /**
   * The way in the account was connected through, for Instagram: connecting
   * an account the workspace has through the other way moves its channel
   * there.
   */
  readonly connection: Option.Option<ChannelConnection>;
  readonly displayName: Option.Option<string>;
  readonly handle: string;
  readonly scopes: readonly string[];
  readonly token: TokenLifetime;
}

/** An account connected to a workspace for the first time. */
export interface NewChannel extends ConnectedAccount {
  readonly accountId: string;
  readonly id: ChannelId;
  readonly platform: Platform;
  readonly workspaceId: WorkspaceId;
}

/** Records a newly connected account, ready to post. */
export const connectChannel = (
  channel: NewChannel,
  now: DateTime.Utc
): Channel =>
  new Channel({
    accountId: channel.accountId,
    avatarUrl: channel.avatarUrl,
    connection: channel.connection,
    createdAt: now,
    displayName: channel.displayName,
    handle: channel.handle,
    id: channel.id,
    platform: channel.platform,
    scopes: channel.scopes,
    status: { _tag: "active" },
    token: channel.token,
    updatedAt: now,
    workspaceId: channel.workspaceId,
  });

/**
 * The channel as it goes to another workspace of its pool, at `now`: a
 * new channel there, `id`, with the same account, way in, scopes, token
 * and status, connected there now. Its name was the other workspace's,
 * and stays behind.
 */
export const movedChannel = (
  channel: Channel,
  to: { readonly id: ChannelId; readonly workspaceId: WorkspaceId },
  now: DateTime.Utc
): Channel =>
  new Channel({
    accountId: channel.accountId,
    avatarUrl: channel.avatarUrl,
    connection: channel.connection,
    createdAt: now,
    displayName: channel.displayName,
    handle: channel.handle,
    id: to.id,
    label: Option.none(),
    platform: channel.platform,
    scopes: channel.scopes,
    status: channel.status,
    token: channel.token,
    updatedAt: now,
    workspaceId: to.workspaceId,
  });

// The channel with its status, and possibly what the platform last told about
// the account, changed at `now`.
const withChange = (
  channel: Channel,
  status: ChannelStatus,
  now: DateTime.Utc,
  account: ConnectedAccount = channel
): Channel =>
  new Channel({
    accountId: channel.accountId,
    avatarUrl: account.avatarUrl,
    connection: account.connection,
    createdAt: channel.createdAt,
    displayName: account.displayName,
    handle: account.handle,
    id: channel.id,
    label: channel.label,
    platform: channel.platform,
    scopes: account.scopes,
    status,
    token: account.token,
    updatedAt: now,
    workspaceId: channel.workspaceId,
  });

/** Whether a token that cannot be renewed has run out. */
export const isTokenExpired = (channel: Channel, now: DateTime.Utc): boolean =>
  channel.token._tag === "nonRefreshable" &&
  DateTime.isGreaterThanOrEqualTo(now, channel.token.expiresAt);

/**
 * The token stopped working: the user must reconnect. A disabled channel
 * stays disabled and asks for it once it is turned back on.
 */
export const markRefreshNeeded = (
  channel: Channel,
  now: DateTime.Utc
): Channel => {
  const { status } = channel;

  if (status._tag === "active") {
    return withChange(channel, { _tag: "refreshNeeded" }, now);
  }

  if (status._tag === "disabled" && !status.refreshNeeded) {
    return withChange(channel, { _tag: "disabled", refreshNeeded: true }, now);
  }

  return channel;
};

/**
 * The user connected the account again: it takes the new token, and the
 * profile and scopes the platform gave with it. A disabled channel stays
 * disabled, with nothing left to refresh.
 */
export const reconnect = (
  channel: Channel,
  account: ConnectedAccount,
  now: DateTime.Utc
): Channel =>
  withChange(
    channel,
    channel.status._tag === "disabled"
      ? { _tag: "disabled", refreshNeeded: false }
      : { _tag: "active" },
    now,
    account
  );

/**
 * The platform renewed the channel's token without the user: the channel
 * takes the new token's lifetime and the scopes granted with it, and keeps
 * its status and profile.
 */
export const renewToken = (
  channel: Channel,
  renewed: {
    readonly scopes: readonly string[];
    readonly token: TokenLifetime;
  },
  now: DateTime.Utc
): Channel =>
  withChange(channel, channel.status, now, {
    avatarUrl: channel.avatarUrl,
    connection: channel.connection,
    displayName: channel.displayName,
    handle: channel.handle,
    scopes: renewed.scopes,
    token: renewed.token,
  });

/**
 * Gives the channel the name its workspace calls it by, or takes it back
 * (none). Nothing else of it changes.
 */
export const labelled = (
  channel: Channel,
  label: Option.Option<string>,
  now: DateTime.Utc
): Channel =>
  new Channel({
    accountId: channel.accountId,
    avatarUrl: channel.avatarUrl,
    connection: channel.connection,
    createdAt: channel.createdAt,
    displayName: channel.displayName,
    handle: channel.handle,
    id: channel.id,
    label,
    platform: channel.platform,
    scopes: channel.scopes,
    status: channel.status,
    token: channel.token,
    updatedAt: now,
    workspaceId: channel.workspaceId,
  });

/** Turns a channel off. It keeps whether its token needs a refresh. */
export const disable = (channel: Channel, now: DateTime.Utc): Channel =>
  channel.status._tag === "disabled"
    ? channel
    : withChange(
        channel,
        {
          _tag: "disabled",
          refreshNeeded: channel.status._tag === "refreshNeeded",
        },
        now
      );

/**
 * Turns a disabled channel back on, asking to reconnect if its token stopped
 * working or ran out.
 */
export const enable = (channel: Channel, now: DateTime.Utc): Channel => {
  const { status } = channel;

  if (status._tag !== "disabled") {
    return channel;
  }

  return withChange(
    channel,
    status.refreshNeeded || isTokenExpired(channel, now)
      ? { _tag: "refreshNeeded" }
      : { _tag: "active" },
    now
  );
};

/**
 * How long before a token that cannot be renewed expires the user is warned
 * to reconnect: a week, or half the token's lifetime when it lasts less than
 * two weeks, so a short-lived token is not flagged the moment it is issued.
 */
export const reconnectLeadTime = Duration.days(7);

/**
 * When to start warning the user to reconnect. None for tokens that renew
 * themselves or never expire.
 */
export const reconnectWarningFrom = (
  token: TokenLifetime
): Option.Option<DateTime.Utc> => {
  if (token._tag !== "nonRefreshable") {
    return Option.none();
  }

  const lifetime = DateTime.distance(token.issuedAt, token.expiresAt);
  const lead = Duration.min(reconnectLeadTime, Duration.times(lifetime, 0.5));

  return Option.some(DateTime.subtractDuration(token.expiresAt, lead));
};

/**
 * The expiry to warn the user about now, if any: for an active channel whose
 * token cannot be renewed, from `reconnectWarningFrom` on, expired or not. A
 * channel that already needs a refresh asks for it instead, and a disabled
 * one stays quiet.
 */
export const reconnectWarning = (
  channel: Channel,
  now: DateTime.Utc
): Option.Option<DateTime.Utc> => {
  const { status, token } = channel;

  if (status._tag !== "active" || token._tag !== "nonRefreshable") {
    return Option.none();
  }

  return Option.filter(reconnectWarningFrom(token), (from) =>
    DateTime.isGreaterThanOrEqualTo(now, from)
  ).pipe(Option.as(token.expiresAt));
};
