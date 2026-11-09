import { DateTime, Duration, Option, Schema } from "effect";

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

/** A social account connected to a workspace. */
export class Channel extends Schema.Class<Channel>(
  "acme-server/channels/domain/Channel"
)({
  // The account's own id on the platform, which never changes: a workspace
  // connects each account once.
  accountId: Schema.NonEmptyString,
  avatarUrl: Schema.Option(AvatarUrlSchema),
  createdAt: Schema.DateTimeUtc,
  // The account's name as the platform shows it, if it has one besides its
  // handle.
  displayName: Schema.Option(Schema.NonEmptyString),
  // The name people mention the account by, such as "@acme_example".
  handle: Schema.NonEmptyString,
  id: ChannelIdSchema,
  platform: PlatformSchema,
  // What the account allowed Acme to do, in the platform's own words.
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
    createdAt: channel.createdAt,
    displayName: account.displayName,
    handle: account.handle,
    id: channel.id,
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
