import { DateTime, Option, Schema } from "effect";
import type {
  InboxAbilities,
  InboxComment,
  InboxReply,
  InboxThread,
  InboxThreadDetail,
  InboxThreadPage,
} from "peal-contract";

import type {
  ThreadDetail,
  ThreadsPage,
} from "#engagement/application/engagement-inbox.ts";
import type {
  ThreadCursor,
  ThreadSummary,
} from "#engagement/application/ports/engagement-store.ts";
import type { Comment } from "#engagement/domain/comment.ts";
import type { EngagementAbilities } from "#engagement/domain/engagement-abilities.ts";
import type { Reply } from "#engagement/domain/reply.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";

// What the API and the MCP tools answer about the inbox.

export const toAbilitiesView = (
  abilities: EngagementAbilities
): InboxAbilities => ({ ...abilities });

/**
 * A comment, with the id in Peal of the comment it answers: `ids` maps
 * each comment of its thread from its id on the platform.
 */
export const toCommentView = (
  comment: Comment,
  ids: ReadonlyMap<string, string> = new Map()
): InboxComment => ({
  author: comment.author.pipe(
    Option.map(({ displayName, handle, platformId }) => ({
      displayName: Option.getOrNull(displayName),
      handle,
      platformId,
    })),
    Option.getOrNull
  ),
  id: comment.id,
  liked: comment.liked,
  parentId: comment.parentPlatformId.pipe(
    Option.flatMap((parent) => Option.fromUndefinedOr(ids.get(parent))),
    Option.getOrNull
  ),
  permalink: Option.getOrNull(comment.permalink),
  receivedAt: comment.receivedAt,
  state: comment.state,
  text: comment.text,
  threadId: comment.threadId,
  writtenAt: comment.writtenAt,
});

export const toReplyView = (reply: Reply): InboxReply => {
  const { status } = reply;

  return {
    authorId: Option.getOrNull(reply.authorId),
    commentId: reply.commentId,
    createdAt: reply.createdAt,
    id: reply.id,
    permalink:
      status._tag === "sent" ? Option.getOrNull(status.permalink) : null,
    reason:
      status._tag === "failed" || status._tag === "unconfirmed"
        ? status.reason
        : null,
    settledAt: status._tag === "sending" ? null : status.at,
    status: status._tag,
    text: reply.text,
    threadId: reply.threadId,
  };
};

export const toThreadView = (summary: ThreadSummary): InboxThread => {
  const { thread } = summary;

  return {
    channelId: thread.channelId,
    collectionEnded:
      thread.collection._tag === "ended" ? thread.collection.reason : null,
    comments: summary.comments,
    id: thread.id,
    lastCollectedAt: Option.getOrNull(thread.lastCollectedAt),
    lastCommentAt: Option.getOrNull(summary.lastCommentAt),
    permalink: Option.getOrNull(thread.permalink),
    postId: thread.postId,
    publishedAt: thread.publishedAt,
    targetId: thread.targetId,
    unanswered: summary.unanswered,
  };
};

// A cursor is where a page ended, as text: whether the thread had
// comments waiting, its latest comment's instant, and its id.
const encodeCursor = (cursor: ThreadCursor): string =>
  [
    cursor.waiting ? "1" : "0",
    DateTime.toEpochMillis(cursor.lastCommentAt),
    cursor.threadId,
  ].join("_");

const decodeThreadId = Schema.decodeUnknownOption(ThreadIdSchema);

/** The cursor a client sent back, if it is one this server made. */
export const cursorOf = (text: string): Option.Option<ThreadCursor> => {
  const [waiting = "", millis = "", id = ""] = text.split("_");

  if (waiting !== "0" && waiting !== "1") {
    return Option.none();
  }

  return Option.all({
    lastCommentAt: /^\d{1,16}$/u.test(millis)
      ? DateTime.make(Number(millis))
      : Option.none(),
    threadId: decodeThreadId(id),
  }).pipe(Option.map((found) => ({ ...found, waiting: waiting === "1" })));
};

export const toThreadPageView = (page: ThreadsPage): InboxThreadPage => ({
  items: page.threads.map(toThreadView),
  nextCursor: page.next.pipe(Option.map(encodeCursor), Option.getOrNull),
});

export const toThreadDetailView = (detail: ThreadDetail): InboxThreadDetail => {
  const ids = new Map(
    detail.comments.map((comment) => [comment.platformCommentId, comment.id])
  );

  return {
    abilities: toAbilitiesView(detail.abilities),
    comments: detail.comments.map((comment) => toCommentView(comment, ids)),
    platform: Option.getOrNull(detail.platform),
    replies: detail.replies.map(toReplyView),
    thread: toThreadView(detail.summary),
  };
};
