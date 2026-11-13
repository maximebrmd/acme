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
import { InvalidReplyTransition } from "#engagement/domain/invalid-reply-transition.ts";
import { abilityFor } from "#engagement/domain/moderation.ts";
import type { ModerationAction } from "#engagement/domain/moderation.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import type { ReplyId } from "#engagement/domain/reply-id.ts";
import { maxReplyLength, outgoingText } from "#engagement/domain/reply-text.ts";
import {
  answers,
  confirmReply,
  replyKeyLifetime,
  withdrawReply,
  writeReply,
} from "#engagement/domain/reply.ts";
import type { Reply } from "#engagement/domain/reply.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { MeteredUsage, pausedOf } from "#shared/application/metered-usage.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { UserId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { storableText } from "#shared/domain/platform-text.ts";

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
import { ReplyKeyReused } from "./reply-key-reused.ts";
import { messageOf } from "./reply-message.ts";
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
 * and one of the billing account's outbound messages (`MeteredUsage`) in
 * one transaction; the job sends it. A reply that ends as never sent
 * gives its message back. While a reply to a comment is on
 * its way or unconfirmed, no other is written to that comment.
 */
export class EngagementReplies extends Context.Service<
  EngagementReplies,
  {
    readonly reply: (
      actor: Actor,
      commentId: CommentId,
      text: string,
      /**
       * The request's idempotency key, if it came with one: within
       * `replyKeyLifetime` the same key with the same comment and text
       * answers the reply the first request made, however it stands.
       */
      key?: Option.Option<string>
    ) => Effect.Effect<
      Reply,
      | AbilityUnavailable
      | AllowanceReached
      | CommentGone
      | CommentNotFound
      | Refused
      | ReplyEmpty
      | ReplyKeyReused
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
      const inbox = yield* CurrentInboxPlatforms;
      const { transaction } = yield* TransactionRunner;
      const ids = yield* Ids;
      const meters = yield* MeteredUsage;

      // Changes a comment as it stands under its thread's lock, which the
      // collection takes too: neither writes over what the other changed.
      const changedUnderLock = (
        comment: Comment,
        change: (current: Comment) => Comment
      ) =>
        transaction(
          Effect.gen(function* changing() {
            yield* store.lockThread(comment.threadId);

            const current = Option.getOrElse(
              yield* store.comment(comment.id),
              () => comment
            );

            const changed = change(current);

            yield* store.saveComments([changed]);

            return changed;
          })
        );

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
          channel.value.scopes,
          inbox,
          channel.value.connection
        )[ability];

        if (standing !== "available") {
          return yield* new AbilityUnavailable({ ability, standing });
        }

        return channel.value;
      });

      const reply = Effect.fn("EngagementReplies.reply")(function* reply(
        actor: Actor,
        commentId: CommentId,
        typed: string,
        key: Option.Option<string> = Option.none()
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:reply"));

        const comment = yield* commentOf(actor, commentId);
        const channel = yield* able(comment.channelId, "reply");

        // What a member typed is made storable like any text from outside.
        const text = storableText(typed, maxReplyLength + 1);

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

        // A paused meter refuses before anything is journalled; the claim
        // in the journal's transaction holds requests sent together. A
        // request with a key goes to the journal first, which answers the
        // reply the key made, however the meter stands now.
        const paused = Option.isSome(key)
          ? Option.none()
          : (yield* meters.state(actor.workspaceId, "outboundMessages")).pipe(
              Option.flatMap(pausedOf)
            );

        if (Option.isSome(paused)) {
          return yield* paused.value;
        }

        const now = yield* DateTime.now;

        const written = writeReply(
          yield* newId(ReplyIdSchema).pipe(Effect.provideService(Ids, ids)),
          comment,
          writerOf(actor),
          outgoing,
          now
        );

        // The journal row, its outbound message and its job, together.
        // The database holds one reply on its way or unconfirmed a
        // comment, and one reply a key: of two requests sent together, one
        // is journalled and has a job. A message the billing account has
        // no allowance for undoes the journal.
        const journalled = yield* transaction(
          store
            .journalReply(
              written,
              key.pipe(
                Option.map((given) => ({
                  key: given,
                  since: DateTime.subtractDuration(now, replyKeyLifetime),
                }))
              )
            )
            .pipe(
              Effect.tap((made) =>
                made._tag === "journalled"
                  ? meters
                      .claim(actor.workspaceId, "outboundMessages", 1)
                      .pipe(Effect.andThen(jobs.start(written.id)))
                  : Effect.void
              )
            )
        );

        if (journalled._tag === "pending") {
          return yield* new ReplyPending({
            commentId,
            replyId: journalled.replyId,
          });
        }

        if (journalled._tag === "keyReused") {
          return yield* new ReplyKeyReused();
        }

        if (journalled._tag === "dropped") {
          return yield* new CommentNotFound({ commentId });
        }

        return journalled._tag === "replayed" ? journalled.reply : written;
      });

      // Moves a reply as a person decided, unless it changed since it was
      // read: then the decision was about a reply that is no more.
      const decided = Effect.fn("EngagementReplies.decided")(function* decided(
        next: Reply,
        from: Reply
      ) {
        if (yield* store.advanceReply(next, from)) {
          return next;
        }

        const now = yield* store.reply(from.id);

        return yield* Option.match(now, {
          onNone: () => new ReplyNotFound({ replyId: from.id }),
          onSome: (current) =>
            new InvalidReplyTransition({
              from: current.status._tag,
              replyId: from.id,
            }),
        });
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
            yield* store.lockThread(confirmed.threadId);
            yield* decided(confirmed, unconfirmed);
            // What a person found is final: no job of this reply may act
            // after it, whatever state it was left in.
            yield* jobs.cancel(confirmed.id);

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

            // A reply that never went out gives its message back.
            if (!found) {
              yield* meters.giveBack(messageOf(confirmed));
            }

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

          return yield* decided(withdrawn, sent);
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

          return yield* changedUnderLock(comment, (now) =>
            applied(now, action)
          );
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
          const at = yield* DateTime.now;

          return yield* changedUnderLock(comment, (now) =>
            answered ? markAnswered(now, at) : markUnanswered(now)
          );
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
