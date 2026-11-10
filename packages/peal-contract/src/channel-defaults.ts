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
import { PostContentInvalid } from "./post-content-invalid.ts";
import { TargetOptionsSchema } from "./target-options.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/**
 * The options a workspace's new posts take on a channel when they give
 * none there; null when the channel has none.
 */
export const ChannelDefaultsSchema = Schema.Struct({
  options: Schema.NullOr(TargetOptionsSchema),
}).annotate({ identifier: "ChannelDefaults" });

export type ChannelDefaults = typeof ChannelDefaultsSchema.Type;

/** The options to keep as a channel's defaults. */
export const NewChannelDefaultsSchema = Schema.Struct({
  options: TargetOptionsSchema,
}).annotate({ identifier: "NewChannelDefaults" });

export type NewChannelDefaults = typeof NewChannelDefaultsSchema.Type;

const channel = { channelId: Schema.String, workspaceId: Schema.String };

/** A channel's default options, which new posts take when they give none. */
export class ChannelDefaultsApi extends HttpApiGroup.make("channelDefaults")
  .add(
    HttpApiEndpoint.get("get", "/", {
      error: [Forbidden, ChannelNotFound],
      params: channel,
      success: ChannelDefaultsSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers the options new posts take on the channel when they give none there, or null. Needs post:read and channel:read.",
        summary: "Get a channel's default options",
      })
    ),
    HttpApiEndpoint.put("set", "/", {
      error: [Forbidden, ChannelNotFound, PostContentInvalid],
      params: channel,
      payload: NewChannelDefaultsSchema,
      success: ChannelDefaultsSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Keeps these as the channel's default options, instead of any it had: options of the channel's own platform (`TargetOptions`), unfinished as a draft's may be. A new draft, and a post made in one call, takes them on the channel when it gives no options there and no channel set it names does; a draft that is updated keeps what it is given. Defaults are a starting point, never a way round the rules: a post that takes them is checked when it is scheduled as one that wrote them itself. Needs post:update and channel:read.",
        summary: "Set a channel's default options",
      })
    ),
    HttpApiEndpoint.delete("clear", "/", {
      error: [Forbidden, ChannelNotFound],
      params: channel,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Leaves the channel without default options. Posts already made keep theirs. Needs post:update and channel:read.",
        summary: "Clear a channel's default options",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/channels/:channelId/default-options") {}
