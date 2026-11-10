import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { ConnectFailed } from "./connect-failed.ts";
import { ConnectLinkNotFound } from "./connect-link-not-found.ts";
import { Forbidden } from "./forbidden.ts";
import { HostedConnectFailureSchema } from "./hosted-connect-failed.ts";
import { ChannelConnectionSchema, PlatformSchema } from "./platform.ts";
import { ReturnUrlNotAllowed } from "./return-url-not-allowed.ts";
import { TooManyConnectLinks } from "./too-many-connect-links.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

// A connect link lets whoever owns a social account connect it to a
// workspace on a hosted page, without a Peal account. The server's rules
// (src/channels/domain/connect-link.ts) are the source of the limits
// below; a test keeps them equal.

/** How long a link works unless its creator says otherwise, in hours. */
export const defaultConnectLinkHours = 168;

export const minConnectLinkHours = 1;

export const maxConnectLinkHours = 720;

/** How many times a link's sign-in may be started. */
export const maxConnectLinkStarts = 20;

/** How many links of a workspace may wait to be used at once. */
export const maxPendingConnectLinks = 100;

/** How long a link is kept once it is over, in days. */
export const connectLinkRetentionDays = 30;

/** The longest return address a link takes. */
export const maxReturnUrlLength = 2048;

/** The languages a hosted page is written in. */
export const ConnectLinkLocaleSchema = Schema.Literals(["en", "fr"]).annotate({
  identifier: "ConnectLinkLocale",
});

/**
 * Where a link stands: waiting to be used (`pending`), used (`completed`),
 * taken back (`revoked`), or past its time (`expired`).
 */
export const ConnectLinkStatusSchema = Schema.Literals([
  "pending",
  "completed",
  "revoked",
  "expired",
]).annotate({ identifier: "ConnectLinkStatus" });

export type ConnectLinkStatus = typeof ConnectLinkStatusSchema.Type;

/**
 * A connect link, as its workspace reads it: never its token, which only
 * the address shown when it was created holds.
 */
export const ConnectLinkSchema = Schema.Struct({
  // The channel it reconnects; null when it connects a new account.
  channelId: Schema.NullOr(Schema.String),
  // What it connected, or reconnected, once `completed`.
  channelIds: Schema.Array(Schema.String),
  // When it was used or revoked; null while it waits, and once expired.
  completedAt: Schema.NullOr(Schema.DateTimeUtc),
  createdAt: Schema.DateTimeUtc,
  expiresAt: Schema.DateTimeUtc,
  // How its last sign-in failed, if one did since it last worked.
  failedAt: Schema.NullOr(Schema.DateTimeUtc),
  failure: Schema.NullOr(HostedConnectFailureSchema),
  id: Schema.String,
  platform: PlatformSchema,
  returnUrl: Schema.NullOr(Schema.String),
  status: ConnectLinkStatusSchema,
}).annotate({ identifier: "ConnectLink" });

export type ConnectLink = typeof ConnectLinkSchema.Type;

export const NewConnectLinkSchema = Schema.Struct({
  // Reconnect this channel, instead of connecting a new account: only a
  // sign-in to the channel's own account goes through.
  channelId: Schema.optionalKey(Schema.String),
  // The way in, on the platforms that have several: for Instagram,
  // Instagram Login or Facebook Login; for LinkedIn, the member's profile
  // or the company pages they manage. Left out, the server's first.
  connection: Schema.optionalKey(ChannelConnectionSchema),
  expiresInHours: Schema.optionalKey(
    Schema.Int.check(
      Schema.isBetween({
        maximum: maxConnectLinkHours,
        minimum: minConnectLinkHours,
      })
    )
  ),
  // The language the page opens in; the visitor's own unless given.
  locale: Schema.optionalKey(ConnectLinkLocaleSchema),
  platform: PlatformSchema,
  // Where the page sends people once done: an address on an origin the
  // workspace's partner account registered.
  returnUrl: Schema.optionalKey(
    Schema.String.check(Schema.isBetweenLength(1, maxReturnUrlLength))
  ),
}).annotate({ identifier: "NewConnectLink" });

export type NewConnectLink = typeof NewConnectLinkSchema.Type;

export const CreatedConnectLinkSchema = Schema.Struct({
  link: ConnectLinkSchema,
  // The address to hand to the account's owner, shown this once: it holds
  // the link's token, which Peal keeps only the digest of.
  url: Schema.String,
}).annotate({ identifier: "CreatedConnectLink" });

export type CreatedConnectLink = typeof CreatedConnectLinkSchema.Type;

const workspace = { workspaceId: Schema.String };

const link = { ...workspace, linkId: Schema.String };

/** A workspace's connect links. */
export class ConnectLinksApi extends HttpApiGroup.make("connectLinks")
  .add(
    HttpApiEndpoint.post("create", "/", {
      error: [
        Forbidden,
        ConnectFailed,
        ChannelNotFound,
        ReturnUrlNotAllowed,
        TooManyConnectLinks,
      ],
      params: workspace,
      payload: NewConnectLinkSchema,
      success: CreatedConnectLinkSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Creates a link to hand to whoever owns an account of \`platform\`: it opens a hosted page where they sign in at the platform and, when the sign-in reaches several accounts, pick those to connect, without a Peal account. The answer holds the link's address, shown this once. The link works once, for ${defaultConnectLinkHours} hours unless \`expiresInHours\` (${minConnectLinkHours} to ${maxConnectLinkHours}) says otherwise; with \`channelId\`, it reconnects that channel, and only a sign-in to the channel's own account goes through. \`returnUrl\` is where the page sends them once done, with \`peal_link\` (the link's id) and \`peal_status\` (\`connected\`, \`cancelled\` or \`failed\`) in its query: read the link by its id to know what was connected, as anyone can write those parameters. Its origin must be one the workspace's partner account registered, exactly (422 \`ReturnUrlNotAllowed\` otherwise, and for a workspace without a partner account). Whoever holds the address can connect an account of theirs to the workspace until it is used, revoked or expired: hand it over a channel you trust, and revoke it when it is no longer needed. A platform this server cannot connect answers 422 \`ConnectFailed\`. A workspace has ${maxPendingConnectLinks} links waiting at most. Needs channel:connect.`,
        summary: "Create a connect link",
      })
    ),
    HttpApiEndpoint.get("list", "/", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(ConnectLinkSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's connect links, newest first, the last 100: those waiting, and those used, revoked or expired in the last ${connectLinkRetentionDays} days. Needs channel:read.`,
        summary: "List connect links",
      })
    ),
    HttpApiEndpoint.get("get", "/:linkId", {
      error: [Forbidden, ConnectLinkNotFound],
      params: link,
      success: ConnectLinkSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "One connect link of the workspace: where it stands, the channels it connected once `completed`, and how its last sign-in failed. Read it when a browser comes back to your return address, or on `channel.connected`. Needs channel:read.",
        summary: "Get a connect link",
      })
    ),
    HttpApiEndpoint.delete("revoke", "/:linkId", {
      error: [Forbidden, ConnectLinkNotFound],
      params: link,
      success: ConnectLinkSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Takes a connect link back: it opens nothing more, and a sign-in in progress through it does not complete. A link already used, revoked or expired stays as it is. Answers the link as it now stands. Needs channel:connect.",
        summary: "Revoke a connect link",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/connect-links") {}
