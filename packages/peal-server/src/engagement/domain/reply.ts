import { Duration, Option, Result, Schema } from "effect";
import type { DateTime } from "effect";

import {
  ChannelIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";

import { CommentIdSchema } from "./comment-id.ts";
import { PlatformCommentIdSchema } from "./comment.ts";
import type { Comment } from "./comment.ts";
import { InvalidReplyTransition } from "./invalid-reply-transition.ts";
import { ReplyIdSchema } from "./reply-id.ts";
import type { ReplyId } from "./reply-id.ts";
import { ThreadIdSchema } from "./thread-id.ts";

/**
 * Why a reply did not go out. Each means the platform shows nothing:
 *
 * - `channelUnavailable`: the channel was disconnected or turned off.
 * - `reconnectNeeded`: the platform refuses the channel's token.
 * - `rateLimited`: the platform asked the account to slow down.
 * - `platformUnavailable`: the platform did not answer, or failed.
 * - `commentGone`: the comment is no longer on the platform.
 * - `refused`: the platform refused the reply: its author limited who may
 *   answer, or the text is not allowed there.
 * - `tooLong`: the platform refused the reply as too long (YouTube's
 *   `commentTextTooLong`, whose limit it does not state).
 * - `notSent`: its outcome was unknown, and a member found it never went
 *   out.
 */
export const ReplyFailureSchema = Schema.Literals([
  "channelUnavailable",
  "reconnectNeeded",
  "rateLimited",
  "platformUnavailable",
  "commentGone",
  "refused",
  "notSent",
  "tooLong",
]);

export type ReplyFailure = typeof ReplyFailureSchema.Type;

/**
 * Why Peal cannot tell whether a reply went out:
 *
 * - `noResponse`: the request left and no answer came back.
 * - `interrupted`: the server stopped during the call, and the platform
 *   could not say afterwards.
 * - `adapterFailure`: a bug broke the call after the request may have left.
 */
export const ReplyDoubtSchema = Schema.Literals([
  "noResponse",
  "interrupted",
  "adapterFailure",
]);

export type ReplyDoubt = typeof ReplyDoubtSchema.Type;

/** How sending a reply ended, as the platform's adapter tells it. */
export const SendOutcomeSchema = Schema.Union([
  Schema.TaggedStruct("sent", {
    permalink: Schema.Option(Schema.String),
    platformCommentId: PlatformCommentIdSchema,
  }),
  Schema.TaggedStruct("failed", { reason: ReplyFailureSchema }),
  Schema.TaggedStruct("unconfirmed", { reason: ReplyDoubtSchema }),
]);

export type SendOutcome = typeof SendOutcomeSchema.Type;

export const ReplyStatusSchema = Schema.Union([
  // Journalled, and on its way. `attemptedAt` is when a run first set out
  // to call the platform: from then on the call may have left, so a later
  // run looks the reply up instead of sending it.
  Schema.TaggedStruct("sending", {
    attemptedAt: Schema.Option(Schema.DateTimeUtc),
  }),
  Schema.TaggedStruct("sent", {
    at: Schema.DateTimeUtc,
    permalink: Schema.Option(Schema.String),
    // None when a member confirmed by hand a reply Peal could not find.
    platformCommentId: Schema.Option(PlatformCommentIdSchema),
  }),
  Schema.TaggedStruct("failed", {
    at: Schema.DateTimeUtc,
    reason: ReplyFailureSchema,
  }),
  // It may be on the platform: never sent again, a member checks.
  Schema.TaggedStruct("unconfirmed", {
    at: Schema.DateTimeUtc,
    reason: ReplyDoubtSchema,
  }),
  // Sent, then deleted from the platform by a member.
  Schema.TaggedStruct("withdrawn", { at: Schema.DateTimeUtc }),
]);

export type ReplyStatus = typeof ReplyStatusSchema.Type;

/**
 * A public answer to a comment, sent from Peal as the channel's account.
 * It is journalled before the platform is called, and sent once: a reply
 * whose outcome is unknown is looked up, never sent again.
 */
export class Reply extends Schema.Class<Reply>(
  "peal-server/engagement/domain/Reply"
)({
  // The member who wrote it; none for an API key, or once they closed
  // their account.
  authorId: Schema.Option(UserIdSchema),
  channelId: ChannelIdSchema,
  commentId: CommentIdSchema,
  createdAt: Schema.DateTimeUtc,
  id: ReplyIdSchema,
  status: ReplyStatusSchema,
  text: Schema.NonEmptyString,
  threadId: ThreadIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/**
 * How long after it was written a reply may still be `sending` before it
 * is handed to a person as `unconfirmed`: its job usually ends in seconds,
 * and retries a database that is down for a few minutes. Past that the
 * job gave up, was lost, or still waits its turn at the channel's gate
 * behind long uploads: whichever it is, the handover stops it for good
 * (`SendReply.settleStranded`), so the reply is never sent after.
 */
export const strandedAfter = Duration.hours(1);

/**
 * The longest a call to a platform that a gate claimed can still be
 * making: its requests are each bounded, and it makes a few. A reply
 * whose call was claimed more recently is never handed over, as the call
 * may yet answer.
 */
export const callBound = Duration.minutes(10);

/**
 * How long an idempotency key names the reply it made: the same key with
 * the same request answers that reply, and never makes another.
 */
export const replyKeyLifetime = Duration.hours(24);

type Transition = Result.Result<Reply, InvalidReplyTransition>;

type Fields = ConstructorParameters<typeof Reply>[0];

const withStatus = (reply: Reply, status: Fields["status"]): Reply =>
  new Reply({
    authorId: reply.authorId,
    channelId: reply.channelId,
    commentId: reply.commentId,
    createdAt: reply.createdAt,
    id: reply.id,
    status,
    text: reply.text,
    threadId: reply.threadId,
    workspaceId: reply.workspaceId,
  });

const refused = (reply: Reply): Transition =>
  Result.fail(
    new InvalidReplyTransition({ from: reply.status._tag, replyId: reply.id })
  );

/** A reply to the comment, about to be journalled and sent. */
export const writeReply = (
  id: ReplyId,
  comment: Pick<Comment, "channelId" | "id" | "threadId" | "workspaceId">,
  authorId: Option.Option<UserId>,
  text: string,
  now: DateTime.Utc
): Reply =>
  new Reply({
    authorId,
    channelId: comment.channelId,
    commentId: comment.id,
    createdAt: now,
    id,
    status: { _tag: "sending", attemptedAt: Option.none() },
    text,
    threadId: comment.threadId,
    workspaceId: comment.workspaceId,
  });

/**
 * The reply as a run sets out to call the platform, recorded before the
 * call. None when the reply is no longer on its way.
 */
export const beginSending = (reply: Reply, now: DateTime.Utc): Transition =>
  reply.status._tag === "sending"
    ? Result.succeed(
        withStatus(reply, {
          _tag: "sending",
          attemptedAt: Option.orElse(reply.status.attemptedAt, () =>
            Option.some(now)
          ),
        })
      )
    : refused(reply);

/**
 * Whether an earlier run may already have called the platform for this
 * reply: it is then looked up, never sent again blindly.
 */
export const wasAttempted = (reply: Reply): boolean =>
  reply.status._tag === "sending" && Option.isSome(reply.status.attemptedAt);

/** Records how sending ended. Only a reply on its way can end. */
export const settleReply = (
  reply: Reply,
  outcome: SendOutcome,
  now: DateTime.Utc
): Transition => {
  if (reply.status._tag !== "sending") {
    return refused(reply);
  }

  if (outcome._tag === "sent") {
    return Result.succeed(
      withStatus(reply, {
        _tag: "sent",
        at: now,
        permalink: outcome.permalink,
        platformCommentId: Option.some(outcome.platformCommentId),
      })
    );
  }

  if (outcome._tag === "failed") {
    return Result.succeed(
      withStatus(reply, { _tag: "failed", at: now, reason: outcome.reason })
    );
  }

  return Result.succeed(
    withStatus(reply, { _tag: "unconfirmed", at: now, reason: outcome.reason })
  );
};

/**
 * Records what a member found on the platform for a reply Peal could not
 * confirm: it is there, or it never went out.
 */
export const confirmReply = (
  reply: Reply,
  found: boolean,
  now: DateTime.Utc
): Transition =>
  reply.status._tag === "unconfirmed"
    ? Result.succeed(
        withStatus(
          reply,
          found
            ? {
                _tag: "sent",
                at: now,
                permalink: Option.none(),
                platformCommentId: Option.none(),
              }
            : { _tag: "failed", at: now, reason: "notSent" }
        )
      )
    : refused(reply);

/**
 * The id on the platform of a reply that can be taken back: one Peal
 * knows went out. A reply confirmed by hand has none.
 */
export const withdrawable = (reply: Reply): Option.Option<string> =>
  reply.status._tag === "sent" ? reply.status.platformCommentId : Option.none();

/** The reply once it was deleted from the platform. */
export const withdrawReply = (reply: Reply, now: DateTime.Utc): Transition =>
  Option.isSome(withdrawable(reply))
    ? Result.succeed(withStatus(reply, { _tag: "withdrawn", at: now }))
    : refused(reply);

/** Whether the reply answers its comment: sent, or possibly so. */
export const answers = (reply: Reply): boolean =>
  reply.status._tag === "sent" ||
  reply.status._tag === "sending" ||
  reply.status._tag === "unconfirmed";

/** The reply without its author, once their account is closed. */
export const forgetAuthor = (reply: Reply): Reply =>
  new Reply({
    authorId: Option.none(),
    channelId: reply.channelId,
    commentId: reply.commentId,
    createdAt: reply.createdAt,
    id: reply.id,
    status: reply.status,
    text: reply.text,
    threadId: reply.threadId,
    workspaceId: reply.workspaceId,
  });
