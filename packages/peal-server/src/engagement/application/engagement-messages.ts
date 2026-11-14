import { Context, DateTime, Effect, Layer, Option } from "effect";

import { markConversationRead } from "#engagement/domain/conversation.ts";
import type { Conversation } from "#engagement/domain/conversation.ts";
import type { DirectMessage } from "#engagement/domain/direct-message.ts";
import type { InvalidOutgoingMessageTransition } from "#engagement/domain/invalid-outgoing-message-transition.ts";
import {
  messageAbilitiesOf,
  readsMessagesOn,
} from "#engagement/domain/message-abilities.ts";
import type {
  MessageAbilities,
  MessageAbility,
} from "#engagement/domain/message-abilities.ts";
import {
  chatOverflow,
  maxOutgoingMessageLength,
  outgoingMessageText,
} from "#engagement/domain/message-text.ts";
import { OutgoingMessageIdSchema } from "#engagement/domain/outgoing-message-id.ts";
import {
  confirmMessage,
  messageKeyLifetime,
  writeMessage,
} from "#engagement/domain/outgoing-message.ts";
import type { OutgoingMessage } from "#engagement/domain/outgoing-message.ts";
import { replyWindowOf } from "#engagement/domain/reply-window.ts";
import type { ReplyWindow } from "#engagement/domain/reply-window.ts";
import { CurrentInboxMessages } from "#shared/application/current-inbox-messages.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { MeteredUsage, pausedOf } from "#shared/application/metered-usage.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId, UserId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { storableText } from "#shared/domain/platform-text.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { ConversationNotFound } from "./conversation-not-found.ts";
import { MessageAbilityUnavailable } from "./message-ability-unavailable.ts";
import { MessagePending } from "./message-pending.ts";
import { claimOf } from "./outgoing-message-claim.ts";
import { OutgoingMessageNotFound } from "./outgoing-message-not-found.ts";
import { EngagementChannels } from "./ports/engagement-channels.ts";
import type { EngagedChannel } from "./ports/engagement-channels.ts";
import { MessageJobs } from "./ports/message-jobs.ts";
import { MessageOutcomes } from "./ports/message-outcomes.ts";
import { MessageStore } from "./ports/message-store.ts";
import type {
  ConversationCursor,
  ConversationFilter,
  ConversationSummary,
} from "./ports/message-store.ts";
import { ReplyLimits } from "./ports/reply-limits.ts";
import { ReplyEmpty } from "./reply-empty.ts";
import { ReplyKeyReused } from "./reply-key-reused.ts";
import { ReplyTooLong } from "./reply-too-long.ts";

type Refused = DatabaseError | MissingPermission;

/** A conversation whole, for a member reading it. */
export interface ConversationDetail {
  readonly abilities: MessageAbilities;
  readonly conversation: Conversation;
  /** Its messages as the platform gave them, oldest first. */
  readonly messages: readonly DirectMessage[];
  /** The channel's platform; none once the channel is gone or off. */
  readonly platform: Option.Option<Platform>;
  /** The messages sent from Peal, oldest first. */
  readonly sent: readonly OutgoingMessage[];
  readonly window: ReplyWindow;
}

/** A page of a workspace's conversations, and where the next starts. */
export interface ConversationPage {
  readonly items: readonly ConversationSummary[];
  readonly next: Option.Option<ConversationCursor>;
}

const unknownChannel: MessageAbilities = {
  read: "unsupported",
  send: "unsupported",
};

// The member who writes: none for an API key, which is nobody.
const writerOf = (actor: Actor): Option.Option<UserId> =>
  actor.subject._tag === "user"
    ? Option.some(actor.subject.userId)
    : Option.none();

/**
 * What members do with their workspace's direct messages: read them
 * (`engagement:read`), and answer a conversation privately as the
 * channel's account, settle a message Peal could not confirm, or say a
 * conversation was read (`engagement:message`). Peal never starts a
 * conversation: it answers those someone else began.
 *
 * A message is checked (its conversation still there, the channel able,
 * the platform's window open, the text within the platform's length) and
 * journalled with the start of its job and one of the billing account's
 * outbound messages (`MeteredUsage`) in one transaction; the job sends
 * it. A message that ends as never sent gives its outbound message back.
 * While a message to a conversation is on its way or unconfirmed, no
 * other is written to it.
 */
export class EngagementMessages extends Context.Service<
  EngagementMessages,
  {
    readonly list: (
      actor: Actor,
      filter: ConversationFilter,
      page: {
        readonly after: Option.Option<ConversationCursor>;
        readonly limit: number;
      }
    ) => Effect.Effect<ConversationPage, Refused>;
    readonly conversation: (
      actor: Actor,
      conversationId: string
    ) => Effect.Effect<ConversationDetail, ConversationNotFound | Refused>;
    readonly send: (
      actor: Actor,
      conversationId: string,
      text: string,
      /**
       * The request's idempotency key, if it came with one: within
       * `messageKeyLifetime` the same key with the same conversation and
       * text answers the message the first request made.
       */
      key?: Option.Option<string>
    ) => Effect.Effect<
      OutgoingMessage,
      | AllowanceReached
      | ConversationNotFound
      | MessageAbilityUnavailable
      | MessagePending
      | Refused
      | ReplyEmpty
      | ReplyKeyReused
      | ReplyTooLong
    >;
    /** Records what a member found on the platform for an unconfirmed message. */
    readonly confirm: (
      actor: Actor,
      messageId: string,
      found: boolean
    ) => Effect.Effect<
      OutgoingMessage,
      InvalidOutgoingMessageTransition | OutgoingMessageNotFound | Refused
    >;
    /** Says a conversation was read, or is unread again. */
    readonly markRead: (
      actor: Actor,
      conversationId: string,
      read: boolean
    ) => Effect.Effect<Conversation, ConversationNotFound | Refused>;
  }
>()("peal-server/engagement/application/EngagementMessages") {
  static readonly layer = Layer.effect(
    EngagementMessages,
    Effect.gen(function* EngagementMessagesLive() {
      const store = yield* MessageStore;
      const channels = yield* EngagementChannels;
      const limits = yield* ReplyLimits;
      const jobs = yield* MessageJobs;
      const outcomes = yield* MessageOutcomes;
      const messages = yield* CurrentInboxMessages;
      const { transaction } = yield* TransactionRunner;
      const ids = yield* Ids;
      const meters = yield* MeteredUsage;

      const summaryOf = Effect.fn("EngagementMessages.summaryOf")(
        function* summaryOf(actor: Actor, conversationId: string) {
          const found = yield* store.conversation(conversationId);

          if (
            Option.isNone(found) ||
            found.value.conversation.workspaceId !== actor.workspaceId
          ) {
            return yield* new ConversationNotFound({ conversationId });
          }

          return found.value;
        }
      );

      // The channel, when it is connected, on and working.
      const channelOf = (channelId: ChannelId) =>
        channels.describe(channelId).pipe(
          Effect.map(Option.some),
          Effect.catchTag("ChannelUnreadable", () =>
            Effect.succeed(Option.none<EngagedChannel>())
          )
        );

      const abilitiesOf = (channel: Option.Option<EngagedChannel>) =>
        Option.match(channel, {
          onNone: () => unknownChannel,
          onSome: ({ platform, scopes }) =>
            messageAbilitiesOf(platform, scopes, messages),
        });

      // The channel, able to do this: a channel gone or off can do nothing.
      const able = Effect.fn("EngagementMessages.able")(function* able(
        channelId: ChannelId,
        ability: MessageAbility
      ) {
        const channel = yield* channelOf(channelId);

        if (Option.isNone(channel)) {
          return yield* new MessageAbilityUnavailable({
            ability,
            standing: "reconnect",
          });
        }

        const standing = abilitiesOf(channel)[ability];

        if (standing !== "available") {
          return yield* new MessageAbilityUnavailable({ ability, standing });
        }

        return channel.value;
      });

      const list = Effect.fn("EngagementMessages.list")(function* list(
        actor: Actor,
        filter: ConversationFilter,
        page: {
          readonly after: Option.Option<ConversationCursor>;
          readonly limit: number;
        }
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:read"));

        const items = yield* store.listConversations(
          actor.workspaceId,
          filter,
          {
            after: page.after,
            limit: page.limit + 1,
          }
        );

        const shown = items.slice(0, page.limit);
        const last = shown.at(-1);

        const result: ConversationPage = {
          items: shown,
          next:
            items.length > page.limit && last !== undefined
              ? Option.some({
                  conversationId: last.conversation.id,
                  lastMessageAt: last.conversation.lastMessageAt,
                })
              : Option.none(),
        };

        return result;
      });

      const conversation = Effect.fn("EngagementMessages.conversation")(
        function* conversation(actor: Actor, conversationId: string) {
          yield* Effect.fromResult(authorize(actor, "engagement:read"));

          const summary = yield* summaryOf(actor, conversationId);
          const channel = yield* channelOf(summary.conversation.channelId);
          const now = yield* DateTime.now;

          const platform = channel.pipe(
            Option.map((found) => found.platform),
            Option.filter((found) => readsMessagesOn(found, messages))
          );

          const detail: ConversationDetail = {
            abilities: abilitiesOf(channel),
            conversation: summary.conversation,
            messages: yield* store.messagesOf(summary.conversation.id),
            platform: channel.pipe(Option.map((found) => found.platform)),
            sent: yield* store.outgoingOf(summary.conversation.id),
            window: Option.match(platform, {
              onNone: () => ({ closesAt: Option.none(), open: false }),
              onSome: (on) =>
                replyWindowOf(on, summary.conversation.lastIncomingAt, now),
            }),
          };

          return detail;
        }
      );

      // Changes a conversation as it stands under its channel's lock,
      // which the collection takes too. One that went meanwhile (its
      // channel, its time) stays gone: none, and nothing is written back.
      const changedUnderLock = (
        found: Conversation,
        change: (current: Conversation) => Conversation
      ) =>
        Effect.gen(function* changing() {
          yield* store.lockBox(found.channelId);

          const current = yield* store.conversation(found.id);

          if (Option.isNone(current)) {
            return Option.none<Conversation>();
          }

          const changed = change(current.value.conversation);

          yield* store.saveConversations([changed]);

          return Option.some(changed);
        });

      const send = Effect.fn("EngagementMessages.send")(function* send(
        actor: Actor,
        conversationId: string,
        typed: string,
        key: Option.Option<string> = Option.none()
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:message"));

        const summary = yield* summaryOf(actor, conversationId);
        const talk = summary.conversation;
        const channel = yield* able(talk.channelId, "send");

        if (!readsMessagesOn(channel.platform, messages)) {
          return yield* new MessageAbilityUnavailable({
            ability: "send",
            standing: "unsupported",
          });
        }

        const now = yield* DateTime.now;

        // A platform whose window closed takes no answer any more.
        if (!replyWindowOf(channel.platform, talk.lastIncomingAt, now).open) {
          return yield* new MessageAbilityUnavailable({
            ability: "send",
            standing: "unsupported",
          });
        }

        // What a member typed is made storable like any text from outside.
        const text = storableText(typed, maxOutgoingMessageLength + 1);

        if (text.trim() === "") {
          return yield* new ReplyEmpty();
        }

        if (text.length > maxOutgoingMessageLength) {
          return yield* new ReplyTooLong({
            length: text.length,
            maximum: maxOutgoingMessageLength,
            unit: "characters",
          });
        }

        const outgoing = outgoingMessageText(
          channel.platform,
          talk.participants,
          text
        );

        const overflow = chatOverflow(channel.platform, outgoing);

        if (Option.isSome(overflow)) {
          return yield* new ReplyTooLong(overflow.value);
        }

        // A Mastodon message is a status, with a status's length.
        if (channel.platform === "mastodon") {
          const statusOverflow = yield* limits.overflow("mastodon", outgoing);

          if (Option.isSome(statusOverflow)) {
            return yield* new ReplyTooLong(statusOverflow.value);
          }
        }

        // A paused meter refuses before anything is journalled; a request
        // with a key goes to the journal first, which answers the message
        // the key made, however the meter stands now.
        const paused = Option.isSome(key)
          ? Option.none()
          : (yield* meters.state(actor.workspaceId, "outboundMessages")).pipe(
              Option.flatMap(pausedOf)
            );

        if (Option.isSome(paused)) {
          return yield* paused.value;
        }

        const written = writeMessage(
          yield* newId(OutgoingMessageIdSchema).pipe(
            Effect.provideService(Ids, ids)
          ),
          talk,
          writerOf(actor),
          outgoing,
          now
        );

        // The journal row, its outbound message, its job and the
        // conversation read, together. The database holds one message on
        // its way or unconfirmed a conversation, and one message a key. A
        // message the billing account has no allowance for undoes it all.
        const journalled = yield* transaction(
          store
            .journalMessage(
              written,
              key.pipe(
                Option.map((given) => ({
                  key: given,
                  since: DateTime.subtractDuration(now, messageKeyLifetime),
                }))
              )
            )
            .pipe(
              Effect.tap((made) =>
                made._tag === "journalled"
                  ? meters
                      .claim(
                        actor.workspaceId,
                        "outboundMessages",
                        1,
                        written.createdAt
                      )
                      .pipe(
                        Effect.andThen(jobs.start(written.id)),
                        Effect.andThen(
                          changedUnderLock(talk, (current) =>
                            markConversationRead(current, true, now)
                          )
                        )
                      )
                  : Effect.void
              )
            )
        );

        if (journalled._tag === "pending") {
          return yield* new MessagePending({
            conversationId: talk.id,
            messageId: journalled.messageId,
          });
        }

        if (journalled._tag === "keyReused") {
          return yield* new ReplyKeyReused();
        }

        if (journalled._tag === "dropped") {
          return yield* new ConversationNotFound({ conversationId });
        }

        return journalled._tag === "replayed" ? journalled.message : written;
      });

      const confirm = Effect.fn("EngagementMessages.confirm")(function* confirm(
        actor: Actor,
        messageId: string,
        found: boolean
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:message"));

        const stored = yield* store.outgoing(messageId);

        if (
          Option.isNone(stored) ||
          stored.value.workspaceId !== actor.workspaceId
        ) {
          return yield* new OutgoingMessageNotFound({ messageId });
        }

        const unconfirmed = stored.value;

        const confirmed = yield* Effect.fromResult(
          confirmMessage(unconfirmed, found, yield* DateTime.now)
        );

        return yield* transaction(
          Effect.gen(function* confirming() {
            if (!(yield* store.advanceMessage(confirmed, unconfirmed))) {
              return yield* new OutgoingMessageNotFound({ messageId });
            }

            // What a person found is final: no job of it may act after.
            yield* jobs.cancel(confirmed.id);

            // A message that never went out gives its outbound message back.
            if (!found) {
              yield* meters.giveBack(claimOf(confirmed));
            }

            const summary = yield* store.conversation(confirmed.conversationId);

            yield* Effect.forEach(
              Option.toArray(summary),
              ({ conversation: talk }) => outcomes.settled(talk, confirmed),
              { discard: true }
            );

            return confirmed;
          })
        );
      });

      const markRead = Effect.fn("EngagementMessages.markRead")(
        function* markRead(
          actor: Actor,
          conversationId: string,
          read: boolean
        ) {
          yield* Effect.fromResult(authorize(actor, "engagement:message"));

          const summary = yield* summaryOf(actor, conversationId);
          const at = yield* DateTime.now;

          const changed = yield* transaction(
            changedUnderLock(summary.conversation, (current) =>
              markConversationRead(current, read, at)
            )
          );

          if (Option.isNone(changed)) {
            return yield* new ConversationNotFound({ conversationId });
          }

          return changed.value;
        }
      );

      return EngagementMessages.of({
        confirm,
        conversation,
        list,
        markRead,
        send,
      });
    })
  );
}
