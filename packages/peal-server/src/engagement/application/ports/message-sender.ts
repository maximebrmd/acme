import { Context, Schema } from "effect";
import type { Effect } from "effect";

import { OutgoingMessageIdSchema } from "#engagement/domain/outgoing-message-id.ts";
import type { MessageSendOutcome } from "#engagement/domain/outgoing-message.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

export { MessageSendOutcomeSchema } from "#engagement/domain/outgoing-message.ts";

export type { MessageSendOutcome } from "#engagement/domain/outgoing-message.ts";

/** A message to send, by id: its text stays in the engagement tables. */
export const MessageSendRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  messageId: OutgoingMessageIdSchema,
});

export type MessageSendRequest = typeof MessageSendRequestSchema.Type;

/**
 * Sends a message as the channel's account, through the channel's gate:
 * one call at a time with its publishing.
 *
 * `send` makes the one request that puts the message out; `resume` is for
 * a message an earlier run may already have sent: it looks the message up
 * and sends only when the platform proves it is not there, answering
 * `unconfirmed` when it cannot tell. Neither fails: every ending is a
 * `MessageSendOutcome`.
 */
export class MessageSender extends Context.Service<
  MessageSender,
  {
    readonly send: (
      request: MessageSendRequest
    ) => Effect.Effect<MessageSendOutcome>;
    readonly resume: (
      request: MessageSendRequest
    ) => Effect.Effect<MessageSendOutcome>;
  }
>()("peal-server/engagement/application/MessageSender") {}
