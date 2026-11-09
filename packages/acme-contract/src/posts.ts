import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { InvalidTimeRange } from "./invalid-time-range.ts";
import { InvalidTimeZone } from "./invalid-time-zone.ts";
import { PostContentInvalid } from "./post-content-invalid.ts";
import { PostNotFound } from "./post-not-found.ts";
import { PostStatusConflict } from "./post-status-conflict.ts";
import { PostStatusSchema } from "./post-status.ts";
import {
  maxAltTextLength,
  maxMediaPerPost,
  maxPostTextLength,
} from "./post-text.ts";
import { ScheduleInPast } from "./schedule-in-past.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { UnknownMedia } from "./unknown-media.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

const uniqueBy = <A>(key: (item: A) => string, expected: string) =>
  Schema.makeFilter(
    (items: readonly A[]) => new Set(items.map(key)).size === items.length,
    { expected }
  );

const PostTextSchema = Schema.String.check(
  Schema.isMaxLength(maxPostTextLength)
);

/** An image or a video of the workspace's media, shown with the post. */
export const MediaAttachmentSchema = Schema.Struct({
  // Describes the media to people who cannot see it; empty if none.
  altText: Schema.String.check(Schema.isMaxLength(maxAltTextLength)),
  mediaId: Schema.String,
}).annotate({ identifier: "MediaAttachment" });

export type MediaAttachment = typeof MediaAttachmentSchema.Type;

/** The text a post has on one of its channels instead of its own. */
export const TextOverrideSchema = Schema.Struct({
  channelId: Schema.String,
  text: PostTextSchema.check(Schema.isNonEmpty()),
}).annotate({ identifier: "TextOverride" });

export type TextOverride = typeof TextOverrideSchema.Type;

/**
 * What a post says: plain text, with mentions and hashtags written as text;
 * the media it shows, in order; and the text it has instead on some of its
 * channels.
 */
export const PostContentSchema = Schema.Struct({
  media: Schema.Array(MediaAttachmentSchema).check(
    Schema.isMaxLength(maxMediaPerPost),
    uniqueBy(
      (attachment: MediaAttachment) => attachment.mediaId,
      "each media attached once"
    )
  ),
  overrides: Schema.Array(TextOverrideSchema).check(
    uniqueBy(
      (override: TextOverride) => override.channelId,
      "one text per channel"
    )
  ),
  text: PostTextSchema,
}).annotate({ identifier: "PostContent" });

export type PostContent = typeof PostContentSchema.Type;

/** How a post ended across its channels, once it finished. */
export const PostOutcomeSchema = Schema.Literals([
  "published",
  "partiallyPublished",
  "unconfirmed",
  "failed",
  "cancelled",
]).annotate({ identifier: "PostOutcome" });

export type PostOutcome = typeof PostOutcomeSchema.Type;

/**
 * Where a post is on one channel. `unconfirmed` means Acme could not tell
 * whether the platform published it: the user checks before reposting.
 */
export const PostTargetStatusSchema = Schema.Literals([
  "pending",
  "publishing",
  "published",
  "failed",
  "unconfirmed",
  "cancelled",
]).annotate({ identifier: "PostTargetStatus" });

export type PostTargetStatus = typeof PostTargetStatusSchema.Type;

/** Why a post did not go out on a channel. */
export const FailureReasonSchema = Schema.Literals([
  "contentRejected",
  "mediaRejected",
  "missed",
  "notPublished",
  "rateLimited",
  "tokenExpired",
  "unavailable",
]).annotate({ identifier: "FailureReason" });

export type FailureReason = typeof FailureReasonSchema.Type;

/** A post on one of its channels. */
export const PostTargetSchema = Schema.Struct({
  channelId: Schema.String,
  // Why it failed, once it has.
  failureReason: Schema.NullOr(FailureReasonSchema),
  id: Schema.String,
  // Its address on the platform, when the platform gave one.
  permalink: Schema.NullOr(Schema.String),
  // When it went live, once it has.
  publishedAt: Schema.NullOr(Schema.DateTimeUtc),
  status: PostTargetStatusSchema,
}).annotate({ identifier: "PostTarget" });

export type PostTarget = typeof PostTargetSchema.Type;

/** When a post goes out: the instant, and the IANA zone it was chosen in. */
export const PostScheduleSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  timeZone: Schema.String,
}).annotate({ identifier: "PostSchedule" });

export type PostSchedule = typeof PostScheduleSchema.Type;

/** A post, what it says and where it goes. */
export const PostSchema = Schema.Struct({
  content: PostContentSchema,
  id: Schema.String,
  // How it ended, once it finished.
  outcome: Schema.NullOr(PostOutcomeSchema),
  // Its time, unless it is a draft. A cancelled post keeps the time it had.
  schedule: Schema.NullOr(PostScheduleSchema),
  status: PostStatusSchema,
  // One per channel, oldest first.
  targets: Schema.Array(PostTargetSchema),
}).annotate({ identifier: "Post" });

export type Post = typeof PostSchema.Type;

/** A draft: what it says, and the channels it is for so far. */
export const PostDraftSchema = Schema.Struct({
  channelIds: Schema.Array(Schema.String),
  content: PostContentSchema,
}).annotate({ identifier: "PostDraft" });

export type PostDraft = typeof PostDraftSchema.Type;

/** A draft's time and channels. */
export const SchedulePostSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  channelIds: Schema.NonEmptyArray(Schema.String),
  timeZone: Schema.String,
}).annotate({ identifier: "SchedulePost" });

export type SchedulePost = typeof SchedulePostSchema.Type;

const workspace = { workspaceId: Schema.String };

const post = { ...workspace, postId: Schema.String };

const scheduling = [
  Forbidden,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  InvalidTimeZone,
  PostContentInvalid,
  UnknownChannels,
  UnknownMedia,
];

/** A workspace's posts: drafts, the calendar, and scheduling. */
export class PostsApi extends HttpApiGroup.make("posts")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden, InvalidTimeRange],
      params: workspace,
      query: { from: Schema.DateTimeUtc, to: Schema.DateTimeUtc },
      success: Schema.Array(PostSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.",
        summary: "List scheduled posts",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [Forbidden, PostContentInvalid, UnknownChannels, UnknownMedia],
      params: workspace,
      payload: PostDraftSchema,
      success: PostSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Creates a draft for some of the workspace's channels, possibly none yet. Its text is checked against each platform's limits when it is scheduled, not before. Needs post:create and channel:read.",
        summary: "Create a draft",
      })
    ),
    HttpApiEndpoint.get("get", "/:postId", {
      error: [Forbidden, PostNotFound],
      params: post,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: "Answers with a post of the workspace. Needs post:read.",
        summary: "Get a post",
      })
    ),
    HttpApiEndpoint.put("update", "/:postId", {
      error: [
        Forbidden,
        PostNotFound,
        PostStatusConflict,
        PostContentInvalid,
        UnknownChannels,
        UnknownMedia,
      ],
      params: post,
      payload: PostDraftSchema,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Replaces a draft's content and channels. A post that is no longer a draft is a conflict. Needs post:update and channel:read.",
        summary: "Update a draft",
      })
    ),
    HttpApiEndpoint.post("schedule", "/:postId/schedule", {
      error: scheduling,
      params: post,
      payload: SchedulePostSchema,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules. A time up to a minute ago publishes now. Needs post:schedule and channel:read.",
        summary: "Schedule a draft",
      })
    ),
    HttpApiEndpoint.post("reschedule", "/:postId/reschedule", {
      error: scheduling,
      params: post,
      payload: PostScheduleSchema,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Moves a scheduled post to another instant, or schedules a draft on the channels it has. Needs post:schedule, and channel:read for a draft.",
        summary: "Reschedule a post",
      })
    ),
    HttpApiEndpoint.post("cancel", "/:postId/cancel", {
      error: [Forbidden, PostNotFound, PostStatusConflict],
      params: post,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.",
        summary: "Cancel a post",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/posts") {}
