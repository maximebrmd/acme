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
import { Forbidden } from "./forbidden.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { PlatformUnreachable } from "./platform-unreachable.ts";
import { PlatformSchema } from "./platform.ts";
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

/** A social account connected to the workspace, without its tokens. */
export const ChannelSchema = Schema.Struct({
  // The account's picture, as the platform serves it.
  avatarUrl: Schema.NullOr(Schema.String),
  // The account's name, when the platform shows one besides the handle.
  displayName: Schema.NullOr(Schema.String),
  handle: Schema.String,
  id: Schema.String,
  platform: PlatformSchema,
  status: ChannelStatusSchema,
  // When the account's token stops working, for a token the platform does
  // not let Acme renew: the user must reconnect the account before then.
  // Null when the token renews itself or never expires.
  tokenExpiresAt: Schema.NullOr(Schema.DateTimeUtc),
}).annotate({ identifier: "Channel" });

export type Channel = typeof ChannelSchema.Type;

/**
 * What starting a connection needs, by platform: Mastodon asks which
 * instance the account lives on, and Bluesky may take the account's handle
 * (or DID, or its server's address) so the sign-in page knows it.
 */
export const ConnectChannelSchema = Schema.Struct({
  // A Bluesky handle such as "acme.bsky.social", a DID, or a server URL.
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
 * The platforms this server can connect accounts of: those Acme has a
 * sign-in flow for, and whose settings the server has, such as an app
 * registered on LinkedIn or X. Clients offer only these.
 */
export const ConnectablePlatformsSchema = Schema.Struct({
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

const workspace = { workspaceId: Schema.String };

const connectErrors = [
  Forbidden,
  ConnectFailed,
  PlatformUnreachable,
  PlanLimitReached,
] as const;

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
    HttpApiEndpoint.get("platforms", "/platforms", {
      error: Forbidden,
      params: workspace,
      success: ConnectablePlatformsSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the platforms this server can connect accounts of, in Acme's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn or X, is left out. Needs channel:read.",
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
          "Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.",
        summary: "Start connecting an account",
      })
    ),
    HttpApiEndpoint.post("completeConnect", "/connect/:platform/callback", {
      error: [...connectErrors, ChannelNotFound],
      params: { ...workspace, platform: PlatformSchema },
      payload: ConnectCallbackSchema,
      success: ChannelSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached). Needs channel:connect.",
        summary: "Complete connecting an account",
      })
    ),
    HttpApiEndpoint.post("reconnect", "/:channelId/reconnect", {
      error: [...connectErrors, ChannelNotFound],
      params: { ...workspace, channelId: Schema.String },
      success: AuthorizationSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. Needs channel:connect.",
        summary: "Start reconnecting a channel",
      })
    ),
    HttpApiEndpoint.delete("disconnect", "/:channelId", {
      error: [Forbidden, ChannelNotFound],
      params: { ...workspace, channelId: Schema.String },
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Disconnects a channel from the workspace: the channel and the tokens Acme holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.",
        summary: "Disconnect a channel",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/channels") {}
