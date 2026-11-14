import { Context, Duration, Effect, Layer, Schedule } from "effect";
import { Entity } from "effect/cluster";
import { Rpc } from "effect/rpc";

import {
  AccountReadingSchema,
  AccountRequestSchema,
  MetricsBatchSchema,
  MetricsReader,
  MetricsReadFailureSchema,
  MetricsRequestSchema,
} from "#analytics/application/metrics-reader.ts";
import type {
  MetricsBatch,
  MetricsReadFailure,
} from "#analytics/application/metrics-reader.ts";
import {
  CommentsBatchSchema,
  CommentSource,
  CommentsReadFailureSchema,
  CommentsRequestSchema,
} from "#engagement/application/ports/comment-source.ts";
import type {
  CommentsBatch,
  CommentsReadFailure,
} from "#engagement/application/ports/comment-source.ts";
import {
  ActionOutcomeSchema,
  ModerationRequestSchema,
  ReplySender,
  SendOutcomeSchema,
  SendRequestSchema,
} from "#engagement/application/ports/reply-sender.ts";
import type {
  ActionOutcome,
  SendOutcome,
} from "#engagement/application/ports/reply-sender.ts";
import {
  ReviewActionOutcomeSchema,
  ReviewReplyCheckSchema,
  ReviewReplyRequestSchema,
  ReviewReplySender,
  ReviewSendOutcomeSchema,
  ReviewWithdrawalSchema,
} from "#engagement/application/ports/review-reply-sender.ts";
import type {
  ReviewActionOutcome,
  ReviewReplyCheck,
  ReviewReplyRequest,
  ReviewSendOutcome,
} from "#engagement/application/ports/review-reply-sender.ts";
import {
  ReviewsBatchSchema,
  ReviewSource,
  ReviewsReadFailureSchema,
  ReviewsRequestSchema,
} from "#engagement/application/ports/review-source.ts";
import type {
  ReviewsBatch,
  ReviewsReadFailure,
} from "#engagement/application/ports/review-source.ts";
import {
  FollowUpPublisher,
  FollowUpRequestSchema,
} from "#publishing/application/follow-up-publisher.ts";
import {
  EditOutcomeSchema,
  EditRequestSchema,
  LivePostClients,
  RemovalFailureSchema,
  RemovalOutcomeSchema,
  RemovalRequestSchema,
} from "#publishing/application/live-post-clients.ts";
import type {
  EditOutcome,
  RemovalFailure,
  RemovalOutcome,
} from "#publishing/application/live-post-clients.ts";
import {
  PlatformPublisher,
  PublishRequestSchema,
} from "#publishing/application/platform-publisher.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PublishFailureSchema } from "#shared/domain/publish-failure.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PublishResultSchema } from "#shared/domain/publish-result.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

/**
 * One entity per channel (its id is the channel id), which makes every call
 * to the channel's platform account, one at a time: handlers run in turn, so
 * two posts due at once on one account go out one after the other, and a
 * later token refresh or rate-limit check never races a publish.
 *
 * Calls are volatile: nothing about them is stored in the cluster tables, so
 * post content never lands there. The job calling through the gate is
 * durable, and the publication journal covers a call cut short.
 *
 * A publish runs whole inside its gate: the media uploads, the wait while
 * the platform processes them, the token renewed on demand, the post and its
 * confirmation. `Resume` checks a call an earlier run left in flight.
 * `ReadMetrics` reads the counts of some of the channel's posts for
 * analytics, so reads take turns with publishing and share its rate limits;
 * each is bounded in time.
 * `ReadAccount` reads the account's own numbers the same way, once a day.
 * `ReadComments` reads the comments under some of its posts the same way,
 * and `SendReply`, `ResumeReply`, `WithdrawReply` and `ModerateComment` act
 * on them as the account, for engagement: their payloads are ids, and the
 * text of a reply stays in engagement's tables. `ReadReviews` reads a
 * location's reviews, and `SendReviewReply`, `ResumeReviewReply` and
 * `WithdrawReviewReply` answer them, the same way. `RemoveLivePost` deletes a
 * post, or a part of one, that a member asked to unpublish, by the
 * platform's id for it: a removal never overlaps a publish on the channel.
 * `EditLivePost` replaces the text of a part a member asked to edit, by
 * the change's id and the platform's: the text never passes through the
 * gate, whose side reads it from the change.
 *
 * Calls run in the order they came, whichever context sent them. Each
 * collection (post counts, the account, comments, reviews) has one call a channel
 * outstanding at most, so a publish waits for the reads that came before
 * it: one of each at most, each bounded, never for those after. Their
 * crons start on minutes of their own (`test/app/cron-schedules.test.ts`).
 */
export const ChannelGate = Entity.make("ChannelGate", [
  Rpc.make("Publish", {
    error: PublishFailureSchema,
    payload: { request: PublishRequestSchema },
    success: PublishResultSchema,
  }),
  Rpc.make("Resume", {
    error: PublishFailureSchema,
    payload: { request: PublishRequestSchema },
    success: PublishResultSchema,
  }),
  Rpc.make("ReadMetrics", {
    error: MetricsReadFailureSchema,
    payload: { request: MetricsRequestSchema },
    success: MetricsBatchSchema,
  }),
  Rpc.make("ReadAccount", {
    error: MetricsReadFailureSchema,
    payload: { request: AccountRequestSchema },
    success: AccountReadingSchema,
  }),
  Rpc.make("ReadComments", {
    error: CommentsReadFailureSchema,
    payload: { request: CommentsRequestSchema },
    success: CommentsBatchSchema,
  }),
  Rpc.make("SendReply", {
    payload: { request: SendRequestSchema },
    success: SendOutcomeSchema,
  }),
  Rpc.make("ResumeReply", {
    payload: { request: SendRequestSchema },
    success: SendOutcomeSchema,
  }),
  Rpc.make("WithdrawReply", {
    payload: { request: SendRequestSchema },
    success: ActionOutcomeSchema,
  }),
  Rpc.make("ModerateComment", {
    payload: { request: ModerationRequestSchema },
    success: ActionOutcomeSchema,
  }),
  Rpc.make("ReadReviews", {
    error: ReviewsReadFailureSchema,
    payload: { request: ReviewsRequestSchema },
    success: ReviewsBatchSchema,
  }),
  Rpc.make("SendReviewReply", {
    payload: { request: ReviewReplyRequestSchema },
    success: ReviewSendOutcomeSchema,
  }),
  Rpc.make("ResumeReviewReply", {
    payload: { request: ReviewReplyRequestSchema },
    success: ReviewSendOutcomeSchema,
  }),
  Rpc.make("CheckReviewReply", {
    payload: { request: ReviewReplyRequestSchema },
    success: ReviewReplyCheckSchema,
  }),
  Rpc.make("WithdrawReviewReply", {
    payload: { request: ReviewWithdrawalSchema },
    success: ReviewActionOutcomeSchema,
  }),
  Rpc.make("RemoveLivePost", {
    error: RemovalFailureSchema,
    payload: { request: RemovalRequestSchema },
    success: RemovalOutcomeSchema,
  }),
  Rpc.make("EditLivePost", {
    error: RemovalFailureSchema,
    payload: { request: EditRequestSchema },
    success: EditOutcomeSchema,
  }),
  Rpc.make("SendFollowUp", {
    error: PublishFailureSchema,
    payload: { request: FollowUpRequestSchema },
    success: PublishResultSchema,
  }),
  Rpc.make("ResumeFollowUp", {
    error: PublishFailureSchema,
    payload: { request: FollowUpRequestSchema },
    success: PublishResultSchema,
  }),
]);

/**
 * Runs the gate with the platform adapters it is given: the publishers, and
 * analytics' readers. A bug in an adapter fails its own call instead of
 * restarting the entity, which would replay the call in flight.
 */
export const ChannelGateLive = ChannelGate.toLayer(
  Effect.gen(function* ChannelGateLive() {
    const platforms = yield* PlatformPublisher;
    const metrics = yield* MetricsReader;
    const comments = yield* CommentSource;
    const replies = yield* ReplySender;
    const reviews = yield* ReviewSource;
    const reviewReplies = yield* ReviewReplySender;
    const live = yield* LivePostClients;
    const followUps = yield* FollowUpPublisher;

    return ChannelGate.of({
      EditLivePost: ({ payload }) => live.edit(payload.request),
      ModerateComment: ({ payload }) => replies.moderate(payload.request),
      Publish: ({ payload }) => platforms.publish(payload.request),
      ReadAccount: ({ payload }) => metrics.account(payload.request),
      ReadComments: ({ payload }) => comments.read(payload.request),
      ReadMetrics: ({ payload }) => metrics.read(payload.request),
      CheckReviewReply: ({ payload }) => reviewReplies.check(payload.request),
      ReadReviews: ({ payload }) => reviews.read(payload.request),
      RemoveLivePost: ({ payload }) => live.remove(payload.request),
      Resume: ({ payload }) => platforms.resume(payload.request),
      ResumeFollowUp: ({ payload }) => followUps.resume(payload.request),
      ResumeReply: ({ payload }) => replies.resume(payload.request),
      ResumeReviewReply: ({ payload }) => reviewReplies.resume(payload.request),
      SendFollowUp: ({ payload }) => followUps.send(payload.request),
      SendReply: ({ payload }) => replies.send(payload.request),
      SendReviewReply: ({ payload }) => reviewReplies.send(payload.request),
      WithdrawReply: ({ payload }) => replies.withdraw(payload.request),
      WithdrawReviewReply: ({ payload }) =>
        reviewReplies.withdraw(payload.request),
    });
  }),
  { disableFatalDefects: true, maxIdleTime: Duration.minutes(10) }
);

/**
 * For gates that publish only, as in tests of publishing: every read
 * answers that the platform is unavailable, and reads nothing.
 */
export const UnreadMetrics = Layer.succeed(
  MetricsReader,
  MetricsReader.of({
    account: () => Effect.fail(new PlatformUnavailable()),
    read: () => Effect.fail(new PlatformUnavailable()),
  })
);

/** For gates that read no review and answer none: as UnreadComments. */
export const UnreadReviews = Layer.mergeAll(
  Layer.succeed(
    ReviewSource,
    ReviewSource.of({ read: () => Effect.fail(new PlatformUnavailable()) })
  ),
  Layer.succeed(
    ReviewReplySender,
    ReviewReplySender.of({
      check: () => Effect.succeed({ _tag: "unknown" }),
      resume: () =>
        Effect.succeed({ _tag: "unconfirmed", reason: "interrupted" }),
      send: () =>
        Effect.succeed({ _tag: "failed", reason: "platformUnavailable" }),
      withdraw: () =>
        Effect.succeed({ _tag: "failed", reason: "platformUnavailable" }),
    })
  )
);

/**
 * For gates that neither read comments and reviews nor answer them, as in
 * tests of publishing: every read answers that the platform is
 * unavailable, and nothing is sent.
 */
export const UnreadComments = Layer.mergeAll(
  UnreadReviews,
  Layer.succeed(
    CommentSource,
    CommentSource.of({ read: () => Effect.fail(new PlatformUnavailable()) })
  ),
  Layer.succeed(
    ReplySender,
    ReplySender.of({
      moderate: () =>
        Effect.succeed({ _tag: "failed", reason: "platformUnavailable" }),
      resume: () =>
        Effect.succeed({ _tag: "unconfirmed", reason: "interrupted" }),
      send: () =>
        Effect.succeed({ _tag: "failed", reason: "platformUnavailable" }),
      withdraw: () =>
        Effect.succeed({ _tag: "failed", reason: "platformUnavailable" }),
    })
  )
);

// The gate did not take the call, so it was not sent: worth a few quick
// retries before the platform counts as unavailable.
const notTakenRetry = Schedule.exponential("100 millis", 2);

const notSent = () => Effect.fail(new PlatformUnavailable());

// A resume the gate did not take checked nothing: the earlier run may still
// have posted, so it is not a refusal.
const notChecked = () =>
  Effect.succeed<PublishResult>({
    _tag: "unconfirmed",
    reason: "interrupted",
  });

const unknownOutcome = (cause: unknown) =>
  Effect.logError("A platform call failed in its adapter", cause).pipe(
    Effect.as<PublishResult>({ _tag: "unconfirmed", reason: "adapterFailure" })
  );

/**
 * The PlatformPublisher the publishing jobs use: each call goes through its
 * channel's gate. Provide ChannelGateLive, with the real adapters, beside it.
 */
export const GatedPlatformPublisher = Layer.effect(
  PlatformPublisher,
  Effect.gen(function* GatedPlatformPublisher() {
    const gateFor = yield* ChannelGate.client;

    // Publish and Resume answer alike.
    type GateCall = ReturnType<ReturnType<typeof gateFor>["Publish"]>;

    const gated = (
      call: GateCall,
      notTaken: () => Effect.Effect<PublishResult, PublishFailure>
    ) =>
      call.pipe(
        Effect.retry({
          schedule: notTakenRetry,
          times: 4,
          while: (error) =>
            error._tag === "MailboxFull" ||
            error._tag === "EntityNotAssignedToRunner",
        }),
        Effect.catchTags({
          // A request with this id is being handled: it may have gone out.
          AlreadyProcessingMessage: () =>
            Effect.succeed<PublishResult>({
              _tag: "unconfirmed",
              reason: "noResponse",
            }),
          EntityNotAssignedToRunner: notTaken,
          MailboxFull: notTaken,
          PersistenceError: notTaken,
        }),
        // The adapter broke during the call, after the request may have
        // left: never a reason to send it again.
        Effect.catchDefect(unknownOutcome)
      );

    return PlatformPublisher.of({
      publish: (request) =>
        gated(gateFor(request.channelId).Publish({ request }), notSent),
      resume: (request) =>
        gated(gateFor(request.channelId).Resume({ request }), notChecked),
    });
  })
);

/**
 * The FollowUpPublisher the follow-ups' jobs use: each call goes through
 * its channel's gate, in turn with the channel's publishing, answering as
 * the publishing calls do (`GatedPlatformPublisher`): a call the gate did
 * not take was not sent, one it lost may have gone out. Provide
 * ChannelGateLive, with the real publisher, beside it.
 */
export const GatedFollowUpPublisher = Layer.effect(
  FollowUpPublisher,
  Effect.gen(function* GatedFollowUpPublisher() {
    const gateFor = yield* ChannelGate.client;

    type GateCall = ReturnType<ReturnType<typeof gateFor>["SendFollowUp"]>;

    const gated = (
      call: GateCall,
      notTaken: () => Effect.Effect<PublishResult, PublishFailure>
    ) =>
      call.pipe(
        Effect.retry({
          schedule: notTakenRetry,
          times: 4,
          while: (error) =>
            error._tag === "MailboxFull" ||
            error._tag === "EntityNotAssignedToRunner",
        }),
        Effect.catchTags({
          AlreadyProcessingMessage: () =>
            Effect.succeed<PublishResult>({
              _tag: "unconfirmed",
              reason: "noResponse",
            }),
          EntityNotAssignedToRunner: notTaken,
          MailboxFull: notTaken,
          PersistenceError: notTaken,
        }),
        Effect.catchDefect(unknownOutcome)
      );

    return FollowUpPublisher.of({
      resume: (request) =>
        gated(
          gateFor(request.channelId).ResumeFollowUp({ request }),
          notChecked
        ),
      send: (request) =>
        gated(gateFor(request.channelId).SendFollowUp({ request }), notSent),
    });
  })
);

// The gate did not take the read, or a bug broke it: it read nothing, and
// the next collection tries again.
const unread = (): Effect.Effect<never, MetricsReadFailure> =>
  Effect.fail(new PlatformUnavailable());

/**
 * The MetricsReader analytics collects with: each read goes through its
 * channel's gate, after the calls already waiting there. Provide
 * ChannelGateLive, with the real readers, beside it.
 */
export const GatedMetricsReader = Layer.effect(
  MetricsReader,
  Effect.gen(function* GatedMetricsReader() {
    const gateFor = yield* ChannelGate.client;

    // ReadMetrics and ReadAccount are taken, or not, alike.
    const gated = <A>(
      call: Effect.Effect<
        A,
        | MetricsReadFailure
        | Effect.Error<ReturnType<ReturnType<typeof gateFor>["ReadMetrics"]>>
      >
    ): Effect.Effect<A, MetricsReadFailure> =>
      call.pipe(
        Effect.retry({
          schedule: notTakenRetry,
          times: 4,
          while: (error) =>
            error._tag === "MailboxFull" ||
            error._tag === "EntityNotAssignedToRunner",
        }),
        Effect.catchTags({
          AlreadyProcessingMessage: unread,
          EntityNotAssignedToRunner: unread,
          MailboxFull: unread,
          PersistenceError: unread,
        }),
        Effect.catchDefect((cause) =>
          Effect.logError("A metrics read failed in its adapter", cause).pipe(
            Effect.andThen(unread())
          )
        )
      );

    return MetricsReader.of({
      account: (request) =>
        gated(gateFor(request.channelId).ReadAccount({ request })),
      read: (request): Effect.Effect<MetricsBatch, MetricsReadFailure> =>
        gated(gateFor(request.channelId).ReadMetrics({ request })),
    });
  })
);

// The gate did not take the read, or a bug broke it: it read nothing, and
// the next collection tries again.
const noComments = (): Effect.Effect<never, CommentsReadFailure> =>
  Effect.fail(new PlatformUnavailable());

/**
 * The CommentSource engagement collects with: each read goes through its
 * channel's gate, after the calls already waiting there. Provide
 * ChannelGateLive, with the real readers, beside it.
 */
export const GatedCommentSource = Layer.effect(
  CommentSource,
  Effect.gen(function* GatedCommentSource() {
    const gateFor = yield* ChannelGate.client;

    return CommentSource.of({
      read: (request): Effect.Effect<CommentsBatch, CommentsReadFailure> =>
        gateFor(request.channelId)
          .ReadComments({ request })
          .pipe(
            Effect.retry({
              schedule: notTakenRetry,
              times: 4,
              while: (error) =>
                error._tag === "MailboxFull" ||
                error._tag === "EntityNotAssignedToRunner",
            }),
            Effect.catchTags({
              AlreadyProcessingMessage: noComments,
              EntityNotAssignedToRunner: noComments,
              MailboxFull: noComments,
              PersistenceError: noComments,
            }),
            Effect.catchDefect((cause) =>
              Effect.logError(
                "A comments read failed in its adapter",
                cause
              ).pipe(Effect.andThen(noComments()))
            )
          ),
    });
  })
);

// The gate did not take the reply, so it was not sent.
const replyNotSent = () =>
  Effect.succeed<SendOutcome>({
    _tag: "failed",
    reason: "platformUnavailable",
  });

// A call that may have reached the platform before the gate lost it.
const replyUnknown = (
  reason: "adapterFailure" | "interrupted" | "noResponse"
) => Effect.succeed<SendOutcome>({ _tag: "unconfirmed", reason });

// An action the gate did not take, or lost: asking again is safe.
const notDone = () =>
  Effect.succeed<ActionOutcome>({
    _tag: "failed",
    reason: "platformUnavailable",
  });

/**
 * The ReplySender engagement acts with: each call goes through its
 * channel's gate, in turn with the channel's publishing. A reply the gate
 * did not take was not sent; one it lost during the call, or whose adapter
 * broke, may have gone out, and is never sent again for that. Provide
 * ChannelGateLive, with the real senders, beside it.
 */
export const GatedReplySender = Layer.effect(
  ReplySender,
  Effect.gen(function* GatedReplySender() {
    const gateFor = yield* ChannelGate.client;

    type SendCall = ReturnType<ReturnType<typeof gateFor>["SendReply"]>;

    type ActionCall = ReturnType<ReturnType<typeof gateFor>["WithdrawReply"]>;

    const sending = (
      call: SendCall,
      notTaken: () => Effect.Effect<SendOutcome>
    ) =>
      call.pipe(
        Effect.retry({
          schedule: notTakenRetry,
          times: 4,
          while: (error) =>
            error._tag === "MailboxFull" ||
            error._tag === "EntityNotAssignedToRunner",
        }),
        Effect.catchTags({
          AlreadyProcessingMessage: () => replyUnknown("noResponse"),
          EntityNotAssignedToRunner: notTaken,
          MailboxFull: notTaken,
          PersistenceError: notTaken,
        }),
        Effect.catchDefect((cause) =>
          Effect.logError("A reply failed in its adapter", cause).pipe(
            Effect.andThen(replyUnknown("adapterFailure"))
          )
        )
      );

    const acting = (call: ActionCall) =>
      call.pipe(
        Effect.catchTags({
          AlreadyProcessingMessage: notDone,
          EntityNotAssignedToRunner: notDone,
          MailboxFull: notDone,
          PersistenceError: notDone,
        }),
        Effect.catchDefect((cause) =>
          Effect.logError("A comment action failed in its adapter", cause).pipe(
            Effect.andThen(notDone())
          )
        )
      );

    return ReplySender.of({
      moderate: (request) =>
        acting(gateFor(request.channelId).ModerateComment({ request })),
      resume: (request) =>
        sending(gateFor(request.channelId).ResumeReply({ request }), () =>
          replyUnknown("interrupted")
        ),
      send: (request) =>
        sending(
          gateFor(request.channelId).SendReply({ request }),
          replyNotSent
        ),
      withdraw: (request) =>
        acting(gateFor(request.channelId).WithdrawReply({ request })),
    });
  })
);

// The gate did not take the removal, lost it, or a bug broke it: the post
// may still be there, and deleting it again is safe.
const notRemoved = (): Effect.Effect<RemovalOutcome, RemovalFailure> =>
  Effect.fail(new PlatformUnavailable());

// The same of an edit: the post may still say what it did, and editing
// it again with the same text is safe.
const notEdited = (): Effect.Effect<EditOutcome, RemovalFailure> =>
  Effect.fail(new PlatformUnavailable());

/**
 * The LivePostClients the jobs that unpublish and edit posts use: each
 * call goes through its channel's gate, in turn with the channel's
 * publishing. Provide ChannelGateLive, with the real clients, beside it.
 */
export const GatedLivePostClients = Layer.effect(
  LivePostClients,
  Effect.gen(function* GatedLivePostClients() {
    const gateFor = yield* ChannelGate.client;

    return LivePostClients.of({
      edit: (request) =>
        gateFor(request.channelId)
          .EditLivePost({ request })
          .pipe(
            Effect.retry({
              schedule: notTakenRetry,
              times: 4,
              while: (error) =>
                error._tag === "MailboxFull" ||
                error._tag === "EntityNotAssignedToRunner",
            }),
            Effect.catchTags({
              AlreadyProcessingMessage: notEdited,
              EntityNotAssignedToRunner: notEdited,
              MailboxFull: notEdited,
              PersistenceError: notEdited,
            }),
            Effect.catchDefect((cause) =>
              Effect.logError("An edit failed in its adapter", cause).pipe(
                Effect.andThen(notEdited())
              )
            )
          ),
      remove: (request) =>
        gateFor(request.channelId)
          .RemoveLivePost({ request })
          .pipe(
            Effect.retry({
              schedule: notTakenRetry,
              times: 4,
              while: (error) =>
                error._tag === "MailboxFull" ||
                error._tag === "EntityNotAssignedToRunner",
            }),
            Effect.catchTags({
              AlreadyProcessingMessage: notRemoved,
              EntityNotAssignedToRunner: notRemoved,
              MailboxFull: notRemoved,
              PersistenceError: notRemoved,
            }),
            Effect.catchDefect((cause) =>
              Effect.logError("A removal failed in its adapter", cause).pipe(
                Effect.andThen(notRemoved())
              )
            )
          ),
    });
  })
);

// The gate did not take the read, or a bug broke it: it read nothing, and
// the next collection tries again.
const noReviews = (): Effect.Effect<never, ReviewsReadFailure> =>
  Effect.fail(new PlatformUnavailable());

// A read back the gate did not take, or lost: nothing is settled from it.
const unknownCheck: ReviewReplyCheck = { _tag: "unknown" };

const notSentReply = () =>
  Effect.succeed<ReviewSendOutcome>({
    _tag: "failed",
    reason: "platformUnavailable",
  });

const unchecked = () =>
  Effect.succeed<ReviewSendOutcome>({
    _tag: "unconfirmed",
    reason: "interrupted",
  });

const notWithdrawn = () =>
  Effect.succeed<ReviewActionOutcome>({
    _tag: "failed",
    reason: "platformUnavailable",
  });

/**
 * The ReviewSource and ReviewReplySender engagement reads and answers
 * reviews with: each call goes through its channel's gate, in turn with
 * the channel's publishing. A reply the gate did not take was not sent;
 * one it lost during the call, or whose adapter broke, may have gone out,
 * and the next read of its location says. Provide ChannelGateLive, with
 * the real adapters, beside it.
 */
export const GatedReviews = Layer.effectContext(
  Effect.gen(function* GatedReviews() {
    const gateFor = yield* ChannelGate.client;

    const taken = {
      schedule: notTakenRetry,
      times: 4,
      while: (error: { readonly _tag: string }) =>
        error._tag === "MailboxFull" ||
        error._tag === "EntityNotAssignedToRunner",
    };

    const read = (request: typeof ReviewsRequestSchema.Type) =>
      gateFor(request.channelId)
        .ReadReviews({ request })
        .pipe(
          Effect.retry(taken),
          Effect.catchTags({
            AlreadyProcessingMessage: noReviews,
            EntityNotAssignedToRunner: noReviews,
            MailboxFull: noReviews,
            PersistenceError: noReviews,
          }),
          Effect.catchDefect((cause) =>
            Effect.logError("A reviews read failed in its adapter", cause).pipe(
              Effect.andThen(noReviews())
            )
          )
        ) satisfies Effect.Effect<ReviewsBatch, ReviewsReadFailure>;

    const sending = (
      call: Effect.Effect<
        ReviewSendOutcome,
        Effect.Error<ReturnType<ReturnType<typeof gateFor>["SendReviewReply"]>>
      >,
      notTaken: () => Effect.Effect<ReviewSendOutcome>
    ): Effect.Effect<ReviewSendOutcome> =>
      call.pipe(
        Effect.retry(taken),
        Effect.catchTags({
          AlreadyProcessingMessage: () =>
            Effect.succeed<ReviewSendOutcome>({
              _tag: "unconfirmed",
              reason: "noResponse",
            }),
          EntityNotAssignedToRunner: notTaken,
          MailboxFull: notTaken,
          PersistenceError: notTaken,
        }),
        Effect.catchDefect((cause) =>
          Effect.logError(
            "A reply to a review failed in its adapter",
            cause
          ).pipe(
            Effect.as<ReviewSendOutcome>({
              _tag: "unconfirmed",
              reason: "adapterFailure",
            })
          )
        )
      );

    return Context.make(ReviewSource, ReviewSource.of({ read })).pipe(
      Context.add(
        ReviewReplySender,
        ReviewReplySender.of({
          check: (request: ReviewReplyRequest) =>
            gateFor(request.channelId)
              .CheckReviewReply({ request })
              .pipe(
                Effect.retry(taken),
                Effect.orElseSucceed(() => unknownCheck),
                Effect.catchDefect(() => Effect.succeed(unknownCheck))
              ),
          resume: (request: ReviewReplyRequest) =>
            sending(
              gateFor(request.channelId).ResumeReviewReply({ request }),
              unchecked
            ),
          send: (request: ReviewReplyRequest) =>
            sending(
              gateFor(request.channelId).SendReviewReply({ request }),
              notSentReply
            ),
          withdraw: (request) =>
            gateFor(request.channelId)
              .WithdrawReviewReply({ request })
              .pipe(
                Effect.retry(taken),
                Effect.catchTags({
                  AlreadyProcessingMessage: notWithdrawn,
                  EntityNotAssignedToRunner: notWithdrawn,
                  MailboxFull: notWithdrawn,
                  PersistenceError: notWithdrawn,
                }),
                Effect.catchDefect(notWithdrawn)
              ),
        })
      )
    );
  })
);
