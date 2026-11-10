import { Context, Schema } from "effect";
import type { Effect } from "effect";

import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import { ModerationActionSchema } from "#engagement/domain/moderation.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import { ReplyFailureSchema } from "#engagement/domain/reply.ts";
import type { SendOutcome } from "#engagement/domain/reply.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

/** A reply to send, by id: its text stays in the engagement tables. */
export const SendRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  replyId: ReplyIdSchema,
});

export type SendRequest = typeof SendRequestSchema.Type;

/** Something to do about a comment, by id. */
export const ModerationRequestSchema = Schema.Struct({
  action: ModerationActionSchema,
  channelId: ChannelIdSchema,
  commentId: CommentIdSchema,
});

export type ModerationRequest = typeof ModerationRequestSchema.Type;

/**
 * How an action that sets a state on the platform ended: done (or already
 * so), or not, with why. Not knowing counts as not done: asking again is
 * safe, and the next read of the thread says how things stand.
 */
export const ActionOutcomeSchema = Schema.Union([
  Schema.TaggedStruct("done", {}),
  Schema.TaggedStruct("failed", { reason: ReplyFailureSchema }),
]);

export type ActionOutcome = typeof ActionOutcomeSchema.Type;

/**
 * Acts on a platform as the channel's account, through the channel's gate:
 * one call at a time with its publishing.
 *
 * `send` makes the one request that puts a reply out; `resume` is for a
 * reply an earlier run may already have sent: it looks the reply up and
 * sends only when the platform says it is not there, answering
 * `unconfirmed` when it cannot tell. Neither fails: every ending is a
 * `SendOutcome`.
 */
export class ReplySender extends Context.Service<
  ReplySender,
  {
    readonly send: (request: SendRequest) => Effect.Effect<SendOutcome>;
    readonly resume: (request: SendRequest) => Effect.Effect<SendOutcome>;
    /** Deletes a reply Peal sent from the platform. */
    readonly withdraw: (request: SendRequest) => Effect.Effect<ActionOutcome>;
    readonly moderate: (
      request: ModerationRequest
    ) => Effect.Effect<ActionOutcome>;
  }
>()("peal-server/engagement/application/ReplySender") {}
