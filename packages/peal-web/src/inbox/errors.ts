import { Cause, Exit, Option, Schema } from "effect";
import {
  InboxActionFailed,
  InboxActionUnavailable,
  MessageMentionsOutside,
  ReplyInvalid,
  ReplyStatusConflict,
} from "peal-contract";

// Why an inbox action failed, as the Inbox.errors catalogue explains it,
// from the API's errors.

/** A failure the catalogue explains without anything more. */
export const InboxErrorKeySchema = Schema.Literals([
  "commentGone",
  "commentNotFound",
  "conversationNotFound",
  "forbidden",
  "messagePending",
  "messagesUsed",
  "replyEmpty",
  "replyNotFound",
  "replyPending",
  "reviewNotFound",
  "threadNotFound",
  "unknown",
]);

export type InboxErrorKey = typeof InboxErrorKeySchema.Type;

export type InboxError =
  | { readonly key: InboxErrorKey }
  // The platform did not do what was asked: `reason` says why.
  | { readonly key: "actionFailed"; readonly reason: string }
  // The reply is in a state that does not allow what was asked.
  | { readonly key: "statusConflict"; readonly status: string }
  // The text that would go out is `length` long, and `maximum` fit.
  | {
      readonly key: "replyTooLong";
      readonly length: number;
      readonly maximum: number;
    }
  // A Mastodon message would reach accounts outside its conversation.
  | { readonly key: "mentionsOutside"; readonly mentions: string }
  | {
      readonly key: "unavailable";
      readonly standing: InboxActionUnavailable["standing"];
    };

// The API's errors that need nothing more to be explained, by tag.
const reasons = new Map<string, InboxErrorKey>([
  ["Forbidden", "forbidden"],
  ["InboxCommentGone", "commentGone"],
  ["InboxCommentNotFound", "commentNotFound"],
  ["InboxConversationNotFound", "conversationNotFound"],
  ["InboxMessageNotFound", "replyNotFound"],
  ["InboxReplyNotFound", "replyNotFound"],
  ["InboxReviewNotFound", "reviewNotFound"],
  ["InboxReviewThreadNotFound", "threadNotFound"],
  ["InboxThreadNotFound", "threadNotFound"],
  ["MessagePending", "messagePending"],
  ["ReplyPending", "replyPending"],
  // The billing account's messages of the month: the upgrade dialog
  // opens beside.
  ["UsageAllowanceReached", "messagesUsed"],
]);

const isInvalid = Schema.is(ReplyInvalid);

const isUnavailable = Schema.is(InboxActionUnavailable);

const isFailed = Schema.is(InboxActionFailed);

const isConflict = Schema.is(ReplyStatusConflict);

const isOutside = Schema.is(MessageMentionsOutside);

const explain = (error: { readonly _tag: string }): InboxError => {
  if (isInvalid(error)) {
    return error.reason === "tooLong" &&
      error.length !== null &&
      error.maximum !== null
      ? { key: "replyTooLong", length: error.length, maximum: error.maximum }
      : { key: "replyEmpty" };
  }

  if (isUnavailable(error)) {
    return { key: "unavailable", standing: error.standing };
  }

  if (isFailed(error)) {
    return { key: "actionFailed", reason: error.reason };
  }

  if (isOutside(error)) {
    return { key: "mentionsOutside", mentions: error.mentions.join(", ") };
  }

  if (isConflict(error)) {
    return { key: "statusConflict", status: error.status };
  }

  return { key: reasons.get(error._tag) ?? "unknown" };
};

/**
 * How an inbox call ended, for the catalogue to explain, or none if it
 * worked. Anything but the API's own errors, such as the server being down,
 * is unknown.
 */
export const inboxErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<InboxError> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.map(explain),
          Option.getOrElse((): InboxError => ({ key: "unknown" }))
        )
      );
