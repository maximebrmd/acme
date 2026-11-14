import { Effect, Layer } from "effect";

import { MessageOutcomes } from "#engagement/application/ports/message-outcomes.ts";
import type { Conversation } from "#engagement/domain/conversation.ts";
import type { DirectMessage } from "#engagement/domain/direct-message.ts";
import type { OutgoingMessage } from "#engagement/domain/outgoing-message.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";

// Logged without the cause, which may quote what was written.
const logged = (what: string) =>
  Effect.catchDefect(() =>
    Effect.logError(`Telling the workspace of ${what} failed`)
  );

/**
 * Tells the workspace's endpoints, through the webhooks context, in the
 * transaction that records it: one `message.received` per message someone
 * else sent, read for the first time, and one `message.sent` per message
 * that went out from Peal. Events carry ids, never what a message says
 * nor who sent it: messages are private correspondence, and an event
 * stays with its deliveries longer than a conversation is kept. A bug in
 * telling is logged and never undoes what was read or sent; the database
 * failing does.
 */
export const ToldMessageOutcomes = Layer.effect(
  MessageOutcomes,
  Effect.gen(function* ToldMessageOutcomes() {
    const webhooks = yield* WebhookEvents;

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
        ).pipe(logged("new direct messages")),
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
    });
  })
);
