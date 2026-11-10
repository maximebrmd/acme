import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { CommentId } from "#engagement/domain/comment-id.ts";
import {
  forgetComment,
  isOnPlatform,
  markAnswered,
  markUnanswered,
  setHidden,
  setLiked,
} from "#engagement/domain/comment.ts";
import type { Comment } from "#engagement/domain/comment.ts";
import { abilitiesOf } from "#engagement/domain/engagement-abilities.ts";
import type { EngagementAbility } from "#engagement/domain/engagement-abilities.ts";
import type { InvalidReplyTransition } from "#engagement/domain/invalid-reply-transition.ts";
import { abilityFor } from "#engagement/domain/moderation.ts";
import type { ModerationAction } from "#engagement/domain/moderation.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import type { ReplyId } from "#engagement/domain/reply-id.ts";
import { maxReplyLength, outgoingText } from "#engagement/domain/reply-text.ts";
import {
  answers,
  confirmReply,
  withdrawReply,
  writeReply,
} from "#engagement/domain/reply.ts";
import type { Reply } from "#engagement/domain/reply.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { UserId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { AbilityUnavailable } from "./ability-unavailable.ts";
import { CommentGone } from "./comment-gone.ts";
import { CommentNotFound } from "./comment-not-found.ts";
import { ModerationFailed } from "./moderation-failed.ts";
import { EngagementChannels } from "./ports/engagement-channels.ts";
import type { EngagedChannel } from "./ports/engagement-channels.ts";
import { EngagementOutcomes } from "./ports/engagement-outcomes.ts";
import { EngagementStore } from "./ports/engagement-store.ts";
import { ReplyJobs } from "./ports/reply-jobs.ts";
import { ReplyLimits } from "./ports/reply-limits.ts";
import { ReplySender } from "./ports/reply-sender.ts";
import { ReplyEmpty } from "./reply-empty.ts";
import { ReplyNotFound } from "./reply-not-found.ts";
import { ReplyPending } from "./reply-pending.ts";
import { ReplyTooLong } from "./reply-too-long.ts";

type Refused = DatabaseError | MissingPermission;

// The member who writes: none for an API key, which is nobody.
const writerOf = (actor: Actor): Option.Option<UserId> =>
  actor.subject._tag === "user"
    ? Option.some(actor.subject.userId)
    : Option.none();

// The comment once the platform did what was asked.
const applied = (comment: Comment, action: ModerationAction): Comment => {
  if (action === "delete") {
    return forgetComment(comment);
  }

  if (action === "hide" || action === "unhide") {
    return setHidden(comment, action === "hide");
  }

  return setLiked(comment, action === "like");
};

/**
 * What members do about the comments under their workspace's posts, each
 * needing `engagement:reply`: answer one in public as the channel's
 * account, settle or take back a reply, hide, like or delete a comment
 * where the platform lets the account, and say a comment needs no answer.
 *
 * A reply is checked (its comment still there, the channel able, the text
 * within the platform's length) and journalled with the start of its job
 * in one transaction; the job sends it. While a reply to a comment is on
 * its way or unconfirmed, no other is written to that comment.
 */
export class EngagementReplies extends Context.Service<
  EngagementReplies,
  {
    readonly reply: (
      actor: Actor,
      commentId: CommentId,
      text: string
    ) => Effect.Effect<
      Reply,
      | AbilityUnavailable
      | CommentGone
      | CommentNotFound
      | Refused
      | ReplyEmpty
      | ReplyPending
      | ReplyTooLong
    >;
    /** Records what a member found on the platform for an unconfirmed reply. */
    readonly confirm: (
      actor: Actor,
      replyId: ReplyId,
      found: boolean
    ) => Effect.Effect<Reply, InvalidReplyTransition | Refused | ReplyNotFound>;
    /** Deletes a reply Peal sent from its platform. */
    readonly withdraw: (
      actor: Actor,
      replyId: ReplyId
    ) => Effect.Effect<
      Reply,
      | AbilityUnavailable
      | InvalidReplyTransition
      | ModerationFailed
      | Refused
      | ReplyNotFound
    >;
    readonly moderate: (
      actor: Actor,
      commentId: CommentId,
      action: ModerationAction
    ) => Effect.Effect<
      Comment,
      | AbilityUnavailable
      | CommentGone
      | CommentNotFound
      | ModerationFailed
      | Refused
    >;
    /** Says a comment needs no answer, or waits for one again. */
    readonly setAnswered: (
      actor: Actor,
      commentId: CommentId,
      answered: boolean
    ) => Effect.Effect<Comment, CommentGone | CommentNotFound | Refused>;
  }
>()("peal-server/engagement/application/EngagementReplies") {
  static readonly layer = Layer.effect(
    EngagementReplies,
    Effect.gen(function* EngagementRepliesLive() {
      const store = yield* EngagementStore;
      const channels = yield* EngagementChannels;
      const limits = yield* ReplyLimits;
      const jobs = yield* ReplyJobs;
      const sender = yield* ReplySender;
      const outcomes = yield* EngagementOutcomes;
      const { transaction } = yield* TransactionRunner;
      const ids = yield* Ids;

      const commentOf = Effect.fn("EngagementReplies.comment")(
        function* commentOf(actor: Actor, commentId: CommentId) {
          const found = yield* store.comment(commentId);

          if (
            Option.isNone(found) ||
            found.value.workspaceId !== actor.workspaceId
          ) {
            return yield* new CommentNotFound({ commentId });
          }

          if (!isOnPlatform(found.value)) {
            return yield* new CommentGone({ commentId });
          }

          return found.value;
        }
      );

      const replyOf = Effect.fn("EngagementReplies.replyOf")(function* replyOf(
        actor: Actor,
        replyId: ReplyId
      ) {
        const found = yield* store.reply(replyId);

        if (
          Option.isNone(found) ||
          found.value.workspaceId !== actor.workspaceId
        ) {
          return yield* new ReplyNotFound({ replyId });
        }

        return found.value;
      });

      // The channel, able to do this: a channel gone or off can do nothing.
      const able = Effect.fn("EngagementReplies.able")(function* able(
        channelId: Comment["channelId"],
        ability: EngagementAbility
      ) {
        const channel = yield* channels.describe(channelId).pipe(
          Effect.map(Option.some),
          Effect.catchTag("ChannelUnreadable", () =>
            Effect.succeed(Option.none<EngagedChannel>())
          )
        );

        if (Option.isNone(channel)) {
          return yield* new AbilityUnavailable({
            ability,
            standing: "reconnect",
          });
        }

        const standing = abilitiesOf(
          channel.value.platform,
          channel.value.scopes
        )[ability];

        if (standing !== "available") {
          return yield* new AbilityUnavailable({ ability, standing });
        }

        return channel.value;
      });

      const reply = Effect.fn("EngagementReplies.reply")(function* reply(
        actor: Actor,
        commentId: CommentId,
        text: string
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:reply"));

        const comment = yield* commentOf(actor, commentId);
        const channel = yield* able(comment.channelId, "reply");

        if (text.trim() === "") {
          return yield* new ReplyEmpty();
        }

        if (text.length > maxReplyLength) {
          return yield* new ReplyTooLong({
            length: text.length,
            maximum: maxReplyLength,
            unit: "characters",
          });
        }

        const outgoing = outgoingText(channel.platform, comment.author, text);
        const overflow = yield* limits.overflow(channel.platform, outgoing);

        if (Option.isSome(overflow)) {
          return yield* new ReplyTooLong(overflow.value);
        }

        const pending = (yield* store.repliesOf(comment.threadId)).find(
          (other) =>
            other.commentId === comment.id &&
            (other.status._tag === "sending" ||
              other.status._tag === "unconfirmed")
        );

        if (pending !== undefined) {
          return yield* new ReplyPending({ commentId, replyId: pending.id });
        }

        const written = writeReply(
          yield* newId(ReplyIdSchema).pipe(Effect.provideService(Ids, ids)),
          comment,
          writerOf(actor),
          outgoing,
          yield* DateTime.now
        );

        // The journal row and its job, together.
        yield* transaction(
          store.saveReply(written).pipe(Effect.andThen(jobs.start(written.id)))
        );

        return written;
      });

      const confirm = Effect.fn("EngagementReplies.confirm")(function* confirm(
        actor: Actor,
        replyId: ReplyId,
        found: boolean
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:reply"));

        const unconfirmed = yield* replyOf(actor, replyId);
        const now = yield* DateTime.now;

        const confirmed = yield* Effect.fromResult(
          confirmReply(unconfirmed, found, now)
        );

        yield* transaction(
          Effect.gen(function* confirming() {
            yield* store.saveReply(confirmed);

            const comment = yield* store.comment(confirmed.commentId);
            const others = yield* store.repliesOf(confirmed.threadId);

            // A reply that never went out leaves its comment waiting,
            // unless another answers it.
            const answered = others.some(
              (other) =>
                other.commentId === confirmed.commentId &&
                other.id !== confirmed.id &&
                answers(other)
            );

            yield* store.saveComments(
              Option.toArray(comment).map((kept) =>
                found || answered
                  ? markAnswered(kept, now)
                  : markUnanswered(kept)
              )
            );

            const summary = yield* store.thread(confirmed.threadId);

            yield* Effect.forEach(
              Option.toArray(summary),
              ({ thread }) => outcomes.replied(thread, confirmed),
              { discard: true }
            );
          })
        );

        return confirmed;
      });

      const withdraw = Effect.fn("EngagementReplies.withdraw")(
        function* withdraw(actor: Actor, replyId: ReplyId) {
          yield* Effect.fromResult(authorize(actor, "engagement:reply"));

          const sent = yield* replyOf(actor, replyId);

          // Checked before the platform is asked, and applied after.
          yield* Effect.fromResult(withdrawReply(sent, yield* DateTime.now));
          yield* able(sent.channelId, "withdraw");

          const outcome = yield* sender.withdraw({
            channelId: sent.channelId,
            replyId,
          });

          if (outcome._tag === "failed") {
            return yield* new ModerationFailed({ reason: outcome.reason });
          }

          const withdrawn = yield* Effect.fromResult(
            withdrawReply(sent, yield* DateTime.now)
          );

          yield* store.saveReply(withdrawn);

          return withdrawn;
        }
      );

      const moderate = Effect.fn("EngagementReplies.moderate")(
        function* moderate(
          actor: Actor,
          commentId: CommentId,
          action: ModerationAction
        ) {
          yield* Effect.fromResult(authorize(actor, "engagement:reply"));

          const comment = yield* commentOf(actor, commentId);

          yield* able(comment.channelId, abilityFor(action));

          const outcome = yield* sender.moderate({
            action,
            channelId: comment.channelId,
            commentId,
          });

          if (outcome._tag === "failed") {
            return yield* new ModerationFailed({ reason: outcome.reason });
          }

          const moderated = applied(comment, action);

          yield* store.saveComments([moderated]);

          return moderated;
        }
      );

      const setAnswered = Effect.fn("EngagementReplies.setAnswered")(
        function* setAnswered(
          actor: Actor,
          commentId: CommentId,
          answered: boolean
        ) {
          yield* Effect.fromResult(authorize(actor, "engagement:reply"));

          const comment = yield* commentOf(actor, commentId);

          const changed = answered
            ? markAnswered(comment, yield* DateTime.now)
            : markUnanswered(comment);

          yield* store.saveComments([changed]);

          return changed;
        }
      );

      return EngagementReplies.of({
        confirm,
        moderate,
        reply,
        setAnswered,
        withdraw,
      });
    })
  );
}
