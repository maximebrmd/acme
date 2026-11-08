import { DateTime, Duration, Option, Schema } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { PlatformSchema } from "./platform.ts";

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
  // The account's own id on the platform.
  accountId: Schema.NonEmptyString,
  id: ChannelIdSchema,
  // The account's name or handle, as the platform shows it.
  name: Schema.NonEmptyString,
  platform: PlatformSchema,
  status: ChannelStatusSchema,
  token: TokenLifetimeSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

const withChange = (
  channel: Channel,
  status: ChannelStatus,
  token: TokenLifetime
): Channel =>
  new Channel({
    accountId: channel.accountId,
    id: channel.id,
    name: channel.name,
    platform: channel.platform,
    status,
    token,
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
export const markRefreshNeeded = (channel: Channel): Channel => {
  const { status } = channel;

  if (status._tag === "active") {
    return withChange(channel, { _tag: "refreshNeeded" }, channel.token);
  }

  if (status._tag === "disabled" && !status.refreshNeeded) {
    return withChange(
      channel,
      { _tag: "disabled", refreshNeeded: true },
      channel.token
    );
  }

  return channel;
};

/**
 * The user connected the account again, with a new token. A disabled channel
 * keeps its new token and stays disabled, with nothing left to refresh.
 */
export const reconnect = (channel: Channel, token: TokenLifetime): Channel =>
  withChange(
    channel,
    channel.status._tag === "disabled"
      ? { _tag: "disabled", refreshNeeded: false }
      : { _tag: "active" },
    token
  );

/** Turns a channel off. It keeps whether its token needs a refresh. */
export const disable = (channel: Channel): Channel =>
  channel.status._tag === "disabled"
    ? channel
    : withChange(
        channel,
        {
          _tag: "disabled",
          refreshNeeded: channel.status._tag === "refreshNeeded",
        },
        channel.token
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
    channel.token
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
