import { DateTime, Duration, Option, Result, Schema } from "effect";

import { Actor } from "#shared/domain/access.ts";
import { ChannelConnectionSchema } from "#shared/domain/channel-connection.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { LocaleSchema } from "#shared/domain/locale.ts";
import type { Locale } from "#shared/domain/locale.ts";

import { ConnectLinkIdSchema } from "./connect-link-id.ts";
import type { ConnectLinkId } from "./connect-link-id.ts";
import { ConnectLinkUnusable } from "./connect-link-unusable.ts";
import { PlatformSchema } from "./platform.ts";
import type { Platform } from "./platform.ts";

/** How long a link works unless its creator says otherwise: a week. */
export const defaultLinkLifetime = Duration.days(7);

/** The shortest and the longest a link may be asked to work, in hours. */
export const minLinkHours = 1;

export const maxLinkHours = 720;

/**
 * How many times a link's sign-in may be started: enough for someone who
 * turns back from the platform a few times, few enough that a link passed
 * around cannot be used to hammer a platform.
 */
export const maxLinkStarts = 20;

/** How many links of a workspace may wait to be used at once. */
export const maxPendingLinks = 100;

/** How long a link is kept once it is over, for its creator to read. */
export const linkRetention = Duration.days(30);

/**
 * Why the last sign-in through a link did not connect anything, as the
 * API's connect failures name it, or because the plan had no room.
 */
export const LinkFailureSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  reason: Schema.NonEmptyString,
});

export type LinkFailure = typeof LinkFailureSchema.Type;

export const LinkStatusSchema = Schema.Union([
  Schema.TaggedStruct("pending", {}),
  // Used: the channels it connected, or reconnected.
  Schema.TaggedStruct("completed", {
    at: Schema.DateTimeUtc,
    channelIds: Schema.Array(ChannelIdSchema),
  }),
  Schema.TaggedStruct("revoked", { at: Schema.DateTimeUtc }),
]);

export type LinkStatus = typeof LinkStatusSchema.Type;

/**
 * A link a workspace hands to whoever owns a social account, so they
 * connect it without a Peal account: it opens a hosted page, which sends
 * them to the platform and back. It names one platform, or one channel to
 * reconnect, works once, until `expiresAt`, and is known by a token only
 * its holder has: Peal keeps the token's digest alone.
 *
 * `returnUrl` is where the page sends them once done, an address the
 * workspace's partner registered the origin of. `browser` is the digest of
 * the nonce the browser that last started its sign-in holds in a cookie:
 * only that browser completes it.
 */
export class ConnectLink extends Schema.Class<ConnectLink>(
  "peal-server/channels/domain/ConnectLink"
)({
  browser: Schema.Option(Schema.NonEmptyString),
  // The channel it reconnects; none when it connects a new account.
  channelId: Schema.Option(ChannelIdSchema),
  // The way in an Instagram sign-in takes; none for the server's own.
  connection: Schema.Option(ChannelConnectionSchema),
  createdAt: Schema.DateTimeUtc,
  // Who created it, as attempts name their starter; none once the member
  // who did closed their account.
  createdBy: Schema.Option(Schema.NonEmptyString),
  expiresAt: Schema.DateTimeUtc,
  failure: Schema.Option(LinkFailureSchema),
  id: ConnectLinkIdSchema,
  // The language its page opens in; none for the visitor's own.
  locale: Schema.Option(LocaleSchema),
  platform: PlatformSchema,
  returnUrl: Schema.Option(Schema.NonEmptyString),
  // How many times its sign-in was started.
  starts: Schema.Int,
  status: LinkStatusSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

type Fields = ConstructorParameters<typeof ConnectLink>[0];

const withFields = (link: ConnectLink, changed: Partial<Fields>) =>
  new ConnectLink({
    browser: link.browser,
    channelId: link.channelId,
    connection: link.connection,
    createdAt: link.createdAt,
    createdBy: link.createdBy,
    expiresAt: link.expiresAt,
    failure: link.failure,
    id: link.id,
    locale: link.locale,
    platform: link.platform,
    returnUrl: link.returnUrl,
    starts: link.starts,
    status: link.status,
    workspaceId: link.workspaceId,
    ...changed,
  });

/** A new link of the workspace. */
export const createLink = (
  link: {
    readonly channelId: Option.Option<ChannelId>;
    readonly connection: Option.Option<ChannelConnection>;
    readonly createdBy: string;
    readonly id: ConnectLinkId;
    readonly lifetime: Duration.Duration;
    readonly locale: Option.Option<Locale>;
    readonly platform: Platform;
    readonly returnUrl: Option.Option<string>;
    readonly workspaceId: WorkspaceId;
  },
  now: DateTime.Utc
): ConnectLink =>
  new ConnectLink({
    browser: Option.none(),
    channelId: link.channelId,
    connection: link.connection,
    createdAt: now,
    createdBy: Option.some(link.createdBy),
    expiresAt: DateTime.addDuration(now, link.lifetime),
    failure: Option.none(),
    id: link.id,
    locale: link.locale,
    platform: link.platform,
    returnUrl: link.returnUrl,
    starts: 0,
    status: { _tag: "pending" },
    workspaceId: link.workspaceId,
  });

/** Whether the link is past its time: one used or revoked never is. */
export const isExpired = (link: ConnectLink, now: DateTime.Utc): boolean =>
  link.status._tag === "pending" &&
  DateTime.isGreaterThanOrEqualTo(now, link.expiresAt);

/** Whether the link still waits to be used at `now`. */
export const isWaiting = (link: ConnectLink, now: DateTime.Utc): boolean =>
  link.status._tag === "pending" && !isExpired(link, now);

/** The link, while it can still connect something. */
export const usable = (
  link: ConnectLink,
  now: DateTime.Utc
): Result.Result<ConnectLink, ConnectLinkUnusable> => {
  if (link.status._tag !== "pending") {
    return Result.fail(new ConnectLinkUnusable({ reason: link.status._tag }));
  }

  return isExpired(link, now)
    ? Result.fail(new ConnectLinkUnusable({ reason: "expired" }))
    : Result.succeed(link);
};

/**
 * The link once a browser started its sign-in: that browser alone
 * completes it, and one that started before no longer does. Refused once
 * it was started `maxLinkStarts` times.
 */
export const startLink = (
  link: ConnectLink,
  browser: string,
  now: DateTime.Utc
): Result.Result<ConnectLink, ConnectLinkUnusable> =>
  usable(link, now).pipe(
    Result.flatMap((pending) =>
      pending.starts >= maxLinkStarts
        ? Result.fail(new ConnectLinkUnusable({ reason: "exhausted" }))
        : Result.succeed(
            withFields(pending, {
              browser: Option.some(browser),
              starts: pending.starts + 1,
            })
          )
    )
  );

/** The link once it connected these channels: used, for good. */
export const completeLink = (
  link: ConnectLink,
  channelIds: readonly ChannelId[],
  now: DateTime.Utc
): ConnectLink =>
  withFields(link, {
    browser: Option.none(),
    failure: Option.none(),
    status: { _tag: "completed", at: now, channelIds },
  });

/** The link once its creator took it back; one already over stays as it is. */
export const revokeLink = (link: ConnectLink, now: DateTime.Utc): ConnectLink =>
  link.status._tag === "pending"
    ? withFields(link, {
        browser: Option.none(),
        status: { _tag: "revoked", at: now },
      })
    : link;

/**
 * The key a link stands as, wherever what it did is kept: the sign-ins it
 * starts, the workspace's activity log.
 */
export const linkKeyOf = (link: ConnectLink): string =>
  `connect-link:${link.id}`;

/**
 * Who acts through a link: whoever holds it, in its workspace, to connect
 * accounts and nothing else. It stands as a single-purpose key of the
 * workspace, named after the link, so the sign-ins it starts are its own:
 * no member, no key and no other link completes them.
 */
export const linkActor = (link: ConnectLink): Actor =>
  new Actor({
    permissions: ["channel:connect"],
    subject: { _tag: "apiKey", apiKeyId: linkKeyOf(link) },
    workspaceId: link.workspaceId,
  });
