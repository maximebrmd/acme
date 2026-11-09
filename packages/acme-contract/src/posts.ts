import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { InvalidTimeRange } from "./invalid-time-range.ts";
import { InvalidTimeZone } from "./invalid-time-zone.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { PostContentInvalid } from "./post-content-invalid.ts";
import { PostNotFound } from "./post-not-found.ts";
import { PostStatusConflict } from "./post-status-conflict.ts";
import { PostStatusSchema } from "./post-status.ts";
import { PostTargetStatusSchema } from "./post-target-status.ts";
import {
  maxAltTextLength,
  maxMediaPerPost,
  maxPostTextLength,
} from "./post-text.ts";
import { ScheduleInPast } from "./schedule-in-past.ts";
import { TargetStatusConflict } from "./target-status-conflict.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { UnknownMedia } from "./unknown-media.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

const uniqueBy = <A>(key: (item: A) => string, expected: string) =>
  Schema.makeFilter(
    (items: readonly A[]) => new Set(items.map(key)).size === items.length,
    { expected }
  );

const nul = String.fromCodePoint(0);

// Postgres keeps no NUL character in text, and no platform publishes one.
const isWithoutNul = Schema.makeFilter((text: string) => !text.includes(nul), {
  expected: "text without NUL characters",
});

const PostTextSchema = Schema.String.check(
  Schema.isMaxLength(maxPostTextLength),
  isWithoutNul
);

/** An image or a video of the workspace's media, shown with the post. */
export const MediaAttachmentSchema = Schema.Struct({
  // Describes the media to people who cannot see it; empty if none.
  altText: Schema.String.check(
    Schema.isMaxLength(maxAltTextLength),
    isWithoutNul
  ),
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
 * Why a post did not go out on a channel: the platform refused its text or
 * format (`contentRejected`) or a media (`mediaRejected`); its channel was
 * disconnected (`channelDisconnected`) or turned off (`channelDisabled`), or
 * one of its media deleted (`mediaRemoved`), before it went out; Acme was
 * down at its time (`missed`); a member found it missing (`notPublished`);
 * the platform kept limiting Acme (`rateLimited`), refused the account's
 * token (`tokenExpired`) or could not be reached (`unavailable`).
 */
export const FailureReasonSchema = Schema.Literals([
  "contentRejected",
  "channelDisconnected",
  "channelDisabled",
  "mediaRemoved",
  "mediaRejected",
  "missed",
  "notPublished",
  "rateLimited",
  "tokenExpired",
  "unavailable",
]).annotate({ identifier: "FailureReason" });

export type FailureReason = typeof FailureReasonSchema.Type;

/**
 * Why Acme cannot tell whether an unconfirmed post went out: no answer came
 * (`noResponse`), the answer could not be read (`unreadableResponse`), the
 * server stopped during the call (`interrupted`), or Acme's own code failed
 * during it (`adapterFailure`).
 */
export const UnconfirmedReasonSchema = Schema.Literals([
  "noResponse",
  "unreadableResponse",
  "interrupted",
  "adapterFailure",
]).annotate({ identifier: "UnconfirmedReason" });

export type UnconfirmedReason = typeof UnconfirmedReasonSchema.Type;

/** A post on one of its channels. */
export const PostTargetSchema = Schema.Struct({
  channelId: Schema.String,
  // Why it failed, once it has.
  failureReason: Schema.NullOr(FailureReasonSchema),
  id: Schema.String,
  // Its address on the platform, when the platform gave one, or the member
  // who confirmed it.
  permalink: Schema.NullOr(Schema.String),
  // When it went live, once it has.
  publishedAt: Schema.NullOr(Schema.DateTimeUtc),
  // How many times it was sent: 1, and one more for each repost.
  round: Schema.Int,
  status: PostTargetStatusSchema,
  // Why Acme cannot tell whether it went out, while it is unconfirmed.
  unconfirmedReason: Schema.NullOr(UnconfirmedReasonSchema),
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
  // The user who created it; null when an API key did.
  authorId: Schema.NullOr(Schema.String),
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

/** A page of drafts, newest first. */
export const DraftPageSchema = Schema.Struct({
  items: Schema.Array(PostSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "DraftPage" });

export type DraftPage = typeof DraftPageSchema.Type;

/** How many drafts a page holds, unless `limit` says otherwise. */
export const defaultDraftPageSize = 20;

/** The most drafts a page holds. */
export const maxDraftPageSize = 50;

/**
 * How one attempt at publishing on a channel ended: `published`;
 * `unconfirmed`, when Acme could not tell; or why it did not go out, as in
 * `FailureReason`. A `rateLimited` or `unavailable` attempt is followed by
 * another unless Acme gave up.
 */
export const AttemptResultSchema = Schema.Literals([
  "published",
  "unconfirmed",
  "contentRejected",
  "channelDisconnected",
  "channelDisabled",
  "mediaRemoved",
  "mediaRejected",
  "rateLimited",
  "tokenExpired",
  "unavailable",
]).annotate({ identifier: "AttemptResult" });

export type AttemptResult = typeof AttemptResultSchema.Type;

/** One attempt at publishing a post on one of its channels. */
export const PublicationAttemptSchema = Schema.Struct({
  // Its number in its round, from 1.
  attempt: Schema.Int,
  finishedAt: Schema.DateTimeUtc,
  result: AttemptResultSchema,
  // When Acme tried again, if it did.
  retryAt: Schema.NullOr(Schema.DateTimeUtc),
  // The round it belongs to: 1, and one more for each repost.
  round: Schema.Int,
  startedAt: Schema.DateTimeUtc,
  targetId: Schema.String,
}).annotate({ identifier: "PublicationAttempt" });

export type PublicationAttempt = typeof PublicationAttemptSchema.Type;

const isWebAddress = Schema.makeFilter(
  (address: string) => {
    if (!URL.canParse(address)) {
      return false;
    }

    const { protocol } = new URL(address);

    return protocol === "https:" || protocol === "http:";
  },
  { expected: "an http or https URL" }
);

/**
 * What a member found on the platform for an unconfirmed post: it is live,
 * at `permalink` if they give it, or it is not there.
 */
export const TargetConfirmationSchema = Schema.Union([
  Schema.TaggedStruct("published", {
    permalink: Schema.NullOr(
      Schema.String.check(Schema.isMaxLength(2048), isWebAddress)
    ),
  }),
  Schema.TaggedStruct("notPublished", {}),
]).annotate({ identifier: "TargetConfirmation" });

export type TargetConfirmation = typeof TargetConfirmationSchema.Type;

const workspace = { workspaceId: Schema.String };

const post = { ...workspace, postId: Schema.String };

const target = { ...post, targetId: Schema.String };

const followUp = [
  Forbidden,
  PostNotFound,
  PostStatusConflict,
  TargetStatusConflict,
];

const scheduling = [
  Forbidden,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  InvalidTimeZone,
  PostContentInvalid,
  UnknownChannels,
  UnknownMedia,
  PlanLimitReached,
];

/** A workspace's posts: drafts, the calendar, scheduling, and outcomes. */
export class PostsApi extends HttpApiGroup.make("posts")
  .add(
    HttpApiEndpoint.get("drafts", "/drafts", {
      error: [Forbidden, HttpApiError.BadRequest],
      params: workspace,
      query: {
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxDraftPageSize, minimum: 1 })
          )
        ),
      },
      success: DraftPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's drafts, newest first, ${defaultDraftPageSize} a page unless \`limit\` (at most ${maxDraftPageSize}) says otherwise. Pass the page's \`nextCursor\` as \`cursor\` for the next one. Needs post:read.`,
        summary: "List drafts",
      })
    ),
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
          "Creates a draft for some of the workspace's channels, possibly none yet. Its media must be the workspace's, and ready. Its text and media are checked against each platform's limits when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.",
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
    HttpApiEndpoint.get("attempts", "/:postId/attempts", {
      error: [Forbidden, PostNotFound],
      params: post,
      success: Schema.Array(PublicationAttemptSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists every attempt Acme made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.",
        summary: "List a post's attempts",
      })
    ),
    HttpApiEndpoint.delete("discard", "/:postId", {
      error: [Forbidden, PostNotFound, PostStatusConflict],
      params: post,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.",
        summary: "Discard a draft",
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
          "Replaces a draft's content and channels. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.",
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
          "Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.",
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
          "Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.",
        summary: "Reschedule a post",
      })
    ),
    HttpApiEndpoint.post("unschedule", "/:postId/unschedule", {
      error: [Forbidden, PostNotFound, PostStatusConflict],
      params: post,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.",
        summary: "Unschedule a post",
      })
    ),
    HttpApiEndpoint.post("repost", "/:postId/targets/:targetId/repost", {
      error: followUp,
      params: target,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.",
        summary: "Repost on a channel",
      })
    ),
    HttpApiEndpoint.post("confirm", "/:postId/targets/:targetId/confirm", {
      error: followUp,
      params: target,
      payload: TargetConfirmationSchema,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.",
        summary: "Confirm a post on a channel",
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
