import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { Forbidden } from "./forbidden.ts";
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

const workspace = { workspaceId: Schema.String };

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
