import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { FieldDescriptionSchema } from "./field-description.ts";
import { Forbidden } from "./forbidden.ts";
import { ByteCountSchema } from "./int64.ts";
import { LookupDescriptionSchema } from "./lookups.ts";
import { MediaContentTypeSchema, MediaKindSchema } from "./media.ts";
import { PlatformSchema } from "./platform.ts";
import { TextUnitSchema } from "./post-text.ts";
import { TikTokBlockSchema } from "./tiktok.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

// What a post on a platform, or on one channel, may hold, described as data
// so a client need not know each platform's rules. The server's rules
// (src/publishing/domain/platform-capabilities.ts, from platform-rules.ts
// and each platform's options class) are the source; a test keeps the
// figures here equal to the client copy in `peal-contract/post-text`.

/**
 * The version of this description: 1. It goes up when a field changes
 * meaning or leaves; fields, platforms, lookups and restrictions are added
 * under the same version, so clients skip what they do not know.
 */
export const capabilitiesVersion = 1;

/** A limit on a post's text: at most `maximum`, counted in `unit`. */
export const TextLimitSchema = Schema.Struct({
  maximum: Schema.Int,
  unit: TextUnitSchema,
}).annotate({ identifier: "TextLimit" });

export type TextLimit = typeof TextLimitSchema.Type;

/**
 * What a platform takes of a post's text. Every limit applies, the last
 * one being Peal's own. A count that is null is one Peal does not check:
 * the platform may still refuse the post.
 */
export const TextCapabilitiesSchema = Schema.Struct({
  // Characters refused anywhere in the text.
  forbiddenCharacters: Schema.Array(Schema.String),
  limits: Schema.Array(TextLimitSchema),
  maxHashtags: Schema.NullOr(Schema.Int),
  // Different links: the same link twice counts once.
  maxLinks: Schema.NullOr(Schema.Int),
  maxMentions: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "TextCapabilities" });

/**
 * What a platform takes of one file type. A limit that is null is one the
 * platform does not have, or that Peal does not check.
 */
export const MediaFormatSchema = Schema.Struct({
  contentType: MediaContentTypeSchema,
  kind: MediaKindSchema,
  // Width divided by height, both bounds included.
  maxAspectRatio: Schema.NullOr(Schema.Finite),
  maxByteSize: Schema.NullOr(ByteCountSchema),
  maxDurationMs: Schema.NullOr(Schema.Int),
  // The most files a post holding one of this type shows.
  maxMediaWith: Schema.NullOr(Schema.Int),
  // Width times height.
  maxPixels: Schema.NullOr(Schema.Int),
  // Each of width and height, in pixels.
  maxSide: Schema.NullOr(Schema.Int),
  minAspectRatio: Schema.NullOr(Schema.Finite),
  minByteSize: Schema.NullOr(ByteCountSchema),
  minDurationMs: Schema.NullOr(Schema.Int),
  minSide: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "MediaFormat" });

export type MediaFormat = typeof MediaFormatSchema.Type;

/**
 * What a platform takes of a post's images and videos. `formats` is null
 * when Peal knows none of the platform's media rules yet; otherwise a file
 * type it leaves out is refused.
 */
export const MediaCapabilitiesSchema = Schema.Struct({
  altText: Schema.Struct({
    // The longest alt text of one image or video, in code points.
    maxLength: Schema.Int,
    // Whether the platform shows it; null when Peal does not know.
    shown: Schema.NullOr(Schema.Boolean),
  }),
  formats: Schema.NullOr(Schema.Array(MediaFormatSchema)),
  // Images and videos together.
  maxCount: Schema.Int,
  maxVideos: Schema.NullOr(Schema.Int),
  // One post can show images and videos together; null when not known.
  mixesKinds: Schema.NullOr(Schema.Boolean),
  // The platform publishes nothing without an image or a video.
  required: Schema.Boolean,
}).annotate({ identifier: "MediaCapabilities" });

/**
 * A kind of post whose rules differ from a feed post's on its platform,
 * chosen by the options' `format` (`name`): its images and videos, and
 * whether the post's text goes out with it (a story is sent without). The
 * post's text there is limited as `text` says when it is sent. A format
 * takes no parts after the first.
 */
export const PostFormatCapabilitiesSchema = Schema.Struct({
  description: Schema.String,
  media: MediaCapabilitiesSchema,
  name: Schema.String,
  sendsText: Schema.Boolean,
}).annotate({ identifier: "PostFormatCapabilities" });

export type PostFormatCapabilities = typeof PostFormatCapabilitiesSchema.Type;

/**
 * A rule between two options: when the yes-or-no `field` is true, one of
 * `oneOf` must be true too (`needsOneOf`), or `other` must not have `value`
 * (`notWith`); `field` is needed while `other` has one of `values`
 * (`neededWith`), or refused unless it has (`onlyWith`), an `other` left
 * out counting as its `ifLeftOut`.
 */
export const OptionConstraintSchema = Schema.Union([
  Schema.TaggedStruct("needsOneOf", {
    field: Schema.String,
    oneOf: Schema.Array(Schema.String),
  }),
  Schema.TaggedStruct("notWith", {
    field: Schema.String,
    other: Schema.String,
    value: Schema.String,
  }),
  Schema.TaggedStruct("neededWith", {
    field: Schema.String,
    other: Schema.String,
    values: Schema.Array(Schema.String),
  }),
  Schema.TaggedStruct("onlyWith", {
    field: Schema.String,
    other: Schema.String,
    values: Schema.Array(Schema.String),
  }),
]).annotate({ identifier: "OptionConstraint" });

export type OptionConstraint = typeof OptionConstraintSchema.Type;

/** The counts of a post Peal reads, where the platform gives them. */
export const postCountNames = [
  "likes",
  "reposts",
  "replies",
  "quotes",
  "impressions",
  "clicks",
  "reach",
  "saves",
] as const;

/** The numbers of an account Peal reads, where the platform gives them. */
export const accountNumberNames = [
  "followers",
  "following",
  "posts",
  "views",
  "reach",
] as const;

/** Why Peal cannot change a post once it is live on a platform. */
export const LivePostBlockerSchema = Schema.Literals([
  "noApi",
  "permission",
  "unverified",
]).annotate({ identifier: "LivePostBlocker" });

export type LivePostBlocker = typeof LivePostBlockerSchema.Type;

/**
 * What a post on a platform may hold, as far as Peal checks it before the
 * post goes out; the platform may refuse more.
 */
export const PlatformCapabilitiesSchema = Schema.Struct({
  // Whether Peal reads the counts of each post published there: for a
  // platform, on any of its channels; for a channel, on that one (a LinkedIn
  // company page, not a profile).
  // `postCounts` are the counts Peal reads of each post there, and
  // `accountNumbers` those of the account, day by day: both empty where it
  // reads none. A number left out is one the platform does not give.
  analytics: Schema.Struct({
    accountNumbers: Schema.Array(Schema.Literals(accountNumberNames)),
    perPost: Schema.Boolean,
    postCounts: Schema.Array(Schema.Literals(postCountNames)),
  }),
  // The parts a post may have there after its first (`content.followUps`):
  // replies in a `thread`, each to the part before it, or `comment`s under
  // the post, `maxCount` at most (a first comment, which the account posts
  // under its post once it is live). A reply in a thread follows the rules
  // of a post there, text and media; a comment holds text alone, within
  // `commentTextLimits`. Null: the platform, or this server (a first
  // comment is offered where it reads the platform's comments in the
  // inbox), takes a post alone, and a post with more parts is refused there
  // when it is scheduled (`tooManyParts`).
  followUps: Schema.NullOr(
    Schema.Struct({
      commentTextLimits: Schema.optionalKey(Schema.Array(TextLimitSchema)),
      kind: Schema.Literals(["thread", "comment"]),
      maxCount: Schema.Int,
    }).annotate({ identifier: "FollowUpCapabilities" })
  ),
  // What Peal can do to a post once it is live there: delete it from the
  // platform (`unpublish`, every part of it), or replace its text (`edit`,
  // not offered yet). Each false one may say why: the platform has no call
  // for it (`noApi`), it needs a permission Peal does not ask for, which
  // the platform grants after a review (`permission`), or the platform's
  // documentation does not say that Peal's permissions allow it, so Peal
  // does not try it on members' accounts (`unverified`).
  livePost: Schema.Struct({
    edit: Schema.Boolean,
    editBlockedBy: Schema.optionalKey(LivePostBlockerSchema),
    unpublish: Schema.Boolean,
    unpublishBlockedBy: Schema.optionalKey(LivePostBlockerSchema),
  }).annotate({ identifier: "LivePostCapabilities" }),
  // What the platform tells about an account, for the options that refer
  // to it.
  lookups: Schema.Array(LookupDescriptionSchema),
  media: MediaCapabilitiesSchema,
  // The fields of a draft's `options` on a channel of this platform, and
  // the rules between them. Empty: the platform takes no options.
  options: Schema.Struct({
    constraints: Schema.Array(OptionConstraintSchema),
    fields: Schema.Array(FieldDescriptionSchema),
  }),
  platform: PlatformSchema,
  // The kinds of post whose rules differ from a feed post's there (an
  // Instagram story, a Facebook story or reel), each chosen by the
  // options' `format`; `media` above is a feed post's. Left out where the
  // platform has none.
  postFormats: Schema.optionalKey(Schema.Array(PostFormatCapabilitiesSchema)),
  text: TextCapabilitiesSchema,
  version: Schema.Int,
}).annotate({ identifier: "PlatformCapabilities" });

export type PlatformCapabilities = typeof PlatformCapabilitiesSchema.Type;

/**
 * What a channel's own account narrows in its platform's rules: an option
 * that takes only some of its values (`optionValues`), a yes-or-no option
 * that must have one value (`optionFixed`), the longest video
 * (`videoDuration`), file types refused on the channel
 * (`mediaTypesRefused`), an option refused until the channel is connected
 * again, to grant what it needs (`optionNeedsReconnect`), a first comment
 * refused until then (`partsNeedReconnect`).
 */
export const AccountRestrictionSchema = Schema.Union([
  Schema.TaggedStruct("optionValues", {
    field: Schema.String,
    values: Schema.Array(Schema.String),
  }),
  Schema.TaggedStruct("optionFixed", {
    field: Schema.String,
    value: Schema.Boolean,
  }),
  Schema.TaggedStruct("videoDuration", { maximumMs: Schema.Int }),
  Schema.TaggedStruct("mediaTypesRefused", {
    contentTypes: Schema.Array(MediaContentTypeSchema),
  }),
  Schema.TaggedStruct("optionNeedsReconnect", { field: Schema.String }),
  Schema.TaggedStruct("partsNeedReconnect", {}),
]).annotate({ identifier: "AccountRestriction" });

export type AccountRestriction = typeof AccountRestrictionSchema.Type;

/**
 * Why the platform could not be asked about the account: the channel is
 * turned off (`disabled`) or was disconnected meanwhile (`disconnected`),
 * its account must be reconnected (`reconnect`), or the platform did not
 * answer (`platformUnreachable`) or asked to slow down (`rateLimited`).
 */
export const AccountUnreadReasonSchema = Schema.Literals([
  "disabled",
  "disconnected",
  "platformUnreachable",
  "rateLimited",
  "reconnect",
]).annotate({ identifier: "AccountUnreadReason" });

/**
 * What is known of a channel's account beyond its platform's rules: its
 * platform asks accounts nothing Peal reads (`unrestricted`); the platform
 * answered (`read`), with what the account restricts and, when it cannot
 * post now, why (`blocked`); or the platform could not be asked now
 * (`unread`): the platform's rules still hold, and the account's are
 * checked when a post is scheduled.
 */
export const AccountStandingSchema = Schema.Union([
  Schema.TaggedStruct("unrestricted", {}),
  Schema.TaggedStruct("read", {
    blocked: Schema.NullOr(TikTokBlockSchema),
    restrictions: Schema.Array(AccountRestrictionSchema),
  }),
  Schema.TaggedStruct("unread", { reason: AccountUnreadReasonSchema }),
]).annotate({ identifier: "AccountStanding" });

export type AccountStanding = typeof AccountStandingSchema.Type;

/** What a post on one channel may hold: its platform's, and its account's. */
export const ChannelCapabilitiesSchema = Schema.Struct({
  account: AccountStandingSchema,
  capabilities: PlatformCapabilitiesSchema,
  channelId: Schema.String,
}).annotate({ identifier: "ChannelCapabilities" });

export type ChannelCapabilities = typeof ChannelCapabilitiesSchema.Type;

const workspace = { workspaceId: Schema.String };

/** What posts may hold, by platform and by channel. */
export class CapabilitiesApi extends HttpApiGroup.make("capabilities")
  .add(
    HttpApiEndpoint.get("platforms", "/platforms/capabilities", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(PlatformCapabilitiesSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Describes what a post may hold on every platform, in Peal's order, whether or not the workspace has a channel there: how its text is counted and limited, the images and videos it takes, its options field by field, the lookups that answer their values, and whether Peal reads each post's counts. These are the rules Peal checks when a post is scheduled; a null limit is one Peal does not check, which the platform may still apply. Needs channel:read.",
        summary: "Describe every platform",
      })
    ),
    HttpApiEndpoint.get("channel", "/channels/:channelId/capabilities", {
      error: [Forbidden, ChannelNotFound],
      params: { ...workspace, channelId: Schema.String },
      success: ChannelCapabilitiesSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Describes what a post on this channel may hold: its platform's capabilities, and what its own account narrows in them, read from the platform now (a TikTok creator's audiences, the interactions they turned off, their longest video). When the platform cannot be asked, `account` says why and the platform's capabilities are answered alone. Needs channel:read.",
        summary: "Describe a channel",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId") {}
