import type { DateTime, Effect, Option } from "effect";
import type { HttpClient, HttpClientError } from "effect/http";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import type {
  CommentsBatch,
  CommentsReadFailure,
  ThreadToRead,
} from "#engagement/application/ports/comment-source.ts";
import type { ActionOutcome } from "#engagement/application/ports/reply-sender.ts";
import type { ModerationAction } from "#engagement/domain/moderation.ts";
import type { ReplyId } from "#engagement/domain/reply-id.ts";
import type { SendOutcome } from "#engagement/domain/reply.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

/** The HTTP client adapters send through: the public one. */
export type PlatformHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

/** A reply about to go out, read from its journal row. */
export interface OutgoingReply {
  /** When it was written: with its id, what every run derives keys from. */
  readonly createdAt: DateTime.Utc;
  /**
   * The comment the answered comment answers, if it answers one: where
   * Instagram puts a reply to a reply.
   */
  readonly grandparentPlatformId: Option.Option<string>;
  /** The comment it answers, on the platform. */
  readonly parentPlatformId: string;
  readonly replyId: ReplyId;
  /** The post the thread is under, on the platform. */
  readonly rootPlatformPostId: string;
  /**
   * The platform's ids of the thread's other replies sent from Peal: a
   * resume never takes one of them for this one.
   */
  readonly takenIds: readonly string[];
  readonly text: string;
}

/** A comment to act on, by its ids on the platform. */
export interface CommentTarget {
  readonly action: ModerationAction;
  readonly platformCommentId: string;
  /** When Peal first read it: what a like's key is derived from. */
  readonly receivedAt: DateTime.Utc;
  readonly rootPlatformPostId: string;
}

/**
 * One platform's comments: reading them under an account's posts, and
 * acting as the account. A platform joins engagement by implementing this,
 * with its entry in `engagedPlatforms` and `abilitiesOf`.
 *
 * `send` makes the one request that puts the reply out, and answers
 * `unconfirmed` whenever that request may have left without an answer.
 * `resume` first asks the platform whether the reply is there, by a key
 * every run derives the same, and sends only when it is not.
 */
export interface EngagementPlatform {
  readonly read: (
    account: ChannelAccount,
    threads: readonly ThreadToRead[]
  ) => Effect.Effect<CommentsBatch, CommentsReadFailure>;
  readonly send: (
    account: ChannelAccount,
    reply: OutgoingReply
  ) => Effect.Effect<SendOutcome>;
  readonly resume: (
    account: ChannelAccount,
    reply: OutgoingReply
  ) => Effect.Effect<SendOutcome>;
  /**
   * Deletes the account's own reply, under the post `rootPlatformPostId`;
   * one already gone is done.
   */
  readonly withdraw: (
    account: ChannelAccount,
    platformCommentId: string,
    rootPlatformPostId: string
  ) => Effect.Effect<ActionOutcome>;
  readonly moderate: (
    account: ChannelAccount,
    target: CommentTarget
  ) => Effect.Effect<ActionOutcome>;
}
