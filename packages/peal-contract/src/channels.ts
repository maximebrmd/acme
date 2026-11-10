import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { ConnectFailed } from "./connect-failed.ts";
import { Forbidden } from "./forbidden.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { PlatformUnreachable } from "./platform-unreachable.ts";
import {
  ChannelConnectionSchema,
  InstagramConnectionSchema,
  LinkedInConnectionSchema,
  PlatformSchema,
} from "./platform.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/**
 * Whether a channel posts:
 *
 * - `active`: posts go out.
 * - `refreshNeeded`: the platform no longer accepts the channel's token, and
 *   the user must reconnect the account.
 * - `disabled`: turned off, so nothing goes out. `refreshNeeded` tells
 *   whether the token stopped working meanwhile, so that turning the channel
 *   back on will ask to reconnect it.
 */
export const ChannelStatusSchema = Schema.Union([
  Schema.TaggedStruct("active", {}),
  Schema.TaggedStruct("refreshNeeded", {}),
  Schema.TaggedStruct("disabled", { refreshNeeded: Schema.Boolean }),
]).annotate({ identifier: "ChannelStatus" });

export type ChannelStatus = typeof ChannelStatusSchema.Type;

/** The longest name a workspace gives one of its channels. */
export const maxChannelLabelLength = 60;

/** The most channels a page of the search holds, and how many when not told. */
export const maxChannelPageSize = 100;

export const defaultChannelPageSize = 50;

/** The longest text a search for channels takes. */
export const maxChannelQueryLength = 100;

/** A social account connected to the workspace, without its tokens. */
export const ChannelSchema = Schema.Struct({
  // The account's picture, as the platform serves it.
  avatarUrl: Schema.NullOr(Schema.String),
  // How an Instagram channel reaches its account (through Instagram Login
  // or through a Facebook Page), or what a LinkedIn channel posts as (a
  // member's profile or a company page). Null on other platforms.
  connection: Schema.NullOr(ChannelConnectionSchema),
  // The account's name, when the platform shows one besides the handle.
  displayName: Schema.NullOr(Schema.String),
  handle: Schema.String,
  id: Schema.String,
  // The name the workspace gave the channel, shown in Peal beside the
  // platform's handle and name, and sent nowhere; null when it gave none.
  label: Schema.NullOr(Schema.String),
  platform: PlatformSchema,
  status: ChannelStatusSchema,
  // When the account's token stops working, for a token the platform does
  // not let Peal renew: the user must reconnect the account before then.
  // Null when the token renews itself or never expires.
  tokenExpiresAt: Schema.NullOr(Schema.DateTimeUtc),
}).annotate({ identifier: "Channel" });

export type Channel = typeof ChannelSchema.Type;

/** What a workspace changes of a channel it keeps: its name there. */
export const ChannelUpdateSchema = Schema.Struct({
  // One line, without spaces around it; null takes the name back.
  label: Schema.NullOr(
    Schema.String.check(
      Schema.isBetweenLength(1, maxChannelLabelLength),
      Schema.makeFilter((label: string) => label === label.trim(), {
        expected: "a name without spaces around it",
      }),
      Schema.makeFilter((label: string) => !/\p{Cc}/u.test(label), {
        expected: "a name on one line, without control characters",
      })
    )
  ),
}).annotate({ identifier: "ChannelUpdate" });

export type ChannelUpdate = typeof ChannelUpdateSchema.Type;

/** A channel's status, by name, as a list is narrowed to one. */
export const ChannelStatusNameSchema = Schema.Literals([
  "active",
  "refreshNeeded",
  "disabled",
]).annotate({ identifier: "ChannelStatusName" });

export type ChannelStatusName = typeof ChannelStatusNameSchema.Type;

/** A page of the workspace's channels, oldest first. */
export const ChannelPageSchema = Schema.Struct({
  // How many channels the platform and text asked for match, by status,
  // whatever the status asked for.
  counts: Schema.Struct({
    active: Schema.Int,
    disabled: Schema.Int,
    refreshNeeded: Schema.Int,
  }),
  items: Schema.Array(ChannelSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "ChannelPage" });

export type ChannelPage = typeof ChannelPageSchema.Type;

/**
 * What starting a connection needs, by platform: Mastodon asks which
 * instance the account lives on, Bluesky may take the account's handle
 * (or DID, or its server's address) so the sign-in page knows it, and
 * Instagram may take the way in.
 */
export const ConnectChannelSchema = Schema.Struct({
  // Instagram: sign in with Instagram Login or with Facebook Login.
  // LinkedIn: connect the member's profile or the pages they administer.
  // Left out, the server's first way for the platform
  // (`instagramConnections`, `linkedinConnections` in the connectable
  // platforms). One of another platform is ignored.
  connection: Schema.optionalKey(ChannelConnectionSchema),
  // A Bluesky handle such as "peal.bsky.social", a DID, or a server URL.
  handle: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  // A Mastodon instance, as "mastodon.social" or "https://mastodon.social".
  instance: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
}).annotate({ identifier: "ConnectChannel" });

export type ConnectChannel = typeof ConnectChannelSchema.Type;

/**
 * Where to send the browser to sign in to the platform. The platform sends it
 * back to the web app's callback page, which completes the connection.
 */
export const AuthorizationSchema = Schema.Struct({
  authorizationUrl: Schema.String,
}).annotate({ identifier: "Authorization" });

export type Authorization = typeof AuthorizationSchema.Type;

/**
 * The platforms this server can connect accounts of: those Peal has a
 * sign-in flow for, and whose settings the server has, such as an app
 * registered on LinkedIn, X or Meta, or a Google OAuth client. Clients offer only these.
 */
export const ConnectablePlatformsSchema = Schema.Struct({
  // The ways this server connects Instagram accounts, the one it prefers
  // first; empty when Instagram is not among the platforms.
  instagramConnections: Schema.Array(InstagramConnectionSchema),
  // What this server connects on LinkedIn: profiles, pages, or both; empty
  // when LinkedIn is not among the platforms.
  linkedinConnections: Schema.Array(LinkedInConnectionSchema),
  platforms: Schema.Array(PlatformSchema),
}).annotate({ identifier: "ConnectablePlatforms" });

export type ConnectablePlatforms = typeof ConnectablePlatformsSchema.Type;

/**
 * What the platform added to the callback page's address: the `state` that
 * names the connection, and either a `code` or an `error`. Bluesky adds the
 * issuer as `iss`.
 */
export const ConnectCallbackSchema = Schema.Struct({
  code: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048))),
  error: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  iss: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048))),
  state: Schema.String.check(Schema.isBetweenLength(1, 256)),
}).annotate({ identifier: "ConnectCallback" });

export type ConnectCallback = typeof ConnectCallbackSchema.Type;

/**
 * An account a sign-in reached, which the member may choose to connect: a
 * Facebook Page, or an Instagram account linked to one.
 */
export const ChoosableAccountSchema = Schema.Struct({
  // The account's id on the platform, which choosing it names.
  accountId: Schema.String,
  avatarUrl: Schema.NullOr(Schema.String),
  // Whether the workspace has a channel for it: choosing it reconnects that
  // channel.
  connected: Schema.Boolean,
  displayName: Schema.NullOr(Schema.String),
  handle: Schema.String,
}).annotate({ identifier: "ChoosableAccount" });

export type ChoosableAccount = typeof ChoosableAccountSchema.Type;

/**
 * How completing a connection ended: the account became a channel
 * (`connected`), or the sign-in reached several accounts (`choose`), among
 * which the member picks before `expiresAt`, sending back `selection`.
 */
export const ConnectOutcomeSchema = Schema.Union([
  Schema.TaggedStruct("connected", { channel: ChannelSchema }),
  Schema.TaggedStruct("choose", {
    accounts: Schema.Array(ChoosableAccountSchema),
    expiresAt: Schema.DateTimeUtc,
    selection: Schema.String,
  }),
]).annotate({ identifier: "ConnectOutcome" });

export type ConnectOutcome = typeof ConnectOutcomeSchema.Type;

/** The accounts a member chose among those a sign-in reached. */
export const ChooseAccountsSchema = Schema.Struct({
  accountIds: Schema.Array(
    Schema.String.check(Schema.isBetweenLength(1, 256))
  ).check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  selection: Schema.String.check(Schema.isBetweenLength(1, 256)),
}).annotate({ identifier: "ChooseAccounts" });

export type ChooseAccounts = typeof ChooseAccountsSchema.Type;

const workspace = { workspaceId: Schema.String };

// Reconnecting adds no channel, so no plan limit refuses it.
const reconnectErrors = [
  Forbidden,
  ConnectFailed,
  PlatformUnreachable,
] as const;

const connectErrors = [...reconnectErrors, PlanLimitReached] as const;

/** The social accounts connected to a workspace. */
export class ChannelsApi extends HttpApiGroup.make("channels")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(ChannelSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.",
        summary: "List channels",
      })
    ),
    HttpApiEndpoint.get("search", "/search", {
      error: [Forbidden, HttpApiError.BadRequest],
      params: workspace,
      query: {
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxChannelPageSize, minimum: 1 })
          )
        ),
        platform: Schema.optionalKey(PlatformSchema),
        q: Schema.optionalKey(
          Schema.String.check(Schema.isBetweenLength(1, maxChannelQueryLength))
        ),
        status: Schema.optionalKey(ChannelStatusNameSchema),
      },
      success: ChannelPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's channels a page at a time, oldest first: ${defaultChannelPageSize} unless \`limit\` (at most ${maxChannelPageSize}) says otherwise. Every filter given must hold: \`platform\`, \`status\` (\`active\`, \`refreshNeeded\` or \`disabled\`) and \`q\`, text the channel's handle, the name its platform shows or the name the workspace gave it holds, whatever its case. \`counts\` says how many channels the platform and text match in each status, whatever the status asked for. Pass the page's \`nextCursor\` as \`cursor\`, with the same filters, for the next page; a cursor no page gave is a bad request. Needs channel:read.`,
        summary: "Search channels",
      })
    ),
    HttpApiEndpoint.get("platforms", "/platforms", {
      error: Forbidden,
      params: workspace,
      success: ConnectablePlatformsSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.",
        summary: "List connectable platforms",
      })
    ),
    HttpApiEndpoint.post("connect", "/connect/:platform", {
      error: connectErrors,
      params: { ...workspace, platform: PlatformSchema },
      payload: ConnectChannelSchema,
      success: AuthorizationSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. For Instagram, `connection` picks Instagram Login (the professional account itself, no Facebook Page needed) or Facebook Login (the accounts linked to the caller's Pages); without it, the server's preferred way. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.",
        summary: "Start connecting an account",
      })
    ),
    HttpApiEndpoint.post("completeConnect", "/connect/:platform/callback", {
      error: [...connectErrors, ChannelNotFound],
      params: { ...workspace, platform: PlatformSchema },
      payload: ConnectCallbackSchema,
      success: ConnectOutcomeSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached). Needs channel:connect.",
        summary: "Complete connecting an account",
      })
    ),
    HttpApiEndpoint.post("chooseAccounts", "/connect/:platform/accounts", {
      error: [...connectErrors, ChannelNotFound],
      params: { ...workspace, platform: PlatformSchema },
      payload: ChooseAccountsSchema,
      success: Schema.Array(ChannelSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace's plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.",
        summary: "Choose the accounts to connect",
      })
    ),
    HttpApiEndpoint.post("reconnect", "/:channelId/reconnect", {
      error: [...reconnectErrors, ChannelNotFound],
      params: { ...workspace, channelId: Schema.String },
      success: AuthorizationSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. Needs channel:connect.",
        summary: "Start reconnecting a channel",
      })
    ),
    HttpApiEndpoint.patch("update", "/:channelId", {
      error: [Forbidden, ChannelNotFound],
      params: { ...workspace, channelId: Schema.String },
      payload: ChannelUpdateSchema,
      success: ChannelSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Gives the channel the name the workspace calls it by (\`label\`, ${maxChannelLabelLength} characters at most, on one line), or takes it back with null. The name is Peal's own: it is shown beside the handle and name the platform gives the account, which stay, and is sent to no platform. Needs channel:connect.`,
        summary: "Rename a channel",
      })
    ),
    HttpApiEndpoint.post("disable", "/:channelId/disable", {
      error: [Forbidden, ChannelNotFound],
      params: { ...workspace, channelId: Schema.String },
      success: ChannelSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Turns the channel off: nothing goes out on it until it is turned back on. It keeps its connection, its history, its name and its place in the plan's count, and no reconnect reminder is sent meanwhile. A post that reaches its time while the channel is off fails on that channel (`channelDisabled`) and goes out on its others; it is not sent later. A channel already off stays as it is. Needs channel:connect.",
        summary: "Turn a channel off",
      })
    ),
    HttpApiEndpoint.post("enable", "/:channelId/enable", {
      error: [Forbidden, ChannelNotFound],
      params: { ...workspace, channelId: Schema.String },
      success: ChannelSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Turns a channel back on. It posts again at once, or has the status `refreshNeeded` when its token stopped working or ran out while it was off: reconnect the account then. A channel that is on stays as it is. Needs channel:connect.",
        summary: "Turn a channel back on",
      })
    ),
    HttpApiEndpoint.delete("disconnect", "/:channelId", {
      error: [Forbidden, ChannelNotFound],
      params: { ...workspace, channelId: Schema.String },
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.",
        summary: "Disconnect a channel",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/channels") {}
