import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ChannelSetNotFound } from "./channel-set-not-found.ts";
import {
  ChannelSetReferencesSchema,
  PostWarningSchema,
} from "./channel-sets.ts";
import { DuplicatePost, duplicateWindowHours } from "./duplicate-post.ts";
import { Forbidden } from "./forbidden.ts";
import { IdempotencyKeyReused } from "./idempotency-key-reused.ts";
import { ImportUnreadable } from "./import-unreadable.ts";
import { InvalidTimeRange } from "./invalid-time-range.ts";
import { InvalidTimeZone } from "./invalid-time-zone.ts";
import {
  LivePostChangeSchema,
  LivePostChangesSchema,
  LivePostEditSchema,
  PostUnpublishSchema,
} from "./live-post-changes.ts";
import { LivePostNotChangeable } from "./live-post-not-changeable.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { PlatformSchema } from "./platform.ts";
import {
  ImportCellProblemSchema,
  maxBulkPosts,
  maxImportLength,
  maxImportRows,
  PostRefusalSchema,
} from "./post-batches.ts";
import { PostContentInvalid } from "./post-content-invalid.ts";
import { PostNotFound } from "./post-not-found.ts";
import { PostStatusConflict } from "./post-status-conflict.ts";
import { PostStatusSchema } from "./post-status.ts";
import { PostTargetStatusSchema } from "./post-target-status.ts";
import {
  maxAltTextLength,
  maxFollowUps,
  maxMediaPerPost,
  maxPartDelaySeconds,
  maxPostTextLength,
} from "./post-text.ts";
import { PostValidationSchema } from "./post-validation.ts";
import { QueueHasNoRoom } from "./queue-has-no-room.ts";
import { QueueNotFound } from "./queue-not-found.ts";
import { queueHorizonDays } from "./queues.ts";
import { ScheduleInPast } from "./schedule-in-past.ts";
import { SignatureNotFound } from "./signature-not-found.ts";
import { maxTagsPerPost, PostTagIdsSchema } from "./tags.ts";
import { ChannelOptionsSchema, TargetOptionsSchema } from "./target-options.ts";
import type { ChannelOptions } from "./target-options.ts";
import { TargetStatusConflict } from "./target-status-conflict.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { UnknownMedia } from "./unknown-media.ts";
import { UnknownTags } from "./unknown-tags.ts";
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

// The media one part shows, in order: each file once.
const PartMediaSchema = Schema.Array(MediaAttachmentSchema).check(
  Schema.isMaxLength(maxMediaPerPost),
  uniqueBy(
    (attachment: MediaAttachment) => attachment.mediaId,
    "each media attached once"
  )
);

// The text one part has instead on some channels.
const PartOverridesSchema = Schema.Array(TextOverrideSchema).check(
  uniqueBy(
    (override: TextOverride) => override.channelId,
    "one text per channel"
  )
);

/**
 * A part of a post that follows its first: its text, the media it shows,
 * the text it has instead on some channels, and how many seconds it waits
 * after the part before it went out (0: at once; a day at most). On a
 * platform with threads it goes out as a reply to the part before it; on
 * one that takes comments, as a comment under the post
 * (`followUps` in the platform's capabilities).
 */
export const PostPartSchema = Schema.Struct({
  delaySeconds: Schema.Int.check(
    Schema.isBetween({ maximum: maxPartDelaySeconds, minimum: 0 })
  ),
  media: PartMediaSchema,
  overrides: PartOverridesSchema,
  text: PostTextSchema,
}).annotate({ identifier: "PostPart" });

export type PostPart = typeof PostPartSchema.Type;

/**
 * What a post says: plain text, with mentions and hashtags written as text;
 * the media it shows, in order; and the text it has instead on some of its
 * channels. That is its first part, and all of most posts. `followUps` are
 * the parts after it, in order, a thread or comments depending on the
 * platform, `maxFollowUps` at most: left out, there are none, and
 * Peal always answers it. A post with parts is refused when it is
 * scheduled on a platform that takes a post alone (`tooManyParts`).
 */
export const PostContentSchema = Schema.Struct({
  followUps: Schema.optionalKey(
    Schema.Array(PostPartSchema).check(Schema.isMaxLength(maxFollowUps))
  ),
  media: PartMediaSchema,
  overrides: PartOverridesSchema,
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
 * one of its media deleted (`mediaRemoved`), before it went out; Peal was
 * down at its time (`missed`); a member found it missing (`notPublished`);
 * the platform kept limiting Peal (`rateLimited`), a daily allowance of
 * uploads stayed spent (`quotaExceeded`), the platform refused the account's
 * token (`tokenExpired`) or could not be reached (`unavailable`); or the
 * platform takes only some posts from the server's app until it approves
 * it (`appNotAudited`: TikTok takes only private posts, from private
 * accounts, from an app it has not audited), or refuses the server's app
 * until its operator pays for it (`appBillingLimit`: X, once the app's
 * credits are used up or its spending cap reached), which is not the
 * post's fault; or the workspace's plan had no room for it when it was due
 * (`planLimit`: more channels than the plan allows, or the month's posts
 * used up, as after a trial), and nothing was sent.
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
  "appNotAudited",
  "quotaExceeded",
  "appBillingLimit",
  "planLimit",
  "partsNotSent",
  "repliesNotAllowed",
]).annotate({ identifier: "FailureReason" });

export type FailureReason = typeof FailureReasonSchema.Type;

/**
 * Why Peal cannot tell whether an unconfirmed post went out: no answer came
 * (`noResponse`), the answer could not be read (`unreadableResponse`), the
 * server stopped during the call (`interrupted`), Peal's own code failed
 * during it (`adapterFailure`), or the platform took the post and was still
 * processing it when Peal stopped checking (`stillProcessing`).
 */
export const UnconfirmedReasonSchema = Schema.Literals([
  "noResponse",
  "unreadableResponse",
  "interrupted",
  "adapterFailure",
  "stillProcessing",
]).annotate({ identifier: "UnconfirmedReason" });

export type UnconfirmedReason = typeof UnconfirmedReasonSchema.Type;

/**
 * A part of a post that is live on a channel: its place in the post, from
 * 0, the platform's id for it and its address, when known (a part a member
 * confirmed by hand has none unless they gave them), and when it went out.
 */
export const LivePartSchema = Schema.Struct({
  index: Schema.Int,
  permalink: Schema.NullOr(Schema.String),
  platformPostId: Schema.NullOr(Schema.String),
  publishedAt: Schema.DateTimeUtc,
}).annotate({ identifier: "LivePart" });

export type LivePart = typeof LivePartSchema.Type;

/**
 * Where a post's parts are on a channel: how many it has there (`count`, 1
 * for a post alone) and those that are live, in order. Parts go out in
 * order, and nothing is sent after one that failed, was cancelled or has no
 * confirmed outcome: on a target that is not published, the part that
 * stopped is the one after the last live. A repost sends from that part,
 * never one that is live; a target failed as `partsNotSent` takes none, as
 * Peal has no post to send the rest under.
 */
export const TargetPartsSchema = Schema.Struct({
  count: Schema.Int,
  live: Schema.Array(LivePartSchema),
}).annotate({ identifier: "TargetParts" });

export type TargetParts = typeof TargetPartsSchema.Type;

/** A post on one of its channels. */
export const PostTargetSchema = Schema.Struct({
  channelId: Schema.String,
  // When Peal last replaced the text of a part of it on the channel's
  // platform, at someone's request; null until then.
  editedAt: Schema.NullOr(Schema.DateTimeUtc),
  // Why it failed, once it has.
  failureReason: Schema.NullOr(FailureReasonSchema),
  id: Schema.String,
  // True when it went live private on the platform, although asked to show
  // it to more people (YouTube); left out otherwise.
  keptPrivate: Schema.optionalKey(Schema.Boolean),
  // What it says that only its channel's platform knows, such as a YouTube
  // title; null on platforms that take none, or while a draft has none yet.
  options: Schema.NullOr(TargetOptionsSchema),
  // Its parts on the channel, and those that are live.
  parts: TargetPartsSchema,
  // Its address on the platform, when the platform gave one, or the member
  // who confirmed it: its first part's, once the target is published.
  permalink: Schema.NullOr(Schema.String),
  // When it went live, once it has.
  publishedAt: Schema.NullOr(Schema.DateTimeUtc),
  // When Peal deleted it from the channel's platform, every part of it,
  // at someone's request: it stays `published`, as it did go out, and its
  // permalink stays as a record. Null while it is there.
  removedAt: Schema.NullOr(Schema.DateTimeUtc),
  // How many times it was sent: 1, and one more for each repost.
  round: Schema.Int,
  status: PostTargetStatusSchema,
  // True when it went live without the thumbnail its options named: the
  // channel may not be allowed custom thumbnails, or the platform refused
  // the image (YouTube); left out otherwise.
  thumbnailNotSet: Schema.optionalKey(Schema.Boolean),
  // Why Peal cannot tell whether it went out, while it is unconfirmed.
  unconfirmedReason: Schema.NullOr(UnconfirmedReasonSchema),
}).annotate({ identifier: "PostTarget" });

export type PostTarget = typeof PostTargetSchema.Type;

/** When a post goes out: the instant, and the IANA zone it was chosen in. */
export const PostScheduleSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  timeZone: Schema.String,
}).annotate({ identifier: "PostSchedule" });

export type PostSchedule = typeof PostScheduleSchema.Type;

/**
 * How whoever created or scheduled a post reached Peal: in the web app
 * (`web`), with an API key of the workspace (`apiKey`), or through an OAuth
 * application acting for a member (`application`: the command line, an MCP
 * client).
 */
export const PostOriginViaSchema = Schema.Literals([
  "web",
  "apiKey",
  "application",
]).annotate({ identifier: "PostOriginVia" });

export type PostOriginVia = typeof PostOriginViaSchema.Type;

/** How a post was created, or scheduled: through what, and which one. */
export const PostOriginSchema = Schema.Struct({
  // The API key's id (`apiKey`) or the OAuth client's (`application`);
  // null for `web`.
  id: Schema.NullOr(Schema.String),
  // What the key or the application was called then, if it had a name.
  name: Schema.NullOr(Schema.String),
  via: PostOriginViaSchema,
}).annotate({ identifier: "PostOrigin" });

export type PostOrigin = typeof PostOriginSchema.Type;

/** A post, what it says and where it goes. */
export const PostSchema = Schema.Struct({
  // The user who created it; null when an API key did.
  authorId: Schema.NullOr(Schema.String),
  content: PostContentSchema,
  // How it was created; null on a post from before this was kept.
  createdVia: Schema.NullOr(PostOriginSchema),
  id: Schema.String,
  // Its place among the posts of the rule that made it, the source being
  // the first; null unless a recycling rule made it.
  occurrence: Schema.NullOr(Schema.Int),
  // How it ended, once it finished.
  outcome: Schema.NullOr(PostOutcomeSchema),
  // The queue that gave it its time; null for a time chosen by hand, and
  // once that queue is deleted. A post moved by hand keeps it, and holds
  // the queue's slot only while it is on its instant.
  queueId: Schema.NullOr(Schema.String),
  // The recycling rule that made it; null for any other post.
  recyclingId: Schema.NullOr(Schema.String),
  // Its time, unless it is a draft. A cancelled post keeps the time it had.
  schedule: Schema.NullOr(PostScheduleSchema),
  // The member who last scheduled or moved it; null on a draft, when an API
  // key did, or on a post from before this was kept.
  scheduledBy: Schema.NullOr(Schema.String),
  // How it was last scheduled or moved; null on a draft, or on a post from
  // before this was kept.
  scheduledVia: Schema.NullOr(PostOriginSchema),
  // Whether its links go out shortened, where the server has short links:
  // as its request said, else the workspace's default when it was made.
  shortenLinks: Schema.Boolean,
  status: PostStatusSchema,
  // The workspace's tags it is filed under (`tags.list` names them).
  tagIds: Schema.Array(Schema.String),
  // One per channel, oldest first.
  targets: Schema.Array(PostTargetSchema),
  // What the request that made it should know of, on that request's
  // answer alone: channels of a set it named that are no longer connected,
  // which the post was made without. Left out when there is nothing to say.
  warnings: Schema.optionalKey(Schema.Array(PostWarningSchema)),
}).annotate({ identifier: "Post" });

export type Post = typeof PostSchema.Type;

/**
 * A draft: what it says, the channels it is for so far, and the options it
 * has on some of them, which its targets keep. Options left out are none:
 * an update replaces them all. Its tags (`tagIds`) are the workspace's:
 * left out, a new draft has none and an update keeps those the draft has.
 */
export const PostDraftSchema = Schema.Struct({
  channelIds: Schema.Array(Schema.String),
  // The channel sets it goes to as well, each named by its id or its name
  // whatever its case: their channels, with the options each set keeps for
  // them where the post gives none.
  channelSets: Schema.optionalKey(ChannelSetReferencesSchema),
  content: PostContentSchema,
  // True to put each channel's default signature under its text: the
  // workspace's under the post's text, and a platform's or a channel's own
  // under the text that channel has instead.
  defaultSignatures: Schema.optionalKey(Schema.Boolean),
  options: Schema.optionalKey(
    Schema.Array(ChannelOptionsSchema).check(
      uniqueBy(
        (chosen: ChannelOptions) => chosen.channelId,
        "options for each channel once"
      )
    )
  ),
  // True to send its links shortened, where the server has short links
  // (`shortLinks.status`): each link written with http:// or https:// and
  // longer than a short address goes out as one, per channel; the text
  // kept stays as written, Pinterest, Instagram and TikTok get links as
  // written, as does a link to a channel's own platform, and an edit of a
  // live post sends the text as written. False sends them as written. Left
  // out, a new draft takes the workspace's default (`byDefault`) when it is
  // made, and keeps it; on an update, the draft keeps its own.
  shortenLinks: Schema.optionalKey(Schema.Boolean),
  // A signature of the workspace to put under its text, on every channel.
  signatureId: Schema.optionalKey(Schema.String),
  tagIds: Schema.optionalKey(PostTagIdsSchema),
}).annotate({ identifier: "PostDraft" });

export type PostDraft = typeof PostDraftSchema.Type;

/** The tags to file a post under, instead of those it has. */
export const PostTagsSchema = Schema.Struct({
  tagIds: PostTagIdsSchema,
}).annotate({ identifier: "PostTags" });

export type PostTags = typeof PostTagsSchema.Type;

/** A draft's time and channels. */
export const SchedulePostSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  channelIds: Schema.NonEmptyArray(Schema.String),
  timeZone: Schema.String,
}).annotate({ identifier: "SchedulePost" });

export type SchedulePost = typeof SchedulePostSchema.Type;

/**
 * When a new post goes out: `now`, `at` an instant, or on the next free
 * slot of a `queue` (the workspace's default queue when `queueId` is left
 * out). It keeps the IANA time zone it was chosen in, which calendars show
 * it in: left out of `now`, UTC; a queue's own for a queue.
 */
export const PostTimingSchema = Schema.Union([
  Schema.TaggedStruct("now", {
    timeZone: Schema.optionalKey(Schema.String),
  }),
  Schema.TaggedStruct("at", {
    at: Schema.DateTimeUtc,
    timeZone: Schema.String,
  }),
  Schema.TaggedStruct("queue", {
    queueId: Schema.optionalKey(Schema.String),
  }),
]).annotate({ identifier: "PostTiming" });

export type PostTiming = typeof PostTimingSchema.Type;

/**
 * A post to put on a queue's next free slot: the workspace's default queue
 * when `queueId` is left out. A draft goes to `channelIds` when given, its
 * own channels otherwise, or, when it has none, the queue's and its set's.
 */
export const QueuePostSchema = Schema.Struct({
  channelIds: Schema.optionalKey(Schema.NonEmptyArray(Schema.String)),
  queueId: Schema.optionalKey(Schema.String),
}).annotate({ identifier: "QueuePost" });

export type QueuePost = typeof QueuePostSchema.Type;

/**
 * A post to create and send in one call: what it says, the channels it
 * goes to, the options it has on those whose platform takes them, and when.
 */
export const NewPostSchema = Schema.Struct({
  // True when the same content may go to a channel that already has it;
  // otherwise that is refused (DuplicatePost).
  allowDuplicate: Schema.optionalKey(Schema.Boolean),
  // One channel at least, unless `channelSets` names some, or `when` adds
  // it to a queue, whose channels it then goes to.
  channelIds: Schema.Array(Schema.String),
  // The channel sets it goes to as well, each named by its id or its name
  // whatever its case: their channels, with the options each set keeps for
  // them where the post gives none.
  channelSets: Schema.optionalKey(ChannelSetReferencesSchema),
  content: PostContentSchema,
  // True to put each channel's default signature under its text: the
  // workspace's under the post's text, and a platform's or a channel's own
  // under the text that channel has instead.
  defaultSignatures: Schema.optionalKey(Schema.Boolean),
  options: Schema.optionalKey(
    Schema.Array(ChannelOptionsSchema).check(
      uniqueBy(
        (chosen: ChannelOptions) => chosen.channelId,
        "options for each channel once"
      )
    )
  ),
  // True to send its links shortened, where the server has short links
  // (`shortLinks.status`): each link written with http:// or https:// and
  // longer than a short address goes out as one, per channel; the text
  // kept stays as written, Pinterest, Instagram and TikTok get links as
  // written, as does a link to a channel's own platform, and an edit of a
  // live post sends the text as written. False sends them as written. Left
  // out, the post takes the workspace's default (`byDefault`) when it is
  // made, and keeps it.
  shortenLinks: Schema.optionalKey(Schema.Boolean),
  // A signature of the workspace to put under its text, on every channel.
  signatureId: Schema.optionalKey(Schema.String),
  // The workspace's tags it is filed under; left out, none.
  tagIds: Schema.optionalKey(PostTagIdsSchema),
  when: PostTimingSchema,
}).annotate({ identifier: "NewPost" });

export type NewPost = typeof NewPostSchema.Type;

/**
 * A post to check without making it: what `send` takes, or a draft, whose
 * time is left out. Without `when`, neither the time nor the plan's room is
 * checked.
 */
export const PostToValidateSchema = Schema.Struct({
  // True when the same content may go to a channel that already has it;
  // otherwise that is refused (DuplicatePost).
  allowDuplicate: Schema.optionalKey(Schema.Boolean),
  channelIds: Schema.Array(Schema.String),
  // The channel sets it goes to as well, each named by its id or its name
  // whatever its case: their channels, with the options each set keeps for
  // them where the post gives none.
  channelSets: Schema.optionalKey(ChannelSetReferencesSchema),
  content: PostContentSchema,
  // True to put each channel's default signature under its text: the
  // workspace's under the post's text, and a platform's or a channel's own
  // under the text that channel has instead.
  defaultSignatures: Schema.optionalKey(Schema.Boolean),
  options: Schema.optionalKey(
    Schema.Array(ChannelOptionsSchema).check(
      uniqueBy(
        (chosen: ChannelOptions) => chosen.channelId,
        "options for each channel once"
      )
    )
  ),
  // As `send` takes it: what the check answers is about the text as
  // written, which a short address never makes longer.
  shortenLinks: Schema.optionalKey(Schema.Boolean),
  // A signature of the workspace to put under its text, on every channel.
  signatureId: Schema.optionalKey(Schema.String),
  when: Schema.optionalKey(PostTimingSchema),
}).annotate({ identifier: "PostToValidate" });

export type PostToValidate = typeof PostToValidateSchema.Type;

/** The longest `Idempotency-Key` Peal takes. */
export const maxIdempotencyKeyLength = 255;

/** How long Peal remembers an `Idempotency-Key`, in hours. */
export const idempotencyKeyLifetimeHours = 24;

/**
 * One post of a bulk request: what `send` takes, and the idempotency key
 * of its own, if it has one.
 */
export const BulkPostSchema = Schema.Struct({
  ...NewPostSchema.fields,
  idempotencyKey: Schema.optionalKey(
    Schema.String.check(
      Schema.isBetweenLength(1, maxIdempotencyKeyLength),
      isWithoutNul
    )
  ),
}).annotate({ identifier: "BulkPost" });

export type BulkPost = typeof BulkPostSchema.Type;

/** Posts to create and send in one request. */
export const BulkPostsSchema = Schema.Struct({
  posts: Schema.Array(BulkPostSchema).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(maxBulkPosts)
  ),
}).annotate({ identifier: "BulkPosts" });

export type BulkPosts = typeof BulkPostsSchema.Type;

/**
 * What became of one post of a bulk request, by its place in the request,
 * from 0: `created`, with the post (`replayed` when its idempotency key
 * answered one made before), or `refused`, with what `send` would have
 * answered for it alone.
 */
export const BulkPostResultSchema = Schema.Union([
  Schema.TaggedStruct("created", {
    index: Schema.Int,
    post: PostSchema,
    replayed: Schema.Boolean,
  }),
  Schema.TaggedStruct("refused", {
    index: Schema.Int,
    refusal: PostRefusalSchema,
  }),
]).annotate({ identifier: "BulkPostResult" });

export type BulkPostResult = typeof BulkPostResultSchema.Type;

/** What a bulk request came to: one result per post, in the order sent. */
export const BulkResultSchema = Schema.Struct({
  // How many posts it made, or answered again.
  created: Schema.Int,
  items: Schema.Array(BulkPostResultSchema),
  refused: Schema.Int,
}).annotate({ identifier: "BulkResult" });

export type BulkResult = typeof BulkResultSchema.Type;

/** A CSV file of posts to create and send. */
export const PostImportSchema = Schema.Struct({
  csv: Schema.String.check(Schema.isMaxLength(maxImportLength)),
  // True to check the file and make nothing.
  dryRun: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "PostImport" });

export type PostImport = typeof PostImportSchema.Type;

/**
 * What became of one row of a CSV import, by its place under the first
 * line, from 1: `created`, with its post; `valid`, when it was checked and
 * not made (a dry run, or another row kept the file from being imported);
 * `refused`, with what `send` would have answered for it; or `unreadable`,
 * with the cells that could not be read.
 */
export const ImportRowResultSchema = Schema.Union([
  Schema.TaggedStruct("created", {
    post: PostSchema,
    replayed: Schema.Boolean,
    row: Schema.Int,
  }),
  Schema.TaggedStruct("valid", { row: Schema.Int }),
  Schema.TaggedStruct("refused", {
    refusal: PostRefusalSchema,
    row: Schema.Int,
  }),
  Schema.TaggedStruct("unreadable", {
    // When the row has more or fewer cells than the first line names, as
    // a comma its text did not quote makes it: how many were expected and
    // found. Such a row is not read at all, and `problems` is empty.
    cells: Schema.optionalKey(
      Schema.Struct({ expected: Schema.Int, found: Schema.Int })
    ),
    problems: Schema.Array(ImportCellProblemSchema),
    row: Schema.Int,
  }),
]).annotate({ identifier: "ImportRowResult" });

export type ImportRowResult = typeof ImportRowResultSchema.Type;

/** What a CSV import came to: one result per row, in the file's order. */
export const ImportResultSchema = Schema.Struct({
  // How many posts it made, or answered again.
  created: Schema.Int,
  // Whether it only checked the file.
  dryRun: Schema.Boolean,
  rows: Schema.Array(ImportRowResultSchema),
}).annotate({ identifier: "ImportResult" });

export type ImportResult = typeof ImportResultSchema.Type;

/** The longest `wait` takes, in seconds. */
export const maxOutcomeWaitSeconds = 60;

// How long the request waits for the post to go out, in seconds.
const wait = Schema.optionalKey(
  Schema.Int.check(
    Schema.isBetween({ maximum: maxOutcomeWaitSeconds, minimum: 0 })
  )
);

/** A page of drafts, newest first. */
export const DraftPageSchema = Schema.Struct({
  items: Schema.Array(PostSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "DraftPage" });

export type DraftPage = typeof DraftPageSchema.Type;

/**
 * How a list of posts is ordered: by creation or by scheduled instant,
 * newest (`Desc`) or oldest (`Asc`) first.
 */
export const PostSortSchema = Schema.Literals([
  "createdDesc",
  "createdAsc",
  "scheduledDesc",
  "scheduledAsc",
]).annotate({ identifier: "PostSort" });

export type PostSort = typeof PostSortSchema.Type;

/** A channel a page's posts go to, and its platform. */
export const PostChannelSchema = Schema.Struct({
  channelId: Schema.String,
  platform: PlatformSchema,
}).annotate({ identifier: "PostChannel" });

export type PostChannel = typeof PostChannelSchema.Type;

/** A page of posts, in the order asked. */
export const PostPageSchema = Schema.Struct({
  // The channels the page's posts go to that are still connected, with
  // their platforms, so a client names each target without another call.
  channels: Schema.Array(PostChannelSchema),
  items: Schema.Array(PostSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "PostPage" });

export type PostPage = typeof PostPageSchema.Type;

/** How many posts a page holds, unless `limit` says otherwise. */
export const defaultPostPageSize = 20;

/** The most posts a page holds. */
export const maxPostPageSize = 100;

/** How many drafts a page holds, unless `limit` says otherwise. */
export const defaultDraftPageSize = 20;

/** The most drafts a page holds. */
export const maxDraftPageSize = 50;

/**
 * How one attempt at publishing on a channel ended: `published`;
 * `unconfirmed`, when Peal could not tell; or why it did not go out, as in
 * `FailureReason`. A `rateLimited` or `unavailable` attempt is followed by
 * another unless Peal gave up.
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
  "appNotAudited",
  "quotaExceeded",
  "appBillingLimit",
  "planLimit",
  "partsNotSent",
  "repliesNotAllowed",
]).annotate({ identifier: "AttemptResult" });

export type AttemptResult = typeof AttemptResultSchema.Type;

/** One attempt at publishing a post on one of its channels. */
export const PublicationAttemptSchema = Schema.Struct({
  // Its number in its round, from 1.
  attempt: Schema.Int,
  finishedAt: Schema.DateTimeUtc,
  // The place of the part it sent: 0 for the post itself.
  part: Schema.Int,
  // The code behind a refusal, for support and for programs that tell
  // refusals apart more finely than `result` does: the platform's own
  // error code as it gave it (`duplicate`, `190`, `quotaExceeded`), or
  // Peal's when Peal refused before calling the platform. Null when the
  // attempt was not refused, or the refusal has no code. It never holds
  // content, a token or an address; codes are the platforms', and change
  // with them.
  refusalCode: Schema.NullOr(Schema.String),
  result: AttemptResultSchema,
  // When Peal tried again, if it did.
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
    HttpApiEndpoint.get("search", "/search", {
      error: [Forbidden, InvalidTimeRange, HttpApiError.BadRequest],
      params: workspace,
      query: {
        authorId: Schema.optionalKey(Schema.String),
        channelId: Schema.optionalKey(Schema.String),
        createdVia: Schema.optionalKey(PostOriginViaSchema),
        cursor: Schema.optionalKey(Schema.String),
        from: Schema.optionalKey(Schema.DateTimeUtc),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxPostPageSize, minimum: 1 })
          )
        ),
        outcome: Schema.optionalKey(PostOutcomeSchema),
        platform: Schema.optionalKey(PlatformSchema),
        queueId: Schema.optionalKey(Schema.String),
        recyclingId: Schema.optionalKey(Schema.String),
        removed: Schema.optionalKey(Schema.Literals(["true", "false"])),
        sort: Schema.optionalKey(PostSortSchema),
        status: Schema.optionalKey(PostStatusSchema),
        tagId: Schema.optionalKey(Schema.String),
        to: Schema.optionalKey(Schema.DateTimeUtc),
      },
      success: PostPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's posts, whatever their state, a page at a time: ${defaultPostPageSize} unless \`limit\` (at most ${maxPostPageSize}) says otherwise. Every filter given must hold: \`status\` (draft, scheduled, publishing, finished, cancelled), \`outcome\` (how a finished post ended, such as \`failed\` or \`partiallyPublished\`), \`channelId\` (posts with a target on that channel), \`platform\` (posts with a target on a connected channel of that platform), \`tagId\` (posts filed under that tag), \`queueId\` (posts that queue placed), \`recyclingId\` (posts that recycling rule made), \`removed\` (\`true\`: posts Peal deleted from at least one channel's platform; \`false\`: posts deleted from none), \`from\` (included) and \`to\` (excluded), on the scheduled instant, which leave out posts without a time, \`createdVia\` (\`web\`, \`apiKey\` or \`application\`) and \`authorId\`. \`sort\` orders them by creation (\`createdDesc\`, the default, or \`createdAsc\`) or by scheduled instant (\`scheduledDesc\`, \`scheduledAsc\`, which list only posts with a time). Pass the page's \`nextCursor\` as \`cursor\`, with the same filters and sort, for the next page: a cursor marks where its page ended, so posts created, moved or deleted meanwhile make no page repeat or skip one; a cursor of another sort, or none a page gave, is a bad request. Each post comes whole, with its targets, their status, address and failure reason, and \`channels\` gives the platform of each channel the page names. Needs post:read and channel:read.`,
        summary: "List posts",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [
        Forbidden,
        PostContentInvalid,
        UnknownChannels,
        UnknownMedia,
        UnknownTags,
        ChannelSetNotFound,
        SignatureNotFound,
      ],
      params: workspace,
      payload: PostDraftSchema,
      success: PostSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. It may name channel sets (`channelSets`, by id or name), whose connected channels it is for as well, with the options each set keeps; a channel of a set that is no longer connected is left out, and the answer says so (`warnings`). A channel on which it gives no options takes the channel's default options, if it has some. With `defaultSignatures`, each channel's default signature goes under its text, and `signatureId` puts one signature under it on every channel: a signature is then text of the post, never added under a text that already ends with it. `shortenLinks: true` sends its links shortened where the server has short links (`shortLinks.status`), `false` as written; left out, the post takes the workspace's default (`byDefault`) when it is made, and keeps it. Needs post:create, channel:read, and media:read when it shows media.",
        summary: "Create a draft",
      })
    ),
    HttpApiEndpoint.post("send", "/send", {
      error: [
        Forbidden,
        ScheduleInPast,
        InvalidTimeZone,
        PostContentInvalid,
        UnknownChannels,
        UnknownMedia,
        PlanLimitReached,
        IdempotencyKeyReused,
        PostNotFound,
        DuplicatePost,
        UnknownTags,
        ChannelSetNotFound,
        SignatureNotFound,
        QueueNotFound,
        QueueHasNoRoom,
      ],
      headers: {
        "idempotency-key": Schema.optionalKey(
          Schema.String.check(
            Schema.isBetweenLength(1, maxIdempotencyKeyLength)
          )
        ),
      },
      params: workspace,
      payload: NewPostSchema,
      query: { wait },
      success: PostSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Creates a post and sends it to some of the workspace's channels in one call: \`when\` is \`now\`, which publishes at once, \`at\` an instant, kept with its IANA time zone, or \`queue\`, which puts it on the next free slot of a queue (\`queueId\`, or the workspace's default queue), decided when the request is received so that posts sent together never take the same slot; it is then an ordinary scheduled post, through every rule a time chosen by hand goes through, the plan's room counted in the slot's month (PlanLimitReached, never a later month), and with no channel or channel set named it goes to the queue's (QueueHasNoRoom when the queue has no free slot within ${queueHorizonDays} days). Instead of listing channels, or beside them, it may name channel sets (\`channelSets\`, by id or name): it goes to their connected channels, with the options each set keeps where it gives none, and a channel of a set that is no longer connected is left out and told in the answer's \`warnings\`, never silently; a set none of whose channels is left, with no other channel, is refused (UnknownChannels). A channel on which it gives no options takes the channel's default options. \`defaultSignatures\` puts each channel's default signature under its text, and \`signatureId\` one signature on every channel: signatures are text of the post, counted against each platform's limit, and never added twice. It goes through every rule scheduling a draft does (each platform's limits on text, media and options, the account's own, the plan's), and answers every violation at once (PostContentInvalid): nothing is made then. In a workspace that asks for approvals, a post that needs one is answered with the status \`awaitingApproval\`: it keeps its time and goes out only once it is approved. What it publishes reaches the platforms' public, and cannot be taken back from Peal once it is out; until its time, cancel or unschedule it. Send an \`Idempotency-Key\` header (any text of your choosing, at most ${maxIdempotencyKeyLength} characters, such as a UUID) to make a request safe to send again: within ${idempotencyKeyLifetimeHours} hours, the same key with the same body answers the post the first request made, as it now stands, and makes no other; the same key with another body is refused (IdempotencyKeyReused), and answers PostNotFound once that post was deleted. Keys are kept per workspace, as digests. Apart from keys, a post whose content already goes to one of its channels less than ${duplicateWindowHours} hours from its time is refused (DuplicatePost), as a request made twice by mistake would be, unless it says \`allowDuplicate: true\`; scheduling a draft is not checked. It answers as soon as the post is made, while it publishes, unless \`wait\` says to wait for the outcome: up to that many seconds (${maxOutcomeWaitSeconds} at most) for a post that goes out now, the answer is then the post once every channel has its result (\`status\` \`finished\`, with its \`outcome\`, each target \`published\` with its \`permalink\` or \`failed\` with its \`failureReason\`), or the post as it stands when the time runs out, some targets still \`pending\` or \`publishing\`: it goes on publishing, and \`GET …/posts/{postId}/outcome\` waits for the rest. The answer is 201 either way: the post was made. \`shortenLinks: true\` sends its links shortened where the server has short links (\`shortLinks.status\`), \`false\` as written; left out, the post takes the workspace's default (\`byDefault\`) when it is made, and keeps it. Needs post:schedule and channel:read, and media:read when it shows media; an OAuth client needs the scope workspace:publish.`,
        summary: "Create and send a post",
      })
    ),
    HttpApiEndpoint.post("bulk", "/bulk", {
      error: [Forbidden],
      headers: {
        "idempotency-key": Schema.optionalKey(
          Schema.String.check(
            Schema.isBetweenLength(1, maxIdempotencyKeyLength)
          )
        ),
      },
      params: workspace,
      payload: BulkPostsSchema,
      success: BulkResultSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Creates and sends up to ${maxBulkPosts} posts in one request, each as \`send\` would: one post per item, each with its own channels, content, options and time, so the same content at several times, or at a time of its own on each channel, is several items. Items are taken in order, one at a time, each on its own: one refused keeps none of the others from being made, and nothing is undone. The answer is 200 whenever the request itself was read, even if every item was refused: \`items\` says, for each by its place in the request, \`created\` with its post, or \`refused\` with what \`send\` would have answered for it alone (its content's violations, unknown channels or media, a time gone by, the plan's limit, a duplicate). A request that cannot be read at all (malformed, no item, more than ${maxBulkPosts}) is 400, and makes nothing. The plan's limits hold across the request: once the month has no room, the items left are refused. Each item is checked against the posts made before it, the request's earlier items included, for the same content on the same channel (DuplicatePost). An \`Idempotency-Key\` header makes the whole request safe to send again within ${idempotencyKeyLifetimeHours} hours: each item is kept under the key and its place, so the same request sent again answers the posts it made (\`replayed\`), makes those that were not made the first time if they now can be, and an item that changed under the same key is refused (IdempotencyKeyReused). An item's own \`idempotencyKey\` is used instead of the header's for that item. Needs post:schedule and channel:read, and media:read for the items that show media; an OAuth client needs the scope workspace:publish.`,
        summary: "Create and send several posts",
      })
    ),
    HttpApiEndpoint.post("import", "/import", {
      error: [Forbidden, ImportUnreadable],
      headers: {
        "idempotency-key": Schema.optionalKey(
          Schema.String.check(
            Schema.isBetweenLength(1, maxIdempotencyKeyLength)
          )
        ),
      },
      params: workspace,
      payload: PostImportSchema,
      success: ImportResultSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Creates and sends the posts a CSV file lists, one per row, at most ${maxImportRows} rows under its first line, which names the columns, in any order: \`text\` and \`channels\` (channel ids separated by spaces, commas or semicolons) are required columns, \`at\` too (\`now\`, an instant with its offset such as 2026-11-20T09:00:00Z, or a local time without one such as 2026-11-20 10:00, read in the row's \`time_zone\`, an IANA zone, UTC if left out); \`media\` (ids of ready media of the workspace), \`allow_duplicate\` (\`true\` or \`false\`) and \`idempotency_key\` are optional. Cells follow RFC 4180, strictly: a cell with a comma, a quote or a line break is written between double quotes, a quote inside it doubled; a quote anywhere else is ImportUnreadable (\`strayQuote\`). Blank lines are no rows. The file is checked first, every row, as \`validate\` checks a post and as the file it is (a row an earlier row leaves no room for in its month, one that repeats an earlier row's content near its time, and one that carries an earlier row's key with another post are refused; a row with more or fewer cells than the first line names is unreadable, never guessed); unless every row is valid, nothing is made, and \`rows\` says which are \`valid\`, \`refused\` (with what \`send\` would have answered) or \`unreadable\` (with the cells at fault). \`dryRun\` stops there even when every row is valid. Otherwise the rows are then made in order as \`bulk\` makes its items, each \`created\` or, when something changed since the check or a row repeats an earlier one, \`refused\`. The answer is 200 once the file was read; a file that cannot be read at all is ImportUnreadable. An \`Idempotency-Key\` header works as on \`bulk\`, by row. A file has no column for short links: each post takes the workspace's default (\`shortLinks.status\`'s \`byDefault\`). Needs post:schedule, post:read and channel:read, and media:read for rows with media; an OAuth client needs the scope workspace:publish.`,
        summary: "Import posts from CSV",
      })
    ),
    HttpApiEndpoint.post("validate", "/validate", {
      error: [Forbidden, ChannelSetNotFound, SignatureNotFound, QueueNotFound],
      params: workspace,
      payload: PostToValidateSchema,
      success: PostValidationSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Checks a post without making it, and changes nothing: send what `send` takes, or a draft (no `when`). It answers 200 whether or not the post would go through, with `valid` and everything that would refuse it, all at once: per channel, the text the channel receives, counted as its platform counts it against each of its limits, its hashtags, mentions, links and media, and every violation of the platform's rules (text, media formats, sizes, counts and durations, options) and of the account's own where its platform tells them; the channels and media that are not the workspace's; and, when `when` is given, whether the time can be kept (for `queue`, the slot it would take now, `queueSlot`, or why there is none, `queueNoRoom`: QueueNotFound when the queue is not the workspace's), whether the workspace's plan has room, and the channels that already have the same content from another post (`duplicates`, as DuplicatePost tells them; none with `allowDuplicate`). A post that is valid now can still be refused later: a channel disconnected, a plan's month filled meanwhile. Needs post:read and channel:read, and media:read when it shows media.",
        summary: "Validate a post",
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
    HttpApiEndpoint.get("outcome", "/:postId/outcome", {
      error: [Forbidden, PostNotFound],
      params: post,
      query: { wait },
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Answers with a post once it has gone out: it waits up to \`wait\` seconds (${maxOutcomeWaitSeconds} at most; none unless given) until every channel has its result, and answers the post then (\`status\` \`finished\`), or as it stands when the time runs out, which a client asks again. A draft, a cancelled post and a post scheduled for later than the wait are answered at once. Waiting changes nothing and holds nothing: the post publishes in its own job either way. Needs post:read.`,
        summary: "Wait for a post's outcome",
      })
    ),
    HttpApiEndpoint.get("attempts", "/:postId/attempts", {
      error: [Forbidden, PostNotFound],
      params: post,
      success: Schema.Array(PublicationAttemptSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.",
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
        UnknownTags,
        ChannelSetNotFound,
        SignatureNotFound,
      ],
      params: post,
      payload: PostDraftSchema,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Replaces a draft's content, channels and options: options left out are removed. Its tags are replaced by `tagIds` when given, and kept otherwise. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.",
        summary: "Update a draft",
      })
    ),
    HttpApiEndpoint.put("tag", "/:postId/tags", {
      error: [Forbidden, PostNotFound, UnknownTags],
      params: post,
      payload: PostTagsSchema,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Files a post under these tags of the workspace, ${maxTagsPerPost} at most, instead of those it had; an empty list takes them all off. Tags say nothing to the platforms, so a post takes them whatever its status, sent or not. Needs post:update.`,
        summary: "Set a post's tags",
      })
    ),
    HttpApiEndpoint.post("duplicate", "/:postId/duplicate", {
      error: [Forbidden, PostNotFound, PostContentInvalid],
      params: post,
      success: PostSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Makes a new draft that says what the post says, whatever the post's status: its text, its media, its channels with their text and options, and its tags. What the workspace no longer has is left out rather than refused: a channel disconnected since, with the text the post had there, media deleted since, a tag deleted since. The copy has no time, and its author is whoever asked; the post itself is not changed. Needs post:read and post:create, and channel:read.",
        summary: "Duplicate a post",
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
          "Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Where the workspace asks for an approval of this post (its approval policy), the post is not scheduled: it answers with the status `awaitingApproval`, keeps its time, and goes out only once approved; contributors may then ask too, with post:create. Needs post:schedule and channel:read, and media:read when it shows media.",
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
          "Moves a scheduled post, or one awaiting approval, to another instant, or schedules a draft on the channels it has. A post that needs an approval it does not have waits for it (`awaitingApproval`). Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.",
        summary: "Reschedule a post",
      })
    ),
    HttpApiEndpoint.post("enqueue", "/:postId/queue", {
      error: [...scheduling, QueueNotFound, QueueHasNoRoom, ChannelSetNotFound],
      params: post,
      payload: QueuePostSchema,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Puts a post on the next free slot of a queue (\`queueId\`, or the workspace's default queue), decided when the request is received so that posts added together never take the same slot. A draft is scheduled there as \`schedule\` schedules it, on \`channelIds\` when given, on the channels it has otherwise, or, when it has none, where the same content sent with \`when: queue\` would go: the queue's connected channels and its channel set's, with the options the set keeps and the channels' default options; a channel of either that is no longer connected is left out and told in \`warnings\` (\`queueChannelsDropped\`, \`channelsDropped\`), and none left is UnknownChannels; a scheduled post, or one awaiting approval, is moved there as \`reschedule\` moves it, on the channels it has. Every rule of scheduling applies at that time, the approval gate and the plan's room in the slot's month included (PlanLimitReached, never a later month). A queue without a free slot within ${queueHorizonDays} days is QueueHasNoRoom, and nothing is changed. Needs post:schedule and channel:read.`,
        summary: "Add a post to a queue",
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
          "Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. A post of several parts goes on from the part after the last that is live; one failed as `partsNotSent` is refused (TargetStatusConflict), as Peal has no post to send the rest under: a part found by hand has no id, or the part to reply to is gone. Needs post:schedule.",
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
    HttpApiEndpoint.post(
      "unpublishTarget",
      "/:postId/targets/:targetId/unpublish",
      {
        error: [Forbidden, PostNotFound, LivePostNotChangeable],
        params: target,
        query: { wait },
        success: LivePostChangeSchema.pipe(HttpApiSchema.status(202)),
      }
    ).annotateMerge(
      OpenApi.annotations({
        description: `Deletes the post from one channel's platform, for everyone: every part of a thread, the last first, so a deletion that stops midway leaves a shorter thread that still reads from its start. It cannot be undone from Peal. The request is accepted (202) and a job deletes it, one call at a time with the channel's other calls; a part the platform no longer has counts as deleted (\`alreadyGone\`), and a call that fails is tried again (as long as the platform asks to wait, and five more times while it cannot be reached), after which the change is \`failed\` with its \`code\` and asking again deletes the parts left. \`wait\` waits up to that many seconds (${maxOutcomeWaitSeconds} at most) for the change to end, and answers it as it then stands. Once done, the target keeps the status \`published\` with its \`removedAt\` (the month's count and the usage stay, as the post did go out), analytics stops reading it and keeps what it read, and the inbox stops reading its comments and keeps those it has. Refused (LivePostNotChangeable) before anything is called where it is not live there, was deleted already, Peal has no id for a part of it, the platform does not let Peal delete it (the capabilities' \`livePost\` say so beforehand), another change of it is pending, the channel cannot be used, or a boost that is not over shows it. Webhooks hear \`post.unpublished\` or \`post.unpublish_failed\`. Needs post:publish; an OAuth client needs the scope workspace:publish.`,
        summary: "Unpublish a post on a channel",
      })
    ),
    HttpApiEndpoint.post("editTarget", "/:postId/targets/:targetId/edit", {
      error: [
        Forbidden,
        PostNotFound,
        LivePostNotChangeable,
        PostContentInvalid,
      ],
      params: target,
      payload: LivePostEditSchema,
      query: { wait },
      success: LivePostChangeSchema.pipe(HttpApiSchema.status(202)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Replaces the text of one part of the post (\`part\`, from 0, the post itself by default) on one channel's platform, for everyone: only the text changes, never the media, the options or the time. The change is public at once. Peal edits on Mastodon and Google Business Profile; the capabilities' \`livePost.edit\` say where, and \`editBlockedBy\` why not elsewhere. The text is checked as that channel's text is when a post is scheduled (PostContentInvalid, a Mastodon content warning counted), and must not be empty. The request is accepted (202) and a job makes the edit, one call at a time with the channel's other calls; a call that fails is tried again as a deletion is, after which the change is \`failed\` with its \`code\` (\`postGone\` when the platform no longer has the post, \`pollNotEditable\` for a Mastodon post with a poll, which the edit would remove, \`permissionDenied\` for a Mastodon channel to reconnect) and may be asked again. \`wait\` waits up to that many seconds (${maxOutcomeWaitSeconds} at most) for it to end. Once done, the text is that part's own text on that channel in Peal (the other channels keep theirs), the target has its \`editedAt\`, and Peal keeps no earlier text. Refused (LivePostNotChangeable) before anything is called where it is not live there, was deleted, Peal has no id for that part, the platform does not let Peal edit it, another change of it is pending, the channel cannot be used, or your posts need an approval (\`approvalRequired\`: an approver makes the edit). Webhooks hear \`post.edited\` or \`post.edit_failed\`. Needs post:publish; an OAuth client needs the scope workspace:publish.`,
        summary: "Edit a published post on a channel",
      })
    ),
    HttpApiEndpoint.post("unpublish", "/:postId/unpublish", {
      error: [Forbidden, PostNotFound],
      params: post,
      success: PostUnpublishSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes the post from every channel's platform where it can be, as unpublishing it on each channel does, and answers the change made on each (`changes`) and, beside them, why it could not be on the others (`refused`, each with the target and the reason LivePostNotChangeable gives): one channel that cannot never fails the whole request. It cannot be undone from Peal. Needs post:publish; an OAuth client needs the scope workspace:publish.",
        summary: "Unpublish a post",
      })
    ),
    HttpApiEndpoint.get("changes", "/:postId/changes", {
      error: [Forbidden, PostNotFound],
      params: post,
      success: LivePostChangesSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the changes asked of the post once it was live (deleting it from a channel's platform, or editing its text there), newest first, each with its `kind` and where it stands: `pending`, `done` or `failed` with its `code`. Needs post:read.",
        summary: "List a post's changes",
      })
    ),
    HttpApiEndpoint.post("cancel", "/:postId/cancel", {
      error: [Forbidden, PostNotFound, PostStatusConflict],
      params: post,
      success: PostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Cancels a draft, a scheduled post or one awaiting approval. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.",
        summary: "Cancel a post",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/posts") {}
