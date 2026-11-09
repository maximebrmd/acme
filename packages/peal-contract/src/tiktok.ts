import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ChannelCannotPost } from "./channel-cannot-post.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { Forbidden } from "./forbidden.ts";
import { PlatformUnreachable } from "./platform-unreachable.ts";
import { TikTokPrivacyLevelSchema } from "./target-options.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/**
 * A TikTok creator's posting settings, fresh from TikTok, which a client
 * shows before a post as TikTok's content sharing guidelines ask: who it
 * goes out as, the audiences the account offers (no default: the creator
 * picks one), the interactions they turned off, and their longest video.
 */
export const TikTokCreatorSchema = Schema.Struct({
  avatarUrl: Schema.NullOr(Schema.String),
  // Comments are off in the creator's settings: show the box off, greyed.
  commentDisabled: Schema.Boolean,
  // Duets and Stitches are off, as on every private account. Photo posts
  // have neither.
  duetDisabled: Schema.Boolean,
  // The longest video the creator may post, in milliseconds; null when
  // TikTok does not say.
  maxVideoDurationMs: Schema.NullOr(Schema.Int),
  nickname: Schema.String,
  privacyLevels: Schema.Array(TikTokPrivacyLevelSchema),
  stitchDisabled: Schema.Boolean,
  username: Schema.String,
}).annotate({ identifier: "TikTokCreator" });

export type TikTokCreator = typeof TikTokCreatorSchema.Type;

/**
 * Why a creator cannot post now: their posts for the day are spent
 * (`postLimit`), they are banned from posting (`banned`), or this server's
 * app reached its count of creators for the day (`clientLimit`).
 */
export const TikTokBlockSchema = Schema.Literals([
  "postLimit",
  "banned",
  "clientLimit",
]).annotate({ identifier: "TikTokBlock" });

export type TikTokBlock = typeof TikTokBlockSchema.Type;

/** A TikTok channel's creator, as the composer shows them. */
export const TikTokAccountSchema = Schema.Struct({
  posting: Schema.Union([
    Schema.TaggedStruct("ready", { creator: TikTokCreatorSchema }),
    Schema.TaggedStruct("blocked", { reason: TikTokBlockSchema }),
  ]),
  // Whether this server can post photos to TikTok, which TikTok takes only
  // from an address verified for the server's app.
  takesPhotos: Schema.Boolean,
}).annotate({ identifier: "TikTokAccount" });

export type TikTokAccount = typeof TikTokAccountSchema.Type;

/** What TikTok channels tell about posting on them. */
export class TikTokApi extends HttpApiGroup.make("tiktok")
  .add(
    HttpApiEndpoint.get("creator", "/:channelId/tiktok-creator", {
      error: [
        Forbidden,
        ChannelNotFound,
        ChannelCannotPost,
        PlatformUnreachable,
      ],
      params: { channelId: Schema.String, workspaceId: Schema.String },
      success: TikTokAccountSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Reads a TikTok channel's creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok's is ChannelNotFound. Needs post:create.",
        summary: "Read a TikTok channel's creator",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/channels") {}
