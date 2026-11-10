import { Option, Schema } from "effect";
import type { DateTime } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { CommentIdSchema } from "./comment-id.ts";
import type { CommentId } from "./comment-id.ts";
import { ThreadIdSchema } from "./thread-id.ts";
import type { Thread } from "./thread.ts";

/** The longest comment Peal keeps: what is past it is cut. */
export const maxCommentLength = 10_000;

/** A comment's id on its platform: a status id, an AT URI. */
export const PlatformCommentIdSchema = Schema.NonEmptyString.check(
  Schema.isMaxLength(512)
);

/**
 * Who wrote a comment, as the platform shows them publicly: their id
 * there, their handle and the name they display. Nothing else of them is
 * read or kept: no picture, no profile, no count.
 */
export const CommentAuthorSchema = Schema.Struct({
  displayName: Schema.Option(Schema.String),
  handle: Schema.String,
  platformId: Schema.NonEmptyString,
});

export type CommentAuthor = typeof CommentAuthorSchema.Type;

/**
 * Where a comment stands for the workspace:
 *
 * - `new`: nobody answered it yet.
 * - `answered`: a reply went out, from Peal or on the platform, or a
 *   member said it needs none.
 * - `hidden`: the account hid it on the platform.
 * - `deleted`: the platform no longer shows it. Peal then keeps neither
 *   its text nor its author, only that there was a comment.
 */
export const CommentStateSchema = Schema.Literals([
  "new",
  "answered",
  "hidden",
  "deleted",
]);

export type CommentState = typeof CommentStateSchema.Type;

/**
 * A comment someone left under one of the workspace's posts, as its
 * platform gave it. It is that person's, not the workspace's: Peal shows
 * it and lets members answer it, and uses it for nothing else.
 */
export class Comment extends Schema.Class<Comment>(
  "peal-server/engagement/domain/Comment"
)({
  // When it was answered; kept while it is hidden, so unhiding restores it.
  answeredAt: Schema.Option(Schema.DateTimeUtc),
  // None once the platform no longer shows the comment.
  author: Schema.Option(CommentAuthorSchema),
  channelId: ChannelIdSchema,
  id: CommentIdSchema,
  // Whether the channel's account likes it.
  liked: Schema.Boolean,
  // The comment it answers; none when it answers the post itself.
  parentPlatformId: Schema.Option(PlatformCommentIdSchema),
  permalink: Schema.Option(Schema.String),
  platformCommentId: PlatformCommentIdSchema,
  // When Peal first read it.
  receivedAt: Schema.DateTimeUtc,
  state: CommentStateSchema,
  text: Schema.String,
  threadId: ThreadIdSchema,
  workspaceId: WorkspaceIdSchema,
  // When its author wrote it, as the platform says.
  writtenAt: Schema.DateTimeUtc,
}) {}

/** A comment as a read of its platform found it. */
export const CommentReadingSchema = Schema.Struct({
  author: CommentAuthorSchema,
  // Whether the account hid it on the platform.
  hidden: Schema.Boolean,
  // Whether the account likes it; none when the read cannot tell.
  liked: Schema.Option(Schema.Boolean),
  parentPlatformId: Schema.Option(PlatformCommentIdSchema),
  permalink: Schema.Option(Schema.String),
  platformCommentId: PlatformCommentIdSchema,
  text: Schema.String,
  writtenAt: Schema.DateTimeUtc,
});

export type CommentReading = typeof CommentReadingSchema.Type;

type Fields = ConstructorParameters<typeof Comment>[0];

const withFields = (comment: Comment, changed: Partial<Fields>): Comment =>
  new Comment({
    answeredAt: comment.answeredAt,
    author: comment.author,
    channelId: comment.channelId,
    id: comment.id,
    liked: comment.liked,
    parentPlatformId: comment.parentPlatformId,
    permalink: comment.permalink,
    platformCommentId: comment.platformCommentId,
    receivedAt: comment.receivedAt,
    state: comment.state,
    text: comment.text,
    threadId: comment.threadId,
    workspaceId: comment.workspaceId,
    writtenAt: comment.writtenAt,
    ...changed,
  });

// The text's first `maxCommentLength` characters, whole: a for-of loop
// reads code points, so no character is cut in two.
const cut = (text: string): string => {
  if (text.length <= maxCommentLength) {
    return text;
  }

  let kept = "";
  let count = 0;

  for (const character of text) {
    if (count === maxCommentLength) {
      break;
    }

    kept += character;
    count += 1;
  }

  return kept;
};

// What a comment that is neither hidden nor deleted is: answered or new.
const standing = (answeredAt: Option.Option<DateTime.Utc>): CommentState =>
  Option.isSome(answeredAt) ? "answered" : "new";

/** A comment read for the first time, at `now`. */
export const receiveComment = (
  id: CommentId,
  thread: Pick<Thread, "channelId" | "id" | "workspaceId">,
  reading: CommentReading,
  now: DateTime.Utc
): Comment =>
  new Comment({
    answeredAt: Option.none(),
    author: Option.some(reading.author),
    channelId: thread.channelId,
    id,
    liked: Option.getOrElse(reading.liked, () => false),
    parentPlatformId: reading.parentPlatformId,
    permalink: reading.permalink,
    platformCommentId: reading.platformCommentId,
    receivedAt: now,
    state: reading.hidden ? "hidden" : "new",
    text: cut(reading.text),
    threadId: thread.id,
    workspaceId: thread.workspaceId,
    writtenAt: reading.writtenAt,
  });

/**
 * A comment Peal already keeps, as a later read found it: its text and its
 * author's name follow the platform, where both can be edited, and so does
 * whether it is hidden. A comment back after Peal thought it deleted is
 * shown again.
 */
export const refreshComment = (
  comment: Comment,
  reading: CommentReading
): Comment =>
  withFields(comment, {
    author: Option.some(reading.author),
    liked: Option.getOrElse(reading.liked, () => comment.liked),
    permalink: reading.permalink,
    state: reading.hidden ? "hidden" : standing(comment.answeredAt),
    text: cut(reading.text),
  });

/**
 * The comment once its platform no longer shows it: what its author wrote
 * and who they are leave Peal with it.
 */
export const forgetComment = (comment: Comment): Comment =>
  withFields(comment, {
    author: Option.none(),
    liked: false,
    permalink: Option.none(),
    state: "deleted",
    text: "",
  });

/** Whether the comment can still be answered or moderated. */
export const isOnPlatform = (comment: Comment): boolean =>
  comment.state !== "deleted";

/**
 * The comment, answered at `now`: by a reply, or because a member said it
 * needs none. A hidden comment stays hidden, a deleted one deleted.
 */
export const markAnswered = (comment: Comment, now: DateTime.Utc): Comment =>
  withFields(comment, {
    answeredAt: Option.orElse(comment.answeredAt, () => Option.some(now)),
    state: comment.state === "new" ? "answered" : comment.state,
  });

/** The comment, waiting for an answer again. */
export const markUnanswered = (comment: Comment): Comment =>
  withFields(comment, {
    answeredAt: Option.none(),
    state: comment.state === "answered" ? "new" : comment.state,
  });

/** The comment once the account hid it, or showed it again. */
export const setHidden = (comment: Comment, hidden: boolean): Comment =>
  comment.state === "deleted"
    ? comment
    : withFields(comment, {
        state: hidden ? "hidden" : standing(comment.answeredAt),
      });

/** The comment once the account liked it, or took its like back. */
export const setLiked = (comment: Comment, liked: boolean): Comment =>
  comment.state === "deleted" ? comment : withFields(comment, { liked });
