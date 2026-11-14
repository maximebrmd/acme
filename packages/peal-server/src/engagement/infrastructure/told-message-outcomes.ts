import { DateTime, Effect, Layer, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { MessageOutcomes } from "#engagement/application/ports/message-outcomes.ts";
import type { Conversation } from "#engagement/domain/conversation.ts";
import type { DirectMessage } from "#engagement/domain/direct-message.ts";
import type { MessageBox } from "#engagement/domain/message-box.ts";
import type { OutgoingMessage } from "#engagement/domain/outgoing-message.ts";
import { Notify } from "#notifications/application/notify.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";

// The UTC day of an instant, as `2026-11-10`.
const dayOf = (at: DateTime.Utc) => DateTime.formatIso(at).slice(0, 10);

// Logged without the cause, which may quote what was written.
const logged = (what: string) =>
  Effect.catchDefect(() =>
    Effect.logError(`Telling the workspace of ${what} failed`)
  );

/**
 * Tells the workspace's endpoints, through the webhooks context, in the
 * transaction that records it: one `message.received` per message someone
 * else sent, read for the first time, and one `message.sent` per message
 * that went out from Peal; and its members who answer messages through the
 * notifications context, once per conversation and UTC day, with the
 * channel's handle and a count: "a new message on <channel>". Events and
 * notices carry ids, never what a message says
 * nor who sent it: messages are private correspondence, and an event
 * stays with its deliveries longer than a conversation is kept. A bug in
 * telling is logged and never undoes what was read or sent; the database
 * failing does.
 */
export const ToldMessageOutcomes = Layer.effect(
  MessageOutcomes,
  Effect.gen(function* ToldMessageOutcomes() {
    const webhooks = yield* WebhookEvents;
    const notices = yield* Notify;
    const channels = yield* ChannelRepository;

    // Members are told once a conversation and day, of the channel only.
    const notice = (
      conversation: Conversation,
      messages: readonly DirectMessage[]
    ) =>
      Effect.gen(function* telling() {
        const [first] = messages;

        const channel = yield* channels.findById(
          conversation.workspaceId,
          conversation.channelId
        );

        if (first === undefined || Option.isNone(channel)) {
          return;
        }

        yield* notices
          .notify({
            event: {
              _tag: "MessagesReceived",
              channel: {
                handle: channel.value.handle,
                platform: channel.value.platform,
              },
              conversationId: conversation.id,
              count: messages.length,
            },
            key: `messages:${conversation.id}:${dayOf(first.receivedAt)}`,
            workspaceId: conversation.workspaceId,
          })
          .pipe(
            // The members could not be listed: the messages are kept,
            // and the app shows them.
            Effect.catchTag("RecipientsUnavailable", () =>
              Effect.logWarning("Could not tell members of new messages")
            )
          );
      });

    // Who may connect channels is told the messages went, and why, once a
    // channel and UTC day.
    const turnedOff = (box: MessageBox) =>
      Effect.gen(function* telling() {
        const channel = yield* channels.findById(
          box.workspaceId,
          box.channelId
        );

        if (Option.isNone(channel)) {
          return;
        }

        yield* notices
          .notify({
            event: {
              _tag: "MessagesTurnedOff",
              channel: {
                handle: channel.value.handle,
                platform: channel.value.platform,
              },
            },
            key: `messages-off:${box.channelId}:${dayOf(yield* DateTime.now)}`,
            workspaceId: box.workspaceId,
          })
          .pipe(
            Effect.catchTag("RecipientsUnavailable", () =>
              Effect.logWarning(
                "Could not tell members a channel's messages were turned off"
              )
            )
          );
      });

    const receivedEvent = (
      conversation: Conversation,
      message: DirectMessage
    ) =>
      webhooks.publish({
        event: {
          data: {
            channelId: conversation.channelId,
            conversationId: conversation.id,
            messageId: message.id,
            receivedAt: message.receivedAt,
            workspaceId: conversation.workspaceId,
          },
          type: "message.received",
        },
        key: `message:${message.id}:received`,
      });

    return MessageOutcomes.of({
      received: (conversation, messages) =>
        Effect.forEach(
          messages,
          (message) => receivedEvent(conversation, message),
          { discard: true }
        ).pipe(
          Effect.andThen(notice(conversation, messages)),
          logged("new direct messages")
        ),
      settled: (conversation, message: OutgoingMessage) =>
        message.status._tag === "sent"
          ? webhooks
              .publish({
                event: {
                  data: {
                    channelId: conversation.channelId,
                    conversationId: conversation.id,
                    messageId: message.id,
                    sentAt: message.status.at,
                    workspaceId: conversation.workspaceId,
                  },
                  type: "message.sent",
                },
                key: `outgoing-message:${message.id}:sent`,
              })
              .pipe(logged("a direct message sent"))
          : Effect.void,
      turnedOff: (box) =>
        turnedOff(box).pipe(logged("direct messages turned off")),
    });
  })
);
