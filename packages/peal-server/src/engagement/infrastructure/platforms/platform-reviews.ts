import { DateTime, Effect, Layer, Option } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { ReviewReplySender } from "#engagement/application/ports/review-reply-sender.ts";
import type {
  ReviewActionOutcome,
  ReviewReplyCheck,
  ReviewReplyRequest,
  ReviewWithdrawal,
} from "#engagement/application/ports/review-reply-sender.ts";
import { ReviewSource } from "#engagement/application/ports/review-source.ts";
import type { ReviewsRequest } from "#engagement/application/ports/review-source.ts";
import { ReviewStore } from "#engagement/application/ports/review-store.ts";
import { readsReviewsOn } from "#engagement/domain/review-abilities.ts";
import type {
  ReviewReplyFailure,
  ReviewSendOutcome,
} from "#engagement/domain/review-reply.ts";
import {
  databaseDown,
  needsReconnect,
  unusable,
} from "#engagement/infrastructure/platforms/channel-refusals.ts";
import type { PlatformHttp } from "#engagement/infrastructure/platforms/engagement-platform.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { googleBusinessReviews } from "./google-business/google-business-reviews.ts";

const failedWith = (reason: ReviewReplyFailure): ReviewSendOutcome => ({
  _tag: "failed",
  reason,
});

// What the gate answers for a reply it did not call the platform for and
// cannot tell the fate of: one no longer on its way, whose job then finds
// it settled, or a resumed one.
const notClaimed: ReviewSendOutcome = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

// Why nothing was sent, when the channels context gave no token: each
// comes before any request to the platform.
const accessFailureOf = (failure: {
  readonly _tag: string;
}): ReviewReplyFailure => {
  if (failure._tag === "ChannelUnusable") {
    return "channelUnavailable";
  }

  return failure._tag === "TokenExpired"
    ? "reconnectNeeded"
    : "platformUnavailable";
};

const notDone = (reason: ReviewReplyFailure): ReviewActionOutcome => ({
  _tag: "failed",
  reason,
});

/**
 * The reviews of Google Business Profile locations, as the channel's gate
 * runs them: `ReviewSource` reads a location, `ReviewReplySender` sends
 * what the engagement tables hold, found by id, so no text travels with a
 * call. Only where the inbox reads the platform (`readsReviewsOn`): off,
 * nothing is called. Needs ChannelAccess, the ReviewStore and
 * CurrentInboxPlatforms.
 */
export const platformReviewsWith = (settings: {
  /** The My Business API's origin. */
  readonly businessApi: URL;
  readonly http: PlatformHttp;
}) =>
  Layer.unwrap(
    Effect.gen(function* PlatformReviews() {
      const access = yield* ChannelAccess;
      const store = yield* ReviewStore;
      const inbox = yield* CurrentInboxPlatforms;

      const google = yield* googleBusinessReviews({
        api: settings.businessApi,
        http: settings.http,
      });

      const read = Effect.fn("ReviewSource.read")(function* read(
        request: ReviewsRequest
      ) {
        const account = yield* access.account(request.channelId).pipe(
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
            TokenExpired: needsReconnect,
          })
        );

        if (!readsReviewsOn(account.platform, inbox)) {
          return yield* new ChannelUnreadable({ reason: "unsupported" });
        }

        return yield* google.read(account, request.keptSince);
      });

      // The channel's account, if the inbox answers reviews on it, or
      // why nothing can be sent: each before any request to the platform.
      const reach = (channelId: ChannelId) =>
        access.account(channelId).pipe(
          Effect.map((account): Option.Option<ChannelAccount> =>
            readsReviewsOn(account.platform, inbox)
              ? Option.some(account)
              : Option.none()
          ),
          Effect.mapError(accessFailureOf)
        );

      const sending = (
        request: ReviewReplyRequest,
        mode: "resume" | "send"
      ): Effect.Effect<ReviewSendOutcome> =>
        Effect.gen(function* send() {
          // A resumed reply may be out since its first run: whatever keeps
          // this run from asking the platform proves nothing.
          const stopped = (reason: ReviewReplyFailure): ReviewSendOutcome =>
            mode === "send" ? failedWith(reason) : notClaimed;

          const reply = yield* store.reply(request.replyId);

          const review = yield* Option.match(reply, {
            onNone: () => Effect.succeed(Option.none()),
            onSome: ({ reviewId }) => store.review(reviewId),
          });

          if (Option.isNone(reply) || Option.isNone(review)) {
            return stopped("reviewGone");
          }

          const reached = yield* reach(request.channelId).pipe(Effect.result);

          if (reached._tag === "Failure") {
            return stopped(reached.failure);
          }

          if (Option.isNone(reached.success)) {
            return stopped("channelUnavailable");
          }

          // Claimed just before the call, and only while the reply is on
          // its way: one handed over meanwhile is not sent.
          if (!(yield* store.claimCall(request.replyId, yield* DateTime.now))) {
            return notClaimed;
          }

          return yield* google[mode](reached.success.value, {
            platformReviewId: review.value.platformReviewId,
            text: reply.value.text,
          });
        }).pipe(
          Effect.catchTag("DatabaseError", (failure) =>
            Effect.logWarning(
              "Could not read a reply to a review to send",
              failure
            ).pipe(
              Effect.as(
                mode === "send" ? failedWith("platformUnavailable") : notClaimed
              )
            )
          )
        );

      const withdraw = (request: ReviewWithdrawal) =>
        Effect.gen(function* withdrawing() {
          const review = yield* store.review(request.reviewId);

          if (Option.isNone(review)) {
            return notDone("reviewGone");
          }

          const reached = yield* reach(request.channelId).pipe(Effect.result);

          if (reached._tag === "Failure") {
            return notDone(reached.failure);
          }

          if (Option.isNone(reached.success)) {
            return notDone("channelUnavailable");
          }

          return yield* google.withdraw(
            reached.success.value,
            review.value.platformReviewId
          );
        }).pipe(
          Effect.catchTag("DatabaseError", () =>
            Effect.succeed(notDone("platformUnavailable"))
          )
        );

      const check = (request: ReviewReplyRequest) =>
        Effect.gen(function* checking() {
          const unknown: ReviewReplyCheck = { _tag: "unknown" };
          const reply = yield* store.reply(request.replyId);

          const review = yield* Option.match(reply, {
            onNone: () => Effect.succeed(Option.none()),
            onSome: ({ reviewId }) => store.review(reviewId),
          });

          if (Option.isNone(review)) {
            const gone: ReviewReplyCheck = { _tag: "gone" };

            return gone;
          }

          const reached = yield* reach(request.channelId).pipe(Effect.option);

          if (Option.isNone(reached) || Option.isNone(reached.value)) {
            return unknown;
          }

          return yield* google.check(
            reached.value.value,
            review.value.platformReviewId
          );
        }).pipe(
          Effect.catchTag("DatabaseError", () =>
            Effect.succeed<ReviewReplyCheck>({ _tag: "unknown" })
          )
        );

      return Layer.mergeAll(
        Layer.succeed(ReviewSource, ReviewSource.of({ read })),
        Layer.succeed(
          ReviewReplySender,
          ReviewReplySender.of({
            check,
            resume: (request) => sending(request, "resume"),
            send: (request) => sending(request, "send"),
            withdraw,
          })
        )
      );
    })
  );
