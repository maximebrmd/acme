import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  ChannelNotFound,
  CurrentMember,
  defaultInboxPageSize,
  IdempotencyKeyReused,
  InboxActionFailed,
  InboxActionUnavailable,
  InboxCommentGone,
  InboxCommentNotFound,
  InboxReplyNotFound,
  InboxThreadNotFound,
  ReplyInvalid,
  ReplyPending,
  ReplyStatusConflict,
} from "peal-contract";

import type { AbilityUnavailable } from "#engagement/application/ability-unavailable.ts";
import { EngagementInbox } from "#engagement/application/engagement-inbox.ts";
import { EngagementReplies } from "#engagement/application/engagement-replies.ts";
import type { ModerationFailed } from "#engagement/application/moderation-failed.ts";
import type { ReplyPending as Pending } from "#engagement/application/reply-pending.ts";
import type { ReplyTooLong } from "#engagement/application/reply-too-long.ts";
import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import type { InvalidReplyTransition } from "#engagement/domain/invalid-reply-transition.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";
import { actorOf } from "#shared/api/actor.ts";
import { allowanceRefusal } from "#shared/api/allowance-reached.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";

import {
  cursorOf,
  toAbilitiesView,
  toCommentView,
  toReplyView,
  toThreadDetailView,
  toThreadPageView,
} from "./inbox-view.ts";

const decodeThreadId = Schema.decodeUnknownOption(ThreadIdSchema);
const decodeCommentId = Schema.decodeUnknownOption(CommentIdSchema);
const decodeReplyId = Schema.decodeUnknownOption(ReplyIdSchema);
const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);
const decodePostId = Schema.decodeUnknownOption(PostIdSchema);

const channelNotFound = () => Effect.fail(new ChannelNotFound());

const threadNotFound = () => Effect.fail(new InboxThreadNotFound());

const commentNotFound = () => Effect.fail(new InboxCommentNotFound());

const commentGone = () => Effect.fail(new InboxCommentGone());

const replyNotFound = () => Effect.fail(new InboxReplyNotFound());

const badRequest = () => Effect.fail(new HttpApiError.BadRequest());

const unavailable = ({ ability, standing }: AbilityUnavailable) =>
  Effect.fail(new InboxActionUnavailable({ ability, standing }));

const actionFailed = ({ reason }: ModerationFailed) =>
  Effect.fail(new InboxActionFailed({ reason }));

const pending = ({ replyId }: Pending) =>
  Effect.fail(new ReplyPending({ replyId }));

const statusConflict = ({ from }: InvalidReplyTransition) =>
  Effect.fail(new ReplyStatusConflict({ status: from }));

const tooLong = ({ length, maximum, unit }: ReplyTooLong) =>
  Effect.fail(new ReplyInvalid({ length, maximum, reason: "tooLong", unit }));

const empty = () =>
  Effect.fail(
    new ReplyInvalid({
      length: null,
      maximum: null,
      reason: "empty",
      unit: null,
    })
  );

// An id that is not one of Peal's names nothing: as one not found.
const idOr = <A, E>(
  found: Option.Option<A>,
  missing: () => Effect.Effect<never, E>
): Effect.Effect<A, E> =>
  Option.match(found, { onNone: missing, onSome: Effect.succeed });

// A filter's id that names nothing lists nothing; asked for as text, it
// is a bad request rather than a list of everything.
const filterOf = <A>(
  text: string | undefined,
  decode: (value: string) => Option.Option<A>
): Effect.Effect<Option.Option<A>, HttpApiError.BadRequest> => {
  if (text === undefined) {
    return Effect.succeed(Option.none());
  }

  return Option.match(decode(text), {
    onNone: badRequest,
    onSome: (id) => Effect.succeed(Option.some(id)),
  });
};

// A failure of the server's own (the database, a bug) is a defect: 500.
export const InboxHandlers = HttpApiBuilder.group(
  Api,
  "inbox",
  Effect.fn(function* inboxHandlers(handlers) {
    const inbox = yield* EngagementInbox;
    const replies = yield* EngagementReplies;
    const allowanceReached = yield* allowanceRefusal;

    return handlers.handleAll({
      confirmReply: ({ params, payload }) =>
        Effect.gen(function* confirmReply() {
          const actor = actorOf(yield* CurrentMember);

          const replyId = yield* idOr(
            decodeReplyId(params.replyId),
            replyNotFound
          );

          return yield* replies.confirm(actor, replyId, payload.sent).pipe(
            Effect.map(toReplyView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidReplyTransition: statusConflict,
              MissingPermission: forbidden,
              ReplyNotFound: replyNotFound,
            })
          );
        }),
      getAbilities: ({ params }) =>
        Effect.gen(function* getAbilities() {
          const actor = actorOf(yield* CurrentMember);

          const channelId = yield* idOr(
            decodeChannelId(params.channelId),
            channelNotFound
          );

          return yield* inbox.abilities(actor, channelId).pipe(
            Effect.map(toAbilitiesView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      getThread: ({ params }) =>
        Effect.gen(function* getThread() {
          const actor = actorOf(yield* CurrentMember);

          const threadId = yield* idOr(
            decodeThreadId(params.threadId),
            threadNotFound
          );

          return yield* inbox.thread(actor, threadId).pipe(
            Effect.map(toThreadDetailView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              ThreadNotFound: threadNotFound,
            })
          );
        }),
      listThreads: ({ query }) =>
        Effect.gen(function* listThreads() {
          const actor = actorOf(yield* CurrentMember);
          const channelId = yield* filterOf(query.channelId, decodeChannelId);
          const postId = yield* filterOf(query.postId, decodePostId);
          const after = yield* filterOf(query.cursor, cursorOf);

          return yield* inbox
            .threads(
              actor,
              { channelId, postId, unanswered: query.unanswered === "true" },
              { after, limit: query.limit ?? defaultInboxPageSize }
            )
            .pipe(
              Effect.map(toThreadPageView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
              })
            );
        }),
      moderate: ({ params, payload }) =>
        Effect.gen(function* moderate() {
          const actor = actorOf(yield* CurrentMember);

          const commentId = yield* idOr(
            decodeCommentId(params.commentId),
            commentNotFound
          );

          return yield* replies.moderate(actor, commentId, payload.action).pipe(
            Effect.map((comment) => toCommentView(comment)),
            Effect.catchTags({
              AbilityUnavailable: unavailable,
              CommentGone: commentGone,
              CommentNotFound: commentNotFound,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              ModerationFailed: actionFailed,
            })
          );
        }),
      reply: ({ headers, params, payload }) =>
        Effect.gen(function* reply() {
          const actor = actorOf(yield* CurrentMember);

          const commentId = yield* idOr(
            decodeCommentId(params.commentId),
            commentNotFound
          );

          return yield* replies
            .reply(
              actor,
              commentId,
              payload.text,
              Option.fromUndefinedOr(headers["idempotency-key"])
            )
            .pipe(
              Effect.map(toReplyView),
              Effect.catchTags({
                AbilityUnavailable: unavailable,
                AllowanceReached: allowanceReached,
                CommentGone: commentGone,
                CommentNotFound: commentNotFound,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                ReplyEmpty: empty,
                ReplyKeyReused: () => Effect.fail(new IdempotencyKeyReused()),
                ReplyPending: pending,
                ReplyTooLong: tooLong,
              })
            );
        }),
      setAnswered: ({ params, payload }) =>
        Effect.gen(function* setAnswered() {
          const actor = actorOf(yield* CurrentMember);

          const commentId = yield* idOr(
            decodeCommentId(params.commentId),
            commentNotFound
          );

          return yield* replies
            .setAnswered(actor, commentId, payload.answered)
            .pipe(
              Effect.map((comment) => toCommentView(comment)),
              Effect.catchTags({
                CommentGone: commentGone,
                CommentNotFound: commentNotFound,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
              })
            );
        }),
      withdrawReply: ({ params }) =>
        Effect.gen(function* withdrawReply() {
          const actor = actorOf(yield* CurrentMember);

          const replyId = yield* idOr(
            decodeReplyId(params.replyId),
            replyNotFound
          );

          return yield* replies.withdraw(actor, replyId).pipe(
            Effect.map(toReplyView),
            Effect.catchTags({
              AbilityUnavailable: unavailable,
              DatabaseError: Effect.die,
              InvalidReplyTransition: statusConflict,
              MissingPermission: forbidden,
              ModerationFailed: actionFailed,
              ReplyNotFound: replyNotFound,
            })
          );
        }),
    });
  })
);
