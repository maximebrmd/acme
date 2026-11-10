import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { ApprovalChanged } from "./approval-changed.ts";
import { ApprovalNotPending } from "./approval-not-pending.ts";
import { Authentication } from "./authentication.ts";
import { CommentInvalid } from "./comment-invalid.ts";
import { CommentNotFound } from "./comment-not-found.ts";
import { Forbidden } from "./forbidden.ts";
import { MediaKindSchema } from "./media.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { PlatformSchema } from "./platform.ts";
import { PostNotFound } from "./post-not-found.ts";
import { PostNotReviewable } from "./post-not-reviewable.ts";
import { PostScheduleSchema } from "./posts.ts";
import { ReviewLinkAccessSchema } from "./review-link-access.ts";
import { ReviewLinkNotFound } from "./review-link-not-found.ts";
import { TargetOptionsSchema } from "./target-options.ts";
import { TooManyReviewLinks } from "./too-many-review-links.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** The longest comment, in characters. */
export const maxCommentLength = 2000;

/** The longest name a visitor gives. */
export const maxVisitorNameLength = 80;

/** The longest selection a comment quotes. */
export const maxQuoteLength = 500;

/** How long a review link works when nobody says, in hours: 14 days. */
export const defaultReviewLinkHours = 336;

/** The longest a review link works, in hours: 90 days. */
export const maxReviewLinkHours = 2160;

/** The most review links of a post that work at once. */
export const maxReviewLinksPerPost = 20;

/**
 * Which of a workspace's posts wait for an approval before they are
 * scheduled: `never` (none); `contributorsAndApplications` (those asked for
 * by a member who may not schedule, or through an API key or an OAuth
 * client such as the command line or an MCP client); or `always` (every
 * post, whoever asks).
 */
export const ApprovalPolicySchema = Schema.Literals([
  "never",
  "contributorsAndApplications",
  "always",
]).annotate({ identifier: "ApprovalPolicy" });

export type ApprovalPolicy = typeof ApprovalPolicySchema.Type;

/** A workspace's review settings. */
export const ReviewSettingsSchema = Schema.Struct({
  approvalPolicy: ApprovalPolicySchema,
}).annotate({ identifier: "ReviewSettings" });

export type ReviewSettings = typeof ReviewSettingsSchema.Type;

/**
 * Who a reviewer is: a `member` of the workspace, an `apiKey` of the
 * workspace, or a `visitor`, someone without an account who came through a
 * review link.
 */
export const ReviewerKindSchema = Schema.Literals([
  "member",
  "apiKey",
  "visitor",
]).annotate({ identifier: "ReviewerKind" });

export type ReviewerKind = typeof ReviewerKindSchema.Type;

/** Who commented on a post, or decided on its approval. */
export const ReviewerSchema = Schema.Struct({
  kind: ReviewerKindSchema,
  // The link a visitor came through; null for others, and through a link.
  linkId: Schema.NullOr(Schema.String),
  // A member's name, or the name a visitor gave; null for an API key, a
  // member who is gone, or a visitor's name past its retention.
  name: Schema.NullOr(Schema.String),
  // The member; null for others, a member who is gone, and through a link.
  userId: Schema.NullOr(Schema.String),
}).annotate({ identifier: "Reviewer" });

export type Reviewer = typeof ReviewerSchema.Type;

/**
 * The words of a post's text a comment is about. `located` is where they
 * are in the text the post has on the channel now, null once the text no
 * longer holds them: the comment then keeps the quote alone.
 */
export const CommentSelectionSchema = Schema.Struct({
  located: Schema.NullOr(Schema.Struct({ end: Schema.Int, start: Schema.Int })),
  quote: Schema.String,
  // Where the words started when the comment was written.
  start: Schema.Int,
}).annotate({ identifier: "CommentSelection" });

export type CommentSelection = typeof CommentSelectionSchema.Type;

/** What a comment is about, when it is not the whole post. */
export const CommentAnchorSchema = Schema.Struct({
  channelId: Schema.String,
  selection: Schema.NullOr(CommentSelectionSchema),
}).annotate({ identifier: "CommentAnchor" });

export type CommentAnchor = typeof CommentAnchorSchema.Type;

/**
 * A comment on a post. A comment with no `parentId` starts a thread; the
 * others answer it. `text` is plain text: show it as text, never as markup.
 */
export const ReviewCommentSchema = Schema.Struct({
  // Set on the comment that starts a thread about a channel or some words.
  anchor: Schema.NullOr(CommentAnchorSchema),
  author: ReviewerSchema,
  createdAt: Schema.DateTimeUtc,
  id: Schema.String,
  // The comment that started the thread this one answers in.
  parentId: Schema.NullOr(Schema.String),
  postId: Schema.String,
  // Set on the comment that started a thread, once the thread is resolved.
  resolved: Schema.NullOr(
    Schema.Struct({ at: Schema.DateTimeUtc, by: ReviewerSchema })
  ),
  text: Schema.String,
}).annotate({ identifier: "ReviewComment" });

export type ReviewComment = typeof ReviewCommentSchema.Type;

const nul = String.fromCodePoint(0);

export const isWithoutNul = Schema.makeFilter(
  (text: string) => !text.includes(nul),
  {
    expected: "text without NUL characters",
  }
);

export const CommentTextSchema = Schema.String.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(maxCommentLength),
  isWithoutNul
);

/**
 * A comment to add. With `parentId`, it answers the comment that started a
 * thread, and has no anchor. With `anchor`, it is about the post on one
 * channel, or about `selection`: words of the text the post has there,
 * which must be where `start` says.
 */
export const NewCommentSchema = Schema.Struct({
  anchor: Schema.optionalKey(
    Schema.Struct({
      channelId: Schema.String,
      selection: Schema.optionalKey(
        Schema.Struct({
          quote: Schema.String.check(
            Schema.isNonEmpty(),
            Schema.isMaxLength(maxQuoteLength),
            isWithoutNul
          ),
          start: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
        })
      ),
    })
  ),
  parentId: Schema.optionalKey(Schema.String),
  text: CommentTextSchema,
}).annotate({ identifier: "NewComment" });

export type NewComment = typeof NewCommentSchema.Type;

/**
 * Where an approval request is: `pending`; `approved`; `changesRequested`,
 * which sent the post back to draft; or `withdrawn`, when the post stopped
 * waiting though nobody decided (taken back to draft, cancelled, or
 * scheduled by someone who may).
 */
export const ApprovalStatusSchema = Schema.Literals([
  "pending",
  "approved",
  "changesRequested",
  "withdrawn",
]).annotate({ identifier: "ApprovalStatus" });

export type ApprovalStatus = typeof ApprovalStatusSchema.Type;

/**
 * How whoever asked for an approval reached Peal: a `member` in the web
 * app, an `apiKey`, or an `application` (an OAuth client acting for a
 * member).
 */
export const ApprovalOriginSchema = Schema.Literals([
  "member",
  "apiKey",
  "application",
]).annotate({ identifier: "ApprovalOrigin" });

export type ApprovalOrigin = typeof ApprovalOriginSchema.Type;

/**
 * Someone asked for a post to go out at a time, in a workspace where it
 * needs an approval first, and what was decided: the record of who approved
 * what, and when.
 */
export const ApprovalRequestSchema = Schema.Struct({
  // Who decided and when, once decided.
  decision: Schema.NullOr(
    Schema.Struct({ at: Schema.DateTimeUtc, by: ReviewerSchema })
  ),
  id: Schema.String,
  postId: Schema.String,
  requestedAt: Schema.DateTimeUtc,
  // The member who asked; null when an API key did.
  requestedBy: Schema.NullOr(Schema.String),
  requestedByName: Schema.NullOr(Schema.String),
  requestedVia: ApprovalOriginSchema,
  // The time asked for, in the zone it was chosen in.
  schedule: PostScheduleSchema,
  status: ApprovalStatusSchema,
  // The fingerprint of what the post said when this was asked: its text,
  // its media and their alt text, its channels and its options on each. A
  // decision sends it back with `id`.
  subjectHash: Schema.String,
}).annotate({ identifier: "ApprovalRequest" });

export type ApprovalRequest = typeof ApprovalRequestSchema.Type;

/** A post on one of its channels, as the channel will receive it. */
export const ReviewedChannelSchema = Schema.Struct({
  channelId: Schema.String,
  // The account's name on its platform; null once it was disconnected.
  handle: Schema.NullOr(Schema.String),
  // What the post has there that only the platform knows (a Pin's link and
  // board, a video's title and privacy): an approval covers them. Null
  // where the platform takes none.
  options: Schema.NullOr(TargetOptionsSchema),
  platform: Schema.NullOr(PlatformSchema),
  text: Schema.String,
}).annotate({ identifier: "ReviewedChannel" });

export type ReviewedChannel = typeof ReviewedChannelSchema.Type;

/**
 * An image, a video or a document (a PDF, on LinkedIn) a post shows. `url`
 * reads the file from the media store for two hours; it is null, with
 * `kind`, for a file that cannot be shown. A document has no alt text.
 */
export const ReviewedMediaSchema = Schema.Struct({
  altText: Schema.String,
  kind: Schema.NullOr(MediaKindSchema),
  mediaId: Schema.String,
  url: Schema.NullOr(Schema.String),
}).annotate({ identifier: "ReviewedMedia" });

export type ReviewedMedia = typeof ReviewedMediaSchema.Type;

/**
 * A post's review: its comments, oldest first, its approvals, newest first,
 * and the post as each of its channels will receive it now, which is what
 * the approval that waits is for. Decide on what this answer shows, with
 * the `id` and `subjectHash` of its pending approval.
 */
export const PostReviewSchema = Schema.Struct({
  approvals: Schema.Array(ApprovalRequestSchema),
  channels: Schema.Array(ReviewedChannelSchema),
  comments: Schema.Array(ReviewCommentSchema),
  media: Schema.Array(ReviewedMediaSchema),
}).annotate({ identifier: "PostReview" });

export type PostReview = typeof PostReviewSchema.Type;

/**
 * What approving a post did: it is scheduled, or, when `late` (approved
 * after the time it was asked for), back to draft, still approved, for a
 * member to give it a new time.
 */
export const ApprovalOutcomeSchema = Schema.Struct({
  approval: ApprovalRequestSchema,
  late: Schema.Boolean,
}).annotate({ identifier: "ApprovalOutcome" });

export type ApprovalOutcome = typeof ApprovalOutcomeSchema.Type;

/** The longest fingerprint a decision sends back. */
export const maxSubjectHashLength = 128;

/**
 * The approval a decision is about, as its reviewer was shown it: its `id`
 * and its `subjectHash`. A decision is for what was read: when the post
 * was asked again or says something else since, it answers ApprovalChanged.
 */
export const shownApprovalFields = {
  approvalId: Schema.String.check(Schema.isMaxLength(maxSubjectHashLength)),
  subjectHash: Schema.String.check(Schema.isMaxLength(maxSubjectHashLength)),
};

/** An approval of a post, as its reviewer was shown it. */
export const ApprovalDecisionSchema = Schema.Struct(
  shownApprovalFields
).annotate({ identifier: "ApprovalDecision" });

export type ApprovalDecision = typeof ApprovalDecisionSchema.Type;

/**
 * Why changes are asked for, kept as a comment on the post, and the
 * approval it refuses, as its reviewer was shown it.
 */
export const ChangesRequestSchema = Schema.Struct({
  ...shownApprovalFields,
  comment: CommentTextSchema,
}).annotate({ identifier: "ChangesRequest" });

export type ChangesRequest = typeof ChangesRequestSchema.Type;

/** What asking for changes did: the post is a draft again, with the comment. */
export const ChangesOutcomeSchema = Schema.Struct({
  approval: ApprovalRequestSchema,
  comment: ReviewCommentSchema,
}).annotate({ identifier: "ChangesOutcome" });

export type ChangesOutcome = typeof ChangesOutcomeSchema.Type;

/** Where a review link is: working, or ended and why. */
export const ReviewLinkStatusSchema = Schema.Literals([
  "active",
  "expired",
  "revoked",
]).annotate({ identifier: "ReviewLinkStatus" });

export type ReviewLinkStatus = typeof ReviewLinkStatusSchema.Type;

/**
 * A link that shows one post to people without an account. Its address is
 * told once, when it is made: only a hash of its token is kept.
 */
export const ReviewLinkSchema = Schema.Struct({
  access: ReviewLinkAccessSchema,
  createdAt: Schema.DateTimeUtc,
  // The member who made it; null when an API key did.
  createdBy: Schema.NullOr(Schema.String),
  expiresAt: Schema.DateTimeUtc,
  id: Schema.String,
  postId: Schema.String,
  revokedAt: Schema.NullOr(Schema.DateTimeUtc),
  status: ReviewLinkStatusSchema,
}).annotate({ identifier: "ReviewLink" });

export type ReviewLink = typeof ReviewLinkSchema.Type;

/** A review link to make. */
export const NewReviewLinkSchema = Schema.Struct({
  access: ReviewLinkAccessSchema,
  // How long it works, in hours; 14 days when left out, 90 days at most.
  expiresInHours: Schema.optionalKey(
    Schema.Int.check(
      Schema.isBetween({ maximum: maxReviewLinkHours, minimum: 1 })
    )
  ),
}).annotate({ identifier: "NewReviewLink" });

export type NewReviewLink = typeof NewReviewLinkSchema.Type;

/**
 * A review link just made, with its address: give it to whoever reviews
 * the post. It is not shown again.
 */
export const CreatedReviewLinkSchema = Schema.Struct({
  link: ReviewLinkSchema,
  // The link's secret, which its address ends with.
  token: Schema.String,
  // The page that shows the post, in the web app.
  url: Schema.String,
}).annotate({ identifier: "CreatedReviewLink" });

export type CreatedReviewLink = typeof CreatedReviewLinkSchema.Type;

const workspace = { workspaceId: Schema.String };

const post = { ...workspace, postId: Schema.String };

/**
 * Reviews of a workspace's posts: its approval policy, the approvals that
 * wait, each post's comments and decisions, and the links that show a post
 * to people without an account.
 */
export class ReviewApi extends HttpApiGroup.make("review")
  .add(
    HttpApiEndpoint.get("settings", "/review/settings", {
      error: [Forbidden],
      params: workspace,
      success: ReviewSettingsSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with the workspace's approval policy: which of its posts wait for an approval before they are scheduled. Needs post:read.",
        summary: "Get the review settings",
      })
    ),
    HttpApiEndpoint.put("updateSettings", "/review/settings", {
      error: [Forbidden],
      params: workspace,
      payload: ReviewSettingsSchema,
      success: ReviewSettingsSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Chooses the workspace's approval policy. It applies to posts scheduled from then on: a post already scheduled stays scheduled, and one that waits still waits. Needs organization:update, and is refused to staff acting as a member.",
        summary: "Update the review settings",
      })
    ),
    HttpApiEndpoint.get("pending", "/approvals", {
      error: [Forbidden],
      params: workspace,
      success: Schema.Array(ApprovalRequestSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the approvals that wait in the workspace, oldest first, 100 at most. Needs post:read.",
        summary: "List pending approvals",
      })
    ),
    HttpApiEndpoint.get("thread", "/posts/:postId/review", {
      error: [Forbidden, PostNotFound],
      params: post,
      success: PostReviewSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with a post's review: its comments, oldest first, and the approvals asked for it and what was decided, newest first. Needs post:read.",
        summary: "Get a post's review",
      })
    ),
    HttpApiEndpoint.post("comment", "/posts/:postId/comments", {
      error: [Forbidden, PostNotFound, CommentInvalid],
      params: post,
      payload: NewCommentSchema,
      success: ReviewCommentSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Comments on a post, starts a thread about one of its channels or some words of its text there, or answers a thread. The text is kept as plain text, ${maxCommentLength} characters at most, without control characters. Those who follow the post are told. Needs post:create or post:approve, and is refused to staff acting as a member.`,
        summary: "Comment on a post",
      })
    ),
    HttpApiEndpoint.patch("resolve", "/posts/:postId/comments/:commentId", {
      error: [Forbidden, PostNotFound, CommentNotFound, CommentInvalid],
      params: { ...post, commentId: Schema.String },
      payload: Schema.Struct({ resolved: Schema.Boolean }),
      success: ReviewCommentSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Resolves the thread a comment started, or reopens it. An answer is not resolved: its thread is (CommentInvalid, `parent`). Needs post:create or post:approve, and is refused to staff acting as a member.",
        summary: "Resolve a thread",
      })
    ),
    HttpApiEndpoint.post("approve", "/posts/:postId/approve", {
      error: [
        Forbidden,
        PostNotFound,
        ApprovalNotPending,
        ApprovalChanged,
        PlanLimitReached,
      ],
      params: post,
      payload: ApprovalDecisionSchema,
      success: ApprovalOutcomeSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Approves a post that waits for an approval, as the reviewer was shown it: send the `id` and the `subjectHash` of the approval that waits, as the post's review or the list of approvals gave them. When the post was asked again or says something else since, nothing is approved (ApprovalChanged): read it again. It is scheduled for the time it was asked for, and its job starts. Approved after that time (beyond a minute), nothing is published late: the post goes back to draft, still approved, and `late` is true; scheduling it again needs no new approval while it says the same. Recorded with who approved and when. In a workspace that holds more channels or members than its plan allows, which schedules nothing, nothing is approved (PlanLimitReached) and the post keeps waiting. Needs post:approve, and is refused to staff acting as a member.",
        summary: "Approve a post",
      })
    ),
    HttpApiEndpoint.post("requestChanges", "/posts/:postId/request-changes", {
      error: [
        Forbidden,
        PostNotFound,
        ApprovalNotPending,
        ApprovalChanged,
        CommentInvalid,
      ],
      params: post,
      payload: ChangesRequestSchema,
      success: ChangesOutcomeSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Sends a post that waits for an approval back to draft, with a comment that says what to change, and the `id` and `subjectHash` of the approval it refuses, as for approving. Its author and whoever asked are told. Needs post:approve, and is refused to staff acting as a member.",
        summary: "Request changes to a post",
      })
    ),
    HttpApiEndpoint.get("links", "/posts/:postId/review-links", {
      error: [Forbidden, PostNotFound],
      params: post,
      success: Schema.Array(ReviewLinkSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists a post's review links, newest first, ended ones included. No token is shown: a link's address is told once, when it is made. Needs post:read.",
        summary: "List a post's review links",
      })
    ),
    HttpApiEndpoint.post("createLink", "/posts/:postId/review-links", {
      error: [Forbidden, PostNotFound, PostNotReviewable, TooManyReviewLinks],
      params: post,
      payload: NewReviewLinkSchema,
      success: CreatedReviewLinkSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Makes a link that shows a draft, a post that waits for an approval or a scheduled post to whoever holds it, without an account: the post as each channel will receive it, and nothing else of the workspace. It lets them view, comment, or approve, and works ${defaultReviewLinkHours / 24} days unless \`expiresInHours\` says otherwise (${maxReviewLinkHours / 24} days at most), until it is revoked, or the post is published, cancelled or deleted. A post has ${maxReviewLinksPerPost} working links at most. The answer holds the link's address, which is not shown again. Needs post:approve, and is refused to staff acting as a member. A link that lets its holders approve is made in the web app only: an API key or an OAuth client is refused one, as it would approve its own posts with it.`,
        summary: "Create a review link",
      })
    ),
    HttpApiEndpoint.delete("revokeLink", "/review-links/:linkId", {
      error: [Forbidden, ReviewLinkNotFound],
      params: { ...workspace, linkId: Schema.String },
      success: ReviewLinkSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Ends a review link at once: whoever opens it is told it was revoked. Needs post:approve, and is refused to staff acting as a member.",
        summary: "Revoke a review link",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId") {}
