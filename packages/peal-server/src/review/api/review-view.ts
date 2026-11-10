import type { DateTime } from "effect";
import { Option } from "effect";
import type {
  ApprovalRequest as ApprovalView,
  ReviewComment as CommentView,
  Reviewer as ReviewerView,
  ReviewLink as LinkView,
  ReviewPage as PageView,
} from "peal-contract";

import type { LinkPage } from "#review/application/visitor-review.ts";
import type { ApprovalRequest } from "#review/domain/approval-request.ts";
import { locate } from "#review/domain/comment-anchor.ts";
import type { ReviewComment } from "#review/domain/review-comment.ts";
import { standingOf } from "#review/domain/review-link.ts";
import type { ReviewLink } from "#review/domain/review-link.ts";
import type { Reviewer } from "#review/domain/reviewer.ts";
import type { ChannelId, UserId } from "#shared/domain/ids.ts";

/** What a view is made with, besides what it shows. */
export interface ViewContext {
  /** The names of the members it mentions. */
  readonly names: ReadonlyMap<UserId, string>;
  /**
   * Whether it is shown to the workspace: through a link, the ids of
   * members and links stay out.
   */
  readonly toWorkspace: boolean;
}

const nameOf = (names: ViewContext["names"], userId: Option.Option<UserId>) =>
  userId.pipe(
    Option.flatMapNullishOr((id) => names.get(id)),
    Option.getOrNull
  );

/** Who commented or decided, as clients see them. */
export const reviewerView = (
  reviewer: Reviewer,
  { names, toWorkspace }: ViewContext
): ReviewerView => {
  if (reviewer._tag === "member") {
    return {
      kind: "member",
      linkId: null,
      name: nameOf(names, reviewer.userId),
      userId: toWorkspace ? Option.getOrNull(reviewer.userId) : null,
    };
  }

  return reviewer._tag === "visitor"
    ? {
        kind: "visitor",
        linkId: toWorkspace ? reviewer.linkId : null,
        name: Option.getOrNull(reviewer.name),
        userId: null,
      }
    : { kind: "apiKey", linkId: null, name: null, userId: null };
};

/**
 * A comment as clients see it, its selection found again in the text the
 * post has on its channel now (`textOn`).
 */
export const commentView = (
  comment: ReviewComment,
  textOn: (channelId: ChannelId) => Option.Option<string>,
  context: ViewContext
): CommentView => ({
  anchor: comment.anchor.pipe(
    Option.map(({ channelId, selection }) => ({
      channelId,
      selection: selection.pipe(
        Option.map((chosen) => ({
          located: textOn(channelId).pipe(
            Option.flatMap((text) => locate(chosen, text)),
            Option.getOrNull
          ),
          quote: chosen.quote,
          start: chosen.start,
        })),
        Option.getOrNull
      ),
    })),
    Option.getOrNull
  ),
  author: reviewerView(comment.author, context),
  createdAt: comment.createdAt,
  id: comment.id,
  parentId: Option.getOrNull(comment.parentId),
  postId: comment.postId,
  resolved: comment.resolution.pipe(
    Option.map(({ at, by }) => ({ at, by: reviewerView(by, context) })),
    Option.getOrNull
  ),
  text: comment.text,
});

/** An approval request as clients see it. */
export const approvalView = (
  request: ApprovalRequest,
  context: ViewContext
): ApprovalView => ({
  decision: request.decision.pipe(
    Option.map(({ at, by }) => ({ at, by: reviewerView(by, context) })),
    Option.getOrNull
  ),
  id: request.id,
  postId: request.postId,
  requestedAt: request.requestedAt,
  requestedBy: context.toWorkspace
    ? Option.getOrNull(request.requestedBy)
    : null,
  requestedByName: nameOf(context.names, request.requestedBy),
  requestedVia: request.requestedVia,
  schedule: { at: request.scheduledAt, timeZone: request.timeZone },
  status: request.status,
});

/** A review link as the workspace sees it: never its token. */
export const linkView = (link: ReviewLink, now: DateTime.Utc): LinkView => ({
  access: link.access,
  createdAt: link.createdAt,
  createdBy: Option.getOrNull(link.createdBy),
  expiresAt: link.expiresAt,
  id: link.id,
  postId: link.postId,
  revokedAt: Option.getOrNull(link.revokedAt),
  status: standingOf(link, now),
});

/** The text a post has on each channel, for its comments' selections. */
export const textsOf =
  (
    channels: readonly {
      readonly channelId: ChannelId;
      readonly text: string;
    }[]
  ) =>
  (channelId: ChannelId): Option.Option<string> =>
    Option.fromUndefinedOr(
      channels.find((channel) => channel.channelId === channelId)
    ).pipe(Option.map(({ text }) => text));

/** What a link shows to whoever holds it. */
export const pageView = (page: LinkPage): PageView | undefined => {
  const { link, post } = page;
  const context: ViewContext = { names: page.names, toWorkspace: false };

  // A link shows only a post still to go out: the use case closed the rest.
  if (post.status === "published" || post.status === "cancelled") {
    return undefined;
  }

  return {
    access: link.access,
    approval: page.request.pipe(
      Option.map((request) => approvalView(request, context)),
      Option.getOrNull
    ),
    channels: post.channels.map(({ channelId, handle, platform, text }) => ({
      channelId,
      handle: Option.getOrNull(handle),
      platform: Option.getOrNull(platform),
      text,
    })),
    comments: page.comments.map((comment) =>
      commentView(comment, textsOf(post.channels), context)
    ),
    expiresAt: link.expiresAt,
    media: post.media.map(({ altText, mediaId }) => {
      const preview = Option.fromUndefinedOr(page.previews.get(mediaId));

      return {
        altText,
        kind: preview.pipe(
          Option.map(({ kind }) => kind),
          Option.getOrNull
        ),
        mediaId,
        url: preview.pipe(
          Option.map(({ url }) => url),
          Option.getOrNull
        ),
      };
    }),
    schedule: post.schedule.pipe(
      Option.map(({ at, timeZone }) => ({ at, timeZone })),
      Option.getOrNull
    ),
    status: post.status,
  };
};
