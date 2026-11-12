import { Option, Schema } from "effect";
import type { DateTime } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { storableLine, storableText } from "#shared/domain/platform-text.ts";

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

/**
 * A comment as a read of its platform found it. One the channel's own
 * account wrote (`fromAccount`) is not kept: it tells that the comment it
 * answers was answered, on the platform or from Peal.
 */
export const CommentReadingSchema = Schema.Struct({
  // None when the platform does not show who wrote it (Facebook shows a
  // commenter only to an app they authorized, or a Page that may see them).
  author: Schema.Option(CommentAuthorSchema),
  fromAccount: Schema.Boolean,
  // Whether the account hid it on the platform; none when the read cannot
  // tell, and what Peal knows stands.
  hidden: Schema.Option(Schema.Boolean),
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

/** The longest display name Peal keeps of a comment's author. */
export const maxAuthorNameLength = 200;

/** The longest handle Peal keeps of a comment's author. */
export const maxAuthorHandleLength = 320;

// The longest id a platform gives a comment or an account, and the longest
// address of a comment, that Peal keeps.
const maxPlatformIdLength = 512;
const maxPermalinkLength = 2048;

// A comment's address, when it is one a browser opens on the web and
// short enough to be one: anything else is no address.
const webAddress = (address: string): Option.Option<string> => {
  const cleaned = storableLine(address, maxPermalinkLength + 1);

  return cleaned.length <= maxPermalinkLength &&
    /^https?:\/\/\S+$/u.test(cleaned)
    ? Option.some(cleaned)
    : Option.none();
};

/**
 * A reading as Peal keeps it. Everything in it was written by someone
 * outside, or by the platform for them: each string is made storable
 * (`#shared/domain/platform-text.ts`) and bounded before anything reads
 * it, ids included, so one comment never fails a write or forges a line
 * where it is shown. None when its id is empty once cleaned.
 */
export const storableReading = (
  reading: CommentReading
): Option.Option<CommentReading> => {
  const platformCommentId = storableLine(
    reading.platformCommentId,
    maxPlatformIdLength
  );

  const author = reading.author.pipe(
    Option.map((given) => ({
      displayName: given.displayName.pipe(
        Option.map((name) => storableLine(name, maxAuthorNameLength)),
        Option.filter((name) => name !== "")
      ),
      handle: storableLine(given.handle, maxAuthorHandleLength),
      platformId: storableLine(given.platformId, maxPlatformIdLength),
    }))
  );

  // An author given with an id that cleans to nothing is no reading: a
  // missing author is none, never an empty one.
  return platformCommentId === "" ||
    Option.exists(author, ({ platformId }) => platformId === "")
    ? Option.none()
    : Option.some({
        author,
        fromAccount: reading.fromAccount,
        hidden: reading.hidden,
        liked: reading.liked,
        parentPlatformId: reading.parentPlatformId.pipe(
          Option.map((parent) => storableLine(parent, maxPlatformIdLength)),
          Option.filter((parent) => parent !== "")
        ),
        permalink: reading.permalink.pipe(Option.flatMap(webAddress)),
        platformCommentId,
        text: storableText(reading.text, maxCommentLength),
        writtenAt: reading.writtenAt,
      });
};

// A reading the domain was handed as it came: cleaned here too, so no
// caller keeps one raw. One whose id cleans to nothing keeps its own.
const cleaned = (reading: CommentReading): CommentReading =>
  Option.getOrElse(storableReading(reading), () => ({
    ...reading,
    author: Option.none(),
    parentPlatformId: Option.none(),
    permalink: Option.none(),
    platformCommentId: storableLine(
      reading.platformCommentId,
      maxPlatformIdLength
    ),
    text: storableText(reading.text, maxCommentLength),
  }));

// What a comment that is neither hidden nor deleted is: answered or new.
const standing = (answeredAt: Option.Option<DateTime.Utc>): CommentState =>
  Option.isSome(answeredAt) ? "answered" : "new";

/** A comment read for the first time, at `now`. */
export const receiveComment = (
  id: CommentId,
  thread: Pick<Thread, "channelId" | "id" | "workspaceId">,
  given: CommentReading,
  now: DateTime.Utc
): Comment => {
  const reading = cleaned(given);

  return new Comment({
    answeredAt: Option.none(),
    author: reading.author,
    channelId: thread.channelId,
    id,
    liked: Option.getOrElse(reading.liked, () => false),
    parentPlatformId: reading.parentPlatformId,
    permalink: reading.permalink,
    platformCommentId: reading.platformCommentId,
    receivedAt: now,
    state: Option.getOrElse(reading.hidden, () => false) ? "hidden" : "new",
    text: reading.text,
    threadId: thread.id,
    workspaceId: thread.workspaceId,
    writtenAt: reading.writtenAt,
  });
};

/**
 * A comment Peal already keeps, as a later read found it: its text and its
 * author's name follow the platform, where both can be edited, and so does
 * whether it is hidden, when the read tells. A comment back after Peal
 * thought it deleted is shown again.
 */
export const refreshComment = (
  comment: Comment,
  given: CommentReading
): Comment => {
  const reading = cleaned(given);

  return withFields(comment, {
    author: reading.author,
    liked: Option.getOrElse(reading.liked, () => comment.liked),
    permalink: reading.permalink,
    state: Option.getOrElse(reading.hidden, () => comment.state === "hidden")
      ? "hidden"
      : standing(comment.answeredAt),
    text: reading.text,
  });
};

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
