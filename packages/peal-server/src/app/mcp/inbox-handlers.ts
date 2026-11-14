import { Effect, Option, Schema } from "effect";
import { CurrentMember, defaultInboxPageSize } from "peal-contract";

import { InboxTools } from "#app/mcp/inbox-tools.ts";
import { notAllowed, refuse, usageRefusal } from "#app/mcp/refusals.ts";
import {
  conversationCursorOf,
  messageCursorOf,
  toConversationDetailView,
  toConversationPageView,
  toOutgoingMessageView,
} from "#engagement/api/inbox-message-view.ts";
import {
  reviewCursorOf,
  toReviewReplyView,
  toReviewThreadDetailView,
  toReviewThreadPageView,
  toReviewView,
} from "#engagement/api/inbox-review-view.ts";
import {
  cursorOf,
  toCommentView,
  toReplyView,
  toThreadDetailView,
  toThreadPageView,
} from "#engagement/api/inbox-view.ts";
import type { AbilityUnavailable } from "#engagement/application/ability-unavailable.ts";
import { EngagementInbox } from "#engagement/application/engagement-inbox.ts";
import {
  EngagementMessages,
  maxMessagesPerPage,
} from "#engagement/application/engagement-messages.ts";
import { EngagementReplies } from "#engagement/application/engagement-replies.ts";
import { EngagementReviews } from "#engagement/application/engagement-reviews.ts";
import type { MessageAbilityUnavailable } from "#engagement/application/message-ability-unavailable.ts";
import type { ModerationFailed } from "#engagement/application/moderation-failed.ts";
import type { ReplyTooLong } from "#engagement/application/reply-too-long.ts";
import type { ReviewActionFailed } from "#engagement/application/review-action-failed.ts";
import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import { ConversationIdSchema } from "#engagement/domain/conversation-id.ts";
import type { InvalidReplyTransition } from "#engagement/domain/invalid-reply-transition.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import { ReviewIdSchema } from "#engagement/domain/review-id.ts";
import { ReviewThreadIdSchema } from "#engagement/domain/review-thread-id.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";
import { actorOf } from "#shared/api/actor.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";

const decodeThreadId = Schema.decodeUnknownOption(ThreadIdSchema);
const decodeCommentId = Schema.decodeUnknownOption(CommentIdSchema);
const decodeReplyId = Schema.decodeUnknownOption(ReplyIdSchema);
const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);
const decodePostId = Schema.decodeUnknownOption(PostIdSchema);
const decodeReviewThreadId = Schema.decodeUnknownOption(ReviewThreadIdSchema);
const decodeReviewId = Schema.decodeUnknownOption(ReviewIdSchema);
const decodeConversationId = Schema.decodeUnknownOption(ConversationIdSchema);

const noConversation = () =>
  refuse(
    "The workspace has no such conversation: it may have gone with its channel, or be older than Peal keeps one. list_conversations lists them."
  );

// Without the owner's leave, an application lists conversations only.
const notAllowedToRead = () =>
  refuse(
    "This application may list the workspace's conversations, never read or answer their messages: direct messages are private, and an owner of the workspace lets an application read them, in person, in the inbox's settings in the web app. Nothing was read or sent. Tell the user to read and answer them in the web app."
  );

const cannotMessage = ({ standing }: MessageAbilityUnavailable) =>
  refuse(
    standing === "reconnect"
      ? "This channel may not send direct messages yet: its account was connected before Peal asked for what that takes, or the channel was disconnected or turned off. The user disconnects it and connects the account again, in the web app. Nothing was sent."
      : "Nothing was sent: this server does not send direct messages on this channel's platform, or nobody else wrote in the conversation yet, and Peal never starts one."
  );

const noLocation = () =>
  refuse(
    "The workspace has no such location's reviews: list_location_reviews lists them."
  );

const noReview = () =>
  refuse(
    "The workspace has no such review: it may have gone from Google, or be older than Peal keeps one. get_location_reviews shows a location's."
  );

// Only a member in the web app answers a review, or deletes its reply.
const reviewNeedsPerson = () =>
  refuse(
    "Only the user, signed in to Peal in the web app, answers a review or deletes its reply: Google's policies ask that a reply to a review follow the user's own decision, never an application's. Nothing was sent. Reading the reviews and marking one answered stay open to this connection."
  );

const notDoneOnGoogle = ({ reason }: ReviewActionFailed) =>
  refuse(
    `Google did not do it (${reason}), and nothing changed in Peal: asking again is safe.`
  );

const noThread = () =>
  refuse("The workspace has no such thread: list_comment_threads lists them.");

const noComment = () =>
  refuse(
    "The workspace has no such comment: get_comment_thread shows a thread's."
  );

const noReply = () =>
  refuse(
    "The workspace has no such reply: get_comment_thread shows a thread's."
  );

const gone = () =>
  refuse(
    "The comment is no longer on its platform: it can be neither answered nor moderated."
  );

const unavailable = ({ ability, standing }: AbilityUnavailable) =>
  refuse(
    standing === "reconnect"
      ? `This channel may not ${ability} yet: its account was connected before Peal asked for what that takes, or the channel was disconnected or turned off. The user disconnects it and connects the account again, in the web app. Nothing was asked of the platform.`
      : `This channel's platform does not let the account ${ability} here: nothing was asked of it.`
  );

const failed = ({ reason }: ModerationFailed) =>
  refuse(
    `The platform did not do it (${reason}), and nothing changed in Peal: asking again is safe.`
  );

const conflict = ({ from }: InvalidReplyTransition) =>
  refuse(
    `The reply is ${from}, which does not allow this: only an unconfirmed reply is confirmed, and only a sent one is withdrawn.`
  );

const tooLong = ({ length, maximum, unit }: ReplyTooLong) =>
  refuse(
    `The reply is too long for its platform: ${String(length)} ${unit}, where it takes ${String(maximum)} (on Mastodon, the mention of the person answered counts). Nothing was sent.`
  );

const idOr = <A>(
  found: Option.Option<A>,
  missing: () => ReturnType<typeof refuse>
) => Option.match(found, { onNone: missing, onSome: Effect.succeed });

// A filter that names nothing lists nothing: said, rather than answered
// with every thread.
const filterOf = <A>(
  text: string | undefined,
  decode: (value: string) => Option.Option<A>,
  name: string
) => {
  if (text === undefined) {
    return Effect.succeed(Option.none<A>());
  }

  return Option.match(decode(text), {
    onNone: () => refuse(`${name} is not one this server gave.`),
    onSome: (id) => Effect.succeed(Option.some(id)),
  });
};

/** What the inbox tools do, through the engagement use cases. */
export const InboxToolsLive = InboxTools.toLayer(
  Effect.gen(function* inboxTools() {
    const inbox = yield* EngagementInbox;
    const replies = yield* EngagementReplies;
    const reviews = yield* EngagementReviews;
    const messages = yield* EngagementMessages;
    const refusedByMeter = yield* usageRefusal;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return InboxTools.of({
      get_conversation: ({ conversationId, cursor }) =>
        Effect.gen(function* getConversation() {
          const id = yield* idOr(
            decodeConversationId(conversationId),
            noConversation
          );

          const before = yield* filterOf(cursor, messageCursorOf, "cursor");

          return yield* messages
            .conversation(yield* actor, id, {
              before,
              limit: maxMessagesPerPage,
            })
            .pipe(
              Effect.map(toConversationDetailView),
              Effect.catchTags({
                ConversationNotFound: noConversation,
                DatabaseError: Effect.die,
                MessagesNeedConsent: notAllowedToRead,
                MissingPermission: notAllowed("read direct messages"),
              })
            );
        }),
      list_conversations: ({ channelId, cursor, limit, unread }) =>
        Effect.gen(function* listConversations() {
          const channel = yield* filterOf(
            channelId,
            decodeChannelId,
            "channelId"
          );

          const after = yield* filterOf(cursor, conversationCursorOf, "cursor");

          return yield* messages
            .list(
              yield* actor,
              { channelId: channel, unread: unread ?? false },
              { after, limit: limit ?? defaultInboxPageSize }
            )
            .pipe(
              Effect.map(toConversationPageView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("list direct messages"),
              })
            );
        }),
      send_message: ({ conversationId, idempotencyKey, text }) =>
        Effect.gen(function* sendMessage() {
          const id = yield* idOr(
            decodeConversationId(conversationId),
            noConversation
          );

          const sender = yield* actor;

          return yield* messages
            .send(sender, id, text, Option.fromUndefinedOr(idempotencyKey))
            .pipe(
              Effect.map(toOutgoingMessageView),
              Effect.catchTags({
                AllowanceReached: refusedByMeter(
                  sender.workspaceId,
                  "Nothing was sent."
                ),
                ConversationNotFound: noConversation,
                DatabaseError: Effect.die,
                MessageAbilityUnavailable: cannotMessage,
                MessageMentionsOutside: ({ mentions }) =>
                  refuse(
                    `The message mentions accounts outside the conversation (${mentions.join(", ")}), which a Mastodon direct message would reach too: nothing was sent. Take the mentions out.`
                  ),
                MessagePending: ({ messageId }) =>
                  refuse(
                    `A message to this conversation is on its way, or may have gone out (${messageId}): nothing more was sent. If it is unconfirmed, the user checks the platform and settles it in the web app.`
                  ),
                MessagesNeedConsent: notAllowedToRead,
                MissingPermission: notAllowed("send direct messages"),
                ReplyEmpty: () =>
                  refuse("The message says nothing: nothing was sent."),
                ReplyKeyReused: () =>
                  refuse(
                    "This idempotencyKey was first sent with another conversation or another text: nothing was sent. Call again under a new key."
                  ),
                ReplyTooLong: ({ length, maximum, unit }) =>
                  refuse(
                    `The message is too long for its platform: ${String(length)} ${unit}, where it takes ${String(maximum)} (on Mastodon, the mentions of the participants count). Nothing was sent.`
                  ),
              })
            );
        }),
      delete_location_review_reply: ({ reviewId }) =>
        Effect.gen(function* deleteReply() {
          const id = yield* idOr(decodeReviewId(reviewId), noReview);

          return yield* reviews.withdraw(yield* actor, id).pipe(
            Effect.map(toReviewView),
            Effect.catchTags({
              AbilityUnavailable: unavailable,
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("answer reviews"),
              ReviewActionFailed: notDoneOnGoogle,
              ReviewNotFound: noReview,
              ReviewReplyNeedsPerson: reviewNeedsPerson,
            })
          );
        }),
      get_location_reviews: ({ threadId }) =>
        Effect.gen(function* getReviews() {
          const id = yield* idOr(decodeReviewThreadId(threadId), noLocation);

          return yield* reviews.thread(yield* actor, id).pipe(
            Effect.map(toReviewThreadDetailView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read reviews"),
              ReviewThreadNotFound: noLocation,
            })
          );
        }),
      list_location_reviews: (asked) =>
        Effect.gen(function* listLocations() {
          const channelId = yield* filterOf(
            asked.channelId,
            decodeChannelId,
            "channelId"
          );

          const after = yield* filterOf(asked.cursor, reviewCursorOf, "cursor");

          return yield* reviews
            .threads(
              yield* actor,
              { channelId, unanswered: asked.unanswered ?? false },
              { after, limit: asked.limit ?? defaultInboxPageSize }
            )
            .pipe(
              Effect.map(toReviewThreadPageView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read reviews"),
              })
            );
        }),
      mark_location_review_answered: ({ answered, reviewId }) =>
        Effect.gen(function* markReview() {
          const id = yield* idOr(decodeReviewId(reviewId), noReview);

          return yield* reviews.setAnswered(yield* actor, id, answered).pipe(
            Effect.map(toReviewView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("answer reviews"),
              ReviewNotFound: noReview,
            })
          );
        }),
      reply_to_location_review: ({ reviewId, text }) =>
        Effect.gen(function* replyToReview() {
          const id = yield* idOr(decodeReviewId(reviewId), noReview);

          return yield* reviews.reply(yield* actor, id, text).pipe(
            Effect.map(toReviewReplyView),
            Effect.catchTags({
              AbilityUnavailable: unavailable,
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("answer reviews"),
              ReplyEmpty: () =>
                refuse("The reply says nothing: nothing was sent."),
              ReplyTooLong: ({ length, maximum }) =>
                refuse(
                  `The reply is too long for Google: ${String(length)} bytes, where it takes ${String(maximum)}. Nothing was sent.`
                ),
              ReplyKeyReused: reviewNeedsPerson,
              ReviewNotFound: noReview,
              ReviewReplyNeedsPerson: reviewNeedsPerson,
              ReviewReplyPending: ({ replyId }) =>
                refuse(
                  `A reply to this review is on its way, or its outcome is not known yet (${replyId}): nothing more was sent. The next read of the location settles it.`
                ),
            })
          );
        }),
      confirm_comment_reply: ({ replyId, sent }) =>
        Effect.gen(function* confirm() {
          const id = yield* idOr(decodeReplyId(replyId), noReply);

          return yield* replies.confirm(yield* actor, id, sent).pipe(
            Effect.map(toReplyView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidReplyTransition: conflict,
              MissingPermission: notAllowed("answer comments"),
              ReplyNotFound: noReply,
            })
          );
        }),
      get_comment_thread: ({ threadId }) =>
        Effect.gen(function* getThread() {
          const id = yield* idOr(decodeThreadId(threadId), noThread);

          return yield* inbox.thread(yield* actor, id).pipe(
            Effect.map(toThreadDetailView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read comments"),
              ThreadNotFound: noThread,
            })
          );
        }),
      list_comment_threads: (asked) =>
        Effect.gen(function* listThreads() {
          const channelId = yield* filterOf(
            asked.channelId,
            decodeChannelId,
            "channelId"
          );

          const postId = yield* filterOf(asked.postId, decodePostId, "postId");
          const after = yield* filterOf(asked.cursor, cursorOf, "cursor");

          return yield* inbox
            .threads(
              yield* actor,
              { channelId, postId, unanswered: asked.unanswered ?? false },
              { after, limit: asked.limit ?? defaultInboxPageSize }
            )
            .pipe(
              Effect.map(toThreadPageView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read comments"),
              })
            );
        }),
      mark_comment_answered: ({ answered, commentId }) =>
        Effect.gen(function* markAnswered() {
          const id = yield* idOr(decodeCommentId(commentId), noComment);

          return yield* replies.setAnswered(yield* actor, id, answered).pipe(
            Effect.map((comment) => toCommentView(comment)),
            Effect.catchTags({
              CommentGone: gone,
              CommentNotFound: noComment,
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("answer comments"),
            })
          );
        }),
      moderate_comment: ({ action, commentId }) =>
        Effect.gen(function* moderate() {
          const id = yield* idOr(decodeCommentId(commentId), noComment);

          return yield* replies.moderate(yield* actor, id, action).pipe(
            Effect.map((comment) => toCommentView(comment)),
            Effect.catchTags({
              AbilityUnavailable: unavailable,
              CommentGone: gone,
              CommentNotFound: noComment,
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("moderate comments"),
              ModerationFailed: failed,
            })
          );
        }),
      reply_to_comment: ({ commentId, idempotencyKey, text }) =>
        Effect.gen(function* reply() {
          const id = yield* idOr(decodeCommentId(commentId), noComment);
          const replier = yield* actor;

          return yield* replies
            .reply(replier, id, text, Option.fromUndefinedOr(idempotencyKey))
            .pipe(
              Effect.map(toReplyView),
              Effect.catchTags({
                AbilityUnavailable: unavailable,
                AllowanceReached: refusedByMeter(
                  replier.workspaceId,
                  "Nothing was sent."
                ),
                CommentGone: gone,
                CommentNotFound: noComment,
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("answer comments"),
                ReplyEmpty: () =>
                  refuse("The reply says nothing: nothing was sent."),
                ReplyKeyReused: () =>
                  refuse(
                    "This idempotencyKey was first sent with another comment or another text: nothing was made. Call again under a new key."
                  ),
                ReplyPending: ({ replyId }) =>
                  refuse(
                    `A reply to this comment is on its way, or may have gone out (${replyId}): nothing more was sent. If it is unconfirmed, the user checks the platform, then confirm_comment_reply records what they found.`
                  ),
                ReplyTooLong: tooLong,
              })
            );
        }),
      withdraw_comment_reply: ({ replyId }) =>
        Effect.gen(function* withdraw() {
          const id = yield* idOr(decodeReplyId(replyId), noReply);

          return yield* replies.withdraw(yield* actor, id).pipe(
            Effect.map(toReplyView),
            Effect.catchTags({
              AbilityUnavailable: unavailable,
              DatabaseError: Effect.die,
              InvalidReplyTransition: conflict,
              MissingPermission: notAllowed("answer comments"),
              ModerationFailed: failed,
              ReplyNotFound: noReply,
            })
          );
        }),
    });
  })
);
