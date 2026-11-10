import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { ApprovalNotPending } from "./approval-not-pending.ts";
import { CommentInvalid } from "./comment-invalid.ts";
import { PlatformSchema } from "./platform.ts";
import { PostScheduleSchema } from "./posts.ts";
import { ReviewAccessDenied } from "./review-access-denied.ts";
import { ReviewCaptchaRequired } from "./review-captcha-required.ts";
import { ReviewLinkAccessSchema } from "./review-link-access.ts";
import { ReviewLinkClosed } from "./review-link-closed.ts";
import { ReviewLinkNotFound } from "./review-link-not-found.ts";
import { maxReviewRequestBytes, ReviewVisitor } from "./review-visitor.ts";
import {
  ApprovalRequestSchema,
  CommentTextSchema,
  isWithoutNul,
  maxVisitorEmailLength,
  maxVisitorNameLength,
  NewCommentSchema,
  ReviewCommentSchema,
} from "./review.ts";
import { TooManyReviewRequests } from "./too-many-review-requests.ts";

/** A post on one of its channels, as the channel will receive it. */
export const ReviewedChannelSchema = Schema.Struct({
  channelId: Schema.String,
  // The account's name on its platform; null once it was disconnected.
  handle: Schema.NullOr(Schema.String),
  platform: Schema.NullOr(PlatformSchema),
  text: Schema.String,
}).annotate({ identifier: "ReviewedChannel" });

export type ReviewedChannel = typeof ReviewedChannelSchema.Type;

/**
 * An image or a video a post shows. `url` reads the file from the media
 * store for two hours; it is null, with `kind`, for a file that cannot be
 * shown.
 */
export const ReviewedMediaSchema = Schema.Struct({
  altText: Schema.String,
  kind: Schema.NullOr(Schema.Literals(["image", "video"])),
  mediaId: Schema.String,
  url: Schema.NullOr(Schema.String),
}).annotate({ identifier: "ReviewedMedia" });

export type ReviewedMedia = typeof ReviewedMediaSchema.Type;

/**
 * What a review link shows: one post as each of its channels will receive
 * it, with its comments when the link lets its holders comment, and the
 * approval that waits or was decided last. Nothing else of its workspace.
 */
export const ReviewPageSchema = Schema.Struct({
  access: ReviewLinkAccessSchema,
  approval: Schema.NullOr(ApprovalRequestSchema),
  channels: Schema.Array(ReviewedChannelSchema),
  comments: Schema.Array(ReviewCommentSchema),
  expiresAt: Schema.DateTimeUtc,
  media: Schema.Array(ReviewedMediaSchema),
  // Its time, once it has one.
  schedule: Schema.NullOr(PostScheduleSchema),
  status: Schema.Literals(["draft", "awaitingApproval", "scheduled"]),
}).annotate({ identifier: "ReviewPage" });

export type ReviewPage = typeof ReviewPageSchema.Type;

const VisitorNameSchema = Schema.String.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(maxVisitorNameLength),
  isWithoutNul
);

/** A visitor's comment: who they say they are, and what they say. */
export const VisitorCommentSchema = Schema.Struct({
  ...NewCommentSchema.fields,
  // Where they hear of answers, if they ask to: used for nothing else.
  email: Schema.optionalKey(
    Schema.String.check(Schema.isMaxLength(maxVisitorEmailLength), isWithoutNul)
  ),
  // The language they read the page in, for that email.
  locale: Schema.Literals(["en", "fr"]),
  name: VisitorNameSchema,
}).annotate({ identifier: "VisitorComment" });

export type VisitorComment = typeof VisitorCommentSchema.Type;

/** A visitor's approval, under the name they give. */
export const VisitorApprovalSchema = Schema.Struct({
  name: VisitorNameSchema,
}).annotate({ identifier: "VisitorApproval" });

export type VisitorApproval = typeof VisitorApprovalSchema.Type;

/** A visitor's request for changes, under the name they give. */
export const VisitorChangesSchema = Schema.Struct({
  comment: CommentTextSchema,
  name: VisitorNameSchema,
}).annotate({ identifier: "VisitorChanges" });

export type VisitorChanges = typeof VisitorChangesSchema.Type;

// The link's token, and the captcha's when the server asks for one.
const linkHeaders = Schema.Struct({ "x-review-token": Schema.String });

const writeHeaders = Schema.Struct({
  "x-captcha-response": Schema.optionalKey(Schema.String),
  "x-review-token": Schema.String,
});

const closed = [ReviewLinkNotFound, ReviewLinkClosed];

const refusals = [
  ...closed,
  ReviewAccessDenied,
  ReviewCaptchaRequired,
  TooManyReviewRequests,
];

/**
 * A post's review for whoever holds a link to it. No credentials but the
 * link's token, sent in the `x-review-token` header, never in an address,
 * so it stays out of logs. Writes are limited per address and per link,
 * and need a captcha where the server has one.
 */
export class ReviewLinkApi extends HttpApiGroup.make("reviewLink")
  .add(
    HttpApiEndpoint.get("open", "/", {
      error: closed,
      headers: linkHeaders,
      success: ReviewPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with what the link shows. An unknown token is ReviewLinkNotFound; a link that ended, or whose post was published, cancelled or deleted, is ReviewLinkClosed, which says why.",
        summary: "Open a review link",
      })
    ),
    HttpApiEndpoint.post("comment", "/comments", {
      error: [...refusals, CommentInvalid],
      headers: writeHeaders,
      payload: VisitorCommentSchema,
      success: ReviewCommentSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Comments through a link that allows it, under the name given. Text is kept as plain text, without control characters. The body is ${maxReviewRequestBytes} bytes at most.`,
        summary: "Comment through a review link",
      })
    ),
    HttpApiEndpoint.post("approve", "/approve", {
      error: [...refusals, CommentInvalid, ApprovalNotPending],
      headers: writeHeaders,
      payload: VisitorApprovalSchema,
      success: Schema.Struct({ late: Schema.Boolean }),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Approves the post through a link that allows it: recorded with the name given, the time and the link. The post is scheduled, or, approved after its time (`late`), back to draft.",
        summary: "Approve through a review link",
      })
    ),
    HttpApiEndpoint.post("requestChanges", "/request-changes", {
      error: [...refusals, CommentInvalid, ApprovalNotPending],
      headers: writeHeaders,
      payload: VisitorChangesSchema,
      success: ReviewCommentSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Sends the post back to draft through a link that lets its holders approve, with a comment that says what to change.",
        summary: "Request changes through a review link",
      })
    )
  )
  .middleware(ReviewVisitor)
  .prefix("/api/review-link") {}
