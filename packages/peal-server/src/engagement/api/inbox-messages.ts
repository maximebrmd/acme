import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  defaultInboxPageSize,
  maxInboxMessagesPerPage,
  IdempotencyKeyReused,
  InboxActionUnavailable,
  InboxConversationNotFound,
  InboxMessageNotFound,
  MessageMentionsOutside,
  MessagePending,
  ReplyInvalid,
  ReplyStatusConflict,
} from "peal-contract";

import { EngagementMessages } from "#engagement/application/engagement-messages.ts";
import type { MessageAbilityUnavailable } from "#engagement/application/message-ability-unavailable.ts";
import type { MessagePending as PendingMessage } from "#engagement/application/message-pending.ts";
import { MessageSettings } from "#engagement/application/message-settings.ts";
import type { ReplyTooLong } from "#engagement/application/reply-too-long.ts";
import { ConversationIdSchema } from "#engagement/domain/conversation-id.ts";
import type { InvalidOutgoingMessageTransition } from "#engagement/domain/invalid-outgoing-message-transition.ts";
import { OutgoingMessageIdSchema } from "#engagement/domain/outgoing-message-id.ts";
import { actorOf } from "#shared/api/actor.ts";
import { allowanceRefusal } from "#shared/api/allowance-reached.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

import {
  conversationCursorOf,
  messageCursorOf,
  toMessageSettingsView,
  toConversationDetailView,
  toConversationPageView,
  toConversationView,
  toOutgoingMessageView,
} from "./inbox-message-view.ts";

const decodeConversationId = Schema.decodeUnknownOption(ConversationIdSchema);
const decodeMessageId = Schema.decodeUnknownOption(OutgoingMessageIdSchema);
const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

const conversationNotFound = () => Effect.fail(new InboxConversationNotFound());

const messageNotFound = () => Effect.fail(new InboxMessageNotFound());

const badRequest = () => Effect.fail(new HttpApiError.BadRequest());

const unavailable = ({ ability, standing }: MessageAbilityUnavailable) =>
  Effect.fail(new InboxActionUnavailable({ ability, standing }));

const pending = ({ messageId }: PendingMessage) =>
  Effect.fail(new MessagePending({ messageId }));

const conflict = ({ from }: InvalidOutgoingMessageTransition) =>
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

// A filter's id that names nothing is a bad request rather than a list
// of everything.
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
export const InboxMessagesHandlers = HttpApiBuilder.group(
  Api,
  "inboxMessages",
  Effect.fn(function* inboxMessagesHandlers(handlers) {
    const messages = yield* EngagementMessages;
    const settings = yield* MessageSettings;
    const allowance = yield* allowanceRefusal;

    return handlers.handleAll({
      confirmMessage: ({ params, payload }) =>
        Effect.gen(function* confirmMessage() {
          const actor = actorOf(yield* CurrentMember);

          const messageId = yield* idOr(
            decodeMessageId(params.messageId),
            messageNotFound
          );

          return yield* messages.confirm(actor, messageId, payload.sent).pipe(
            Effect.map(toOutgoingMessageView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidOutgoingMessageTransition: conflict,
              MessagesNeedConsent: forbidden,
              MissingPermission: forbidden,
              OutgoingMessageNotFound: messageNotFound,
            })
          );
        }),
      getConversation: ({ params, query }) =>
        Effect.gen(function* getConversation() {
          const actor = actorOf(yield* CurrentMember);

          const conversationId = yield* idOr(
            decodeConversationId(params.conversationId),
            conversationNotFound
          );

          const before = yield* filterOf(query.cursor, messageCursorOf);

          return yield* messages
            .conversation(actor, conversationId, {
              before,
              limit: query.limit ?? maxInboxMessagesPerPage,
            })
            .pipe(
              Effect.map(toConversationDetailView),
              Effect.catchTags({
                ConversationNotFound: conversationNotFound,
                DatabaseError: Effect.die,
                MessagesNeedConsent: forbidden,
                MissingPermission: forbidden,
              })
            );
        }),
      getMessageSettings: () =>
        Effect.gen(function* getMessageSettings() {
          const actor = actorOf(yield* CurrentMember);

          return yield* settings.settings(actor).pipe(
            Effect.map(toMessageSettingsView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MessagesNeedPerson: forbidden,
              MissingPermission: forbidden,
            })
          );
        }),
      setChannelMessages: ({ params, payload }) =>
        Effect.gen(function* setChannelMessages() {
          const actor = actorOf(yield* CurrentMember);
          const channelId = decodeChannelId(params.channelId);

          if (Option.isNone(channelId)) {
            return yield* new InboxActionUnavailable({
              ability: "read",
              standing: "unsupported",
            });
          }

          return yield* settings
            .switchChannel(actor, channelId.value, payload.enabled)
            .pipe(
              Effect.map(toMessageSettingsView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MessageAbilityUnavailable: unavailable,
                MessagesNeedPerson: forbidden,
                MissingPermission: forbidden,
              })
            );
        }),
      setMessageApplication: ({ payload }) =>
        Effect.gen(function* setMessageApplication() {
          const actor = actorOf(yield* CurrentMember);

          return yield* settings
            .allowApplication(actor, payload.clientId, payload.allowed)
            .pipe(
              Effect.map(toMessageSettingsView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MessagesNeedPerson: forbidden,
                MissingPermission: forbidden,
              })
            );
        }),
      listConversations: ({ query }) =>
        Effect.gen(function* listConversations() {
          const actor = actorOf(yield* CurrentMember);
          const channelId = yield* filterOf(query.channelId, decodeChannelId);
          const after = yield* filterOf(query.cursor, conversationCursorOf);

          return yield* messages
            .list(
              actor,
              { channelId, unread: query.unread === "true" },
              { after, limit: query.limit ?? defaultInboxPageSize }
            )
            .pipe(
              Effect.map(toConversationPageView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
              })
            );
        }),
      sendMessage: ({ headers, params, payload }) =>
        Effect.gen(function* sendMessage() {
          const actor = actorOf(yield* CurrentMember);

          const conversationId = yield* idOr(
            decodeConversationId(params.conversationId),
            conversationNotFound
          );

          return yield* messages
            .send(
              actor,
              conversationId,
              payload.text,
              Option.fromUndefinedOr(headers["idempotency-key"])
            )
            .pipe(
              Effect.map(toOutgoingMessageView),
              Effect.catchTags({
                AllowanceReached: allowance,
                ConversationNotFound: conversationNotFound,
                DatabaseError: Effect.die,
                MessageAbilityUnavailable: unavailable,
                MessageMentionsOutside: ({ mentions }) =>
                  Effect.fail(new MessageMentionsOutside({ mentions })),
                MessagePending: pending,
                MessagesNeedConsent: forbidden,
                MissingPermission: forbidden,
                ReplyEmpty: empty,
                ReplyKeyReused: () => Effect.fail(new IdempotencyKeyReused()),
                ReplyTooLong: tooLong,
              })
            );
        }),
      setConversationRead: ({ params, payload }) =>
        Effect.gen(function* setConversationRead() {
          const actor = actorOf(yield* CurrentMember);

          const conversationId = yield* idOr(
            decodeConversationId(params.conversationId),
            conversationNotFound
          );

          return yield* messages
            .markRead(actor, conversationId, payload.read)
            .pipe(
              Effect.flatMap((conversation) =>
                messages
                  .conversation(actor, conversation.id)
                  .pipe(
                    Effect.map((detail) =>
                      toConversationView(conversation, detail.messages.length)
                    )
                  )
              ),
              Effect.catchTags({
                ConversationNotFound: conversationNotFound,
                DatabaseError: Effect.die,
                MessagesNeedConsent: forbidden,
                MissingPermission: forbidden,
              })
            );
        }),
    });
  })
);
