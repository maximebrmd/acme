import { DateTime, Option } from "effect";

import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import { receiveComment } from "#engagement/domain/comment.ts";
import type { Comment, CommentReading } from "#engagement/domain/comment.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import { ReviewIdSchema } from "#engagement/domain/review-id.ts";
import { ReviewReplyIdSchema } from "#engagement/domain/review-reply-id.ts";
import { ReviewThreadIdSchema } from "#engagement/domain/review-thread-id.ts";
import { followLocation } from "#engagement/domain/review-thread.ts";
import type { ReviewThread } from "#engagement/domain/review-thread.ts";
import { receiveReview } from "#engagement/domain/review.ts";
import type { Review, ReviewReading } from "#engagement/domain/review.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";
import { followPost } from "#engagement/domain/thread.ts";
import type { FollowedPost, Thread } from "#engagement/domain/thread.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

// Synthetic ids and people for the engagement tests: nothing here names a
// real account.

const uuid7 = (n: number) =>
  `00000000-0000-7000-8000-${n.toString().padStart(12, "0")}`;

export const threadId = (n: number) => ThreadIdSchema.make(uuid7(n));

export const commentId = (n: number) => CommentIdSchema.make(uuid7(n));

export const replyId = (n: number) => ReplyIdSchema.make(uuid7(n));

export const channelId = (n: number) => ChannelIdSchema.make(uuid7(n));

export const workspaceId = WorkspaceIdSchema.make(
  "11111111-1111-4111-8111-111111111111"
);

export const memberId = UserIdSchema.make(
  "22222222-2222-4222-8222-222222222222"
);

export const publishedAt = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

export const followedPost = (
  n: number,
  changed: Partial<FollowedPost> = {}
): FollowedPost => ({
  authorId: Option.some(memberId),
  channelId: channelId(1),
  permalink: Option.some(`https://social.example/@studio/${n}`),
  platformPostId: PlatformPostIdSchema.make(`${1000 + n}`),
  postId: PostIdSchema.make(uuid7(500 + n)),
  publishedAt,
  targetId: PostTargetIdSchema.make(uuid7(900 + n)),
  workspaceId,
  ...changed,
});

export const thread = (
  n: number,
  changed: Partial<FollowedPost> = {}
): Thread => followPost(threadId(n), followedPost(n, changed));

export const reading = (
  n: number,
  changed: Partial<CommentReading> = {}
): CommentReading => ({
  author: Option.some({
    displayName: Option.some(`Reader ${n}`),
    handle: `reader${n}@social.example`,
    platformId: `${7000 + n}`,
  }),
  fromAccount: false,
  hidden: Option.some(false),
  liked: Option.none(),
  parentPlatformId: Option.none(),
  permalink: Option.some(`https://social.example/@reader${n}/${2000 + n}`),
  platformCommentId: `${2000 + n}`,
  text: `Comment ${n}`,
  writtenAt: DateTime.addDuration(publishedAt, "5 minutes"),
  ...changed,
});

export const comment = (
  n: number,
  changed: Partial<CommentReading> = {},
  on: Thread = thread(1)
): Comment =>
  receiveComment(
    commentId(n),
    on,
    reading(n, changed),
    DateTime.addDuration(publishedAt, "10 minutes")
  );

// Reviews: one location's thread, its reviews as Google would give them.

export const reviewThreadId = (n: number) =>
  ReviewThreadIdSchema.make(uuid7(3000 + n));

export const reviewId = (n: number) => ReviewIdSchema.make(uuid7(4000 + n));

export const reviewReplyId = (n: number) =>
  ReviewReplyIdSchema.make(uuid7(6000 + n));

export const reviewedAt = DateTime.makeUnsafe("2026-11-12T09:00:00Z");

export const reviewThread = (
  n = 1,
  on: ChannelId = channelId(1)
): ReviewThread =>
  followLocation(reviewThreadId(n), { channelId: on, workspaceId }, reviewedAt);

export const reviewReading = (
  n: number,
  changed: Partial<ReviewReading> = {}
): ReviewReading => ({
  photoCount: 0,
  platformReviewId: `accounts/101/locations/202/reviews/r${n}`,
  rating: 5,
  reply: Option.none(),
  reviewerName: Option.some(`Visitor ${n}`),
  text: `Review ${n}`,
  updatedAt: DateTime.subtractDuration(reviewedAt, "1 hour"),
  writtenAt: DateTime.subtractDuration(reviewedAt, "1 hour"),
  ...changed,
});

export const review = (
  n: number,
  changed: Partial<ReviewReading> = {},
  on: ReviewThread = reviewThread()
): Review =>
  receiveReview(reviewId(n), on, reviewReading(n, changed), reviewedAt);
