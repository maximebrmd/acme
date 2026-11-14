import { DateTime, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import type { ReviewActionOutcome } from "#engagement/application/ports/review-reply-sender.ts";
import type {
  ReviewsBatch,
  ReviewsReadFailure,
} from "#engagement/application/ports/review-source.ts";
import type {
  ReviewReplyFailure,
  ReviewSendOutcome,
} from "#engagement/domain/review-reply.ts";
import { isLocationReply } from "#engagement/domain/review-reply.ts";
import type {
  OwnerReply,
  OwnerReplyModeration,
  ReviewRating,
  ReviewReading,
} from "#engagement/domain/review.ts";
import {
  databaseDown,
  needsReconnect,
  unusable,
} from "#engagement/infrastructure/platforms/channel-refusals.ts";
import type { PlatformHttp } from "#engagement/infrastructure/platforms/engagement-platform.ts";
import { googleBusinessReviewScope } from "#shared/domain/inbox-platform.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

// A Google Business Profile location's reviews, from the reference of the
// My Business API v4's `accounts.locations.reviews`
// (developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews
// and its methods, each read 2026-11-14):
//
// - list: `GET /v4/{parent=accounts/*/locations/*}/reviews`, `pageSize`
//   ("The maximum pageSize is 50"), `pageToken`, `orderBy` (`rating`,
//   `rating desc`, `updateTime desc`, the default); answers `reviews[]`,
//   `averageRating`, `totalReviewCount` and `nextPageToken`, absent on the
//   last page.
// - get: `GET /v4/{name=accounts/*/locations/*/reviews/*}`. Its guide
//   (developers.google.com/my-business/content/review-data) says get does
//   not return a reply's `reviewReplyState`; list does.
// - updateReply: `PUT /v4/{name=…/reviews/*}/reply` with a ReviewReply
//   (`comment`, "The maximum length is 4096 bytes"); it "creates" the
//   reply if none exists, replaces it otherwise, and "is only valid if the
//   specified location is verified". Answers the ReviewReply.
// - deleteReply: `DELETE /v4/{name=…/reviews/*}/reply`, an empty body.
// - The Review resource: `name`, `reviewId`, `reviewer` (`displayName`,
//   "Only populated with the reviewer's real name if isAnonymous is
//   false", `profilePhotoUrl`, `isAnonymous`), `starRating` (`ONE` to
//   `FIVE`, or `STAR_RATING_UNSPECIFIED`), `comment` ("plain text with
//   markups"), `createTime`, `updateTime`, `reviewReply` (`comment`,
//   `updateTime`, `reviewReplyState`: `PENDING`, `REJECTED`, `APPROVED`),
//   `reviewMediaItems[]`. Peal reads no photo and no profile picture: it
//   counts the media items, and keeps the name only.
// - The scope of every method is `business.manage`
//   (`googleBusinessReviewScope`); errors are Google's: `error.status`
//   (`UNAUTHENTICATED`, `PERMISSION_DENIED`, `NOT_FOUND`,
//   `RESOURCE_EXHAUSTED`, `INVALID_ARGUMENT`…) with the HTTP status.
//
// The project's quota is zero until Google grants access to the Business
// Profile APIs (developers.google.com/my-business/content/limits: "If your
// quota limit for the Google Business Profile API is 0, you have not yet
// been granted access"); a read refused for it waits like any other.

/** The reviews one page asks for: Google's most. */
export const reviewsPageSize = 50;

/** The pages one read of a location takes at most: 500 reviews. */
export const reviewsPagesPerRead = 10;

export interface GoogleBusinessReviewsOptions {
  /** The My Business API's origin: `https://mybusiness.googleapis.com`. */
  readonly api: URL;
  readonly http: PlatformHttp;
  /** The reviews a page asks for; `reviewsPageSize` unless a test says. */
  readonly pageSize?: number;
  /** The pages a read takes; `reviewsPagesPerRead` unless a test says. */
  readonly maxPages?: number;
}

/** A review to answer, by its name on Google, with what to say. */
export interface ReviewTarget {
  readonly platformReviewId: string;
  readonly text: string;
}

/** A location's reviews on Google, read and answered as the location. */
export interface ReviewPlatform {
  readonly read: (
    account: ChannelAccount,
    keptSince: DateTime.Utc
  ) => Effect.Effect<ReviewsBatch, ReviewsReadFailure>;
  readonly send: (
    account: ChannelAccount,
    target: ReviewTarget
  ) => Effect.Effect<ReviewSendOutcome>;
  readonly resume: (
    account: ChannelAccount,
    target: ReviewTarget
  ) => Effect.Effect<ReviewSendOutcome>;
  readonly withdraw: (
    account: ChannelAccount,
    platformReviewId: string
  ) => Effect.Effect<ReviewActionOutcome>;
}

// Google's StarRating, and the state of a reply's moderation.
const ratings = new Map<string, ReviewRating>([
  ["ONE", 1],
  ["TWO", 2],
  ["THREE", 3],
  ["FOUR", 4],
  ["FIVE", 5],
]);

const moderations = new Map<string, OwnerReplyModeration>([
  ["APPROVED", "approved"],
  ["PENDING", "pending"],
  ["REJECTED", "rejected"],
]);

const ReplyJsonSchema = Schema.Struct({
  comment: Schema.String,
  reviewReplyState: Schema.optionalKey(Schema.String),
  updateTime: Schema.String,
});

const ReviewJsonSchema = Schema.Struct({
  comment: Schema.optionalKey(Schema.String),
  createTime: Schema.String,
  name: Schema.String,
  reviewMediaItems: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  reviewReply: Schema.optionalKey(ReplyJsonSchema),
  reviewer: Schema.optionalKey(
    Schema.Struct({
      displayName: Schema.optionalKey(Schema.String),
      isAnonymous: Schema.optionalKey(Schema.Boolean),
    })
  ),
  starRating: Schema.optionalKey(Schema.String),
  updateTime: Schema.String,
});

type ReviewJson = typeof ReviewJsonSchema.Type;

// Each review is decoded on its own, so one Peal cannot read is passed
// over, and the read is not complete.
const PageJsonSchema = Schema.Struct({
  averageRating: Schema.optionalKey(Schema.Number),
  nextPageToken: Schema.optionalKey(Schema.String),
  reviews: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  totalReviewCount: Schema.optionalKey(Schema.Number),
});

const ErrorJsonSchema = Schema.Struct({
  error: Schema.Struct({ status: Schema.optionalKey(Schema.String) }),
});

const pageOf = HttpClientResponse.schemaBodyJson(PageJsonSchema);

const reviewBodyOf = HttpClientResponse.schemaBodyJson(ReviewJsonSchema);

const replyBodyOf = HttpClientResponse.schemaBodyJson(ReplyJsonSchema);

const decodeReview = Schema.decodeUnknownOption(ReviewJsonSchema);

const instantOf = (text: string): Option.Option<DateTime.Utc> =>
  DateTime.make(text);

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

/**
 * What Google refusing a call means, from its HTTP status and the error's
 * `status`:
 *
 * - `token`: 401 or `UNAUTHENTICATED`, which a renewal replaces.
 * - `permission`: 403 or `PERMISSION_DENIED`: the account may no longer
 *   manage the location, or the grant lacks the scope.
 * - `rateLimited`: 429 or `RESOURCE_EXHAUSTED`: the project's quota,
 *   zero until Google grants access.
 * - `gone`: 404 or `NOT_FOUND`: the review, or the location.
 * - `unavailable`: 5xx.
 * - `refused`: anything else (an unverified location, a reply Google
 *   does not take).
 */
type BusinessRefusal =
  | "gone"
  | "permission"
  | "rateLimited"
  | "refused"
  | "token"
  | "unavailable";

const refusalOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<BusinessRefusal> =>
  Effect.gen(function* refusing() {
    const { status } = response;

    if (status >= 500) {
      return "unavailable" as const;
    }

    const named = yield* HttpClientResponse.schemaBodyJson(ErrorJsonSchema)(
      response
    ).pipe(
      Effect.map(({ error }) => error.status ?? ""),
      Effect.orElseSucceed(() => "")
    );

    if (status === 401 || named === "UNAUTHENTICATED") {
      return "token" as const;
    }

    if (status === 429 || named === "RESOURCE_EXHAUSTED") {
      return "rateLimited" as const;
    }

    if (status === 403 || named === "PERMISSION_DENIED") {
      return "permission" as const;
    }

    return status === 404 || named === "NOT_FOUND"
      ? ("gone" as const)
      : ("refused" as const);
  });

const failureOf = (refusal: BusinessRefusal): ReviewReplyFailure => {
  switch (refusal) {
    case "gone": {
      return "reviewGone";
    }

    case "permission":
    case "token": {
      return "reconnectNeeded";
    }

    case "rateLimited": {
      return "rateLimited";
    }

    case "unavailable": {
      return "platformUnavailable";
    }

    case "refused": {
      return "refused";
    }

    default: {
      return refusal satisfies never;
    }
  }
};

const failedWith = (reason: ReviewReplyFailure): ReviewSendOutcome => ({
  _tag: "failed",
  reason,
});

const ownerReplyOf = (
  reply: typeof ReplyJsonSchema.Type
): Option.Option<OwnerReply> =>
  instantOf(reply.updateTime).pipe(
    Option.map((updatedAt) => ({
      moderation: Option.fromUndefinedOr(
        moderations.get(reply.reviewReplyState ?? "")
      ),
      text: reply.comment,
      updatedAt,
    }))
  );

// A review as Peal keeps it, when it is one of the location's and has a
// rating and times Peal can read.
const readingOf = (
  locationName: string,
  review: ReviewJson
): Option.Option<ReviewReading> => {
  if (!review.name.startsWith(`${locationName}/reviews/`)) {
    return Option.none();
  }

  const rating = ratings.get(review.starRating ?? "");
  const writtenAt = instantOf(review.createTime);
  const updatedAt = instantOf(review.updateTime);

  if (
    rating === undefined ||
    Option.isNone(writtenAt) ||
    Option.isNone(updatedAt)
  ) {
    return Option.none();
  }

  const reply =
    review.reviewReply === undefined
      ? Option.some(Option.none<OwnerReply>())
      : ownerReplyOf(review.reviewReply).pipe(Option.map(Option.some));

  // A reply Peal cannot read would be taken for none: the review is not.
  if (Option.isNone(reply)) {
    return Option.none();
  }

  const anonymous = review.reviewer?.isAnonymous === true;

  return Option.some({
    photoCount: review.reviewMediaItems?.length ?? 0,
    platformReviewId: review.name,
    rating,
    reply: reply.value,
    reviewerName: anonymous
      ? Option.none()
      : Option.fromUndefinedOr(review.reviewer?.displayName),
    text: review.comment ?? "",
    updatedAt: updatedAt.value,
    writtenAt: writtenAt.value,
  });
};

/**
 * A location's reviews on Google, as the channel's account, through
 * ChannelAccess: listed the latest changed first, read back to
 * `keptSince`, answered and their reply deleted. Needs ChannelAccess.
 */
export const googleBusinessReviews = Effect.fn("googleBusinessReviews")(
  function* googleBusinessReviews(options: GoogleBusinessReviewsOptions) {
    const access = yield* ChannelAccess;
    const { http } = options;
    const pageSize = options.pageSize ?? reviewsPageSize;
    const maxPages = options.maxPages ?? reviewsPagesPerRead;

    const url = (path: string) => new URL(`/v4/${path}`, options.api);

    const readAll = Effect.fn("GoogleBusinessReviews.read")(function* readAll(
      account: ChannelAccount,
      token: Redacted.Redacted,
      keptSince: DateTime.Utc
    ) {
      const reviews: ReviewReading[] = [];
      let passedOver = false;
      let listedAny = false;
      let after = Option.none<string>();

      let figures = {
        averageRating: Option.none<number>(),
        totalReviewCount: Option.none<number>(),
      };

      for (let page = 0; page < maxPages; page += 1) {
        const request = HttpClientRequest.get(
          url(`${account.accountId}/reviews`)
        ).pipe(
          HttpClientRequest.setUrlParams({
            orderBy: "updateTime desc",
            pageSize: String(pageSize),
            ...Option.match(after, {
              onNone: () => ({}),
              onSome: (pageToken) => ({ pageToken }),
            }),
          }),
          HttpClientRequest.bearerToken(token)
        );

        const sent = yield* http.execute(request).pipe(Effect.result);

        if (sent._tag === "Failure") {
          return yield* new PlatformUnavailable();
        }

        const response = sent.success;

        if (!isSuccess(response)) {
          const refusal = yield* refusalOf(response);

          if (refusal === "token") {
            return yield* new TokenRejected();
          }

          // The project's quota: the run stops, for as long as Google said.
          if (refusal === "rateLimited") {
            const wait = retryAfterOf(response.headers, yield* DateTime.now);

            return yield* Option.match(wait, {
              onNone: () => new RateLimited({}),
              onSome: (retryAfter) => new RateLimited({ retryAfter }),
            });
          }

          return yield* refusal === "permission" || refusal === "gone"
            ? new ChannelUnreadable({ reason: "paused" })
            : new PlatformUnavailable();
        }

        const body = yield* pageOf(response).pipe(
          Effect.mapError(() => new PlatformUnavailable())
        );

        if (page === 0) {
          figures = {
            averageRating: Option.fromUndefinedOr(body.averageRating),
            totalReviewCount: Option.fromUndefinedOr(
              body.totalReviewCount
            ).pipe(Option.filter(Number.isInteger)),
          };
        }

        let reachedBound = false;

        for (const raw of body.reviews ?? []) {
          listedAny = true;

          const review = decodeReview(raw).pipe(
            Option.flatMap((decoded) => readingOf(account.accountId, decoded))
          );

          if (Option.isNone(review)) {
            passedOver = true;
          } else if (DateTime.isLessThan(review.value.updatedAt, keptSince)) {
            reachedBound = true;
          } else {
            reviews.push(review.value);
          }
        }

        after = Option.fromUndefinedOr(body.nextPageToken).pipe(
          Option.filter((next) => next !== "")
        );

        if (reachedBound || Option.isNone(after)) {
          // An answer that lists no review proves the location has none
          // only when Google counts none: otherwise it may be a passing
          // fault, and a complete read would delete every review kept.
          const provenEmpty =
            listedAny || Option.contains(figures.totalReviewCount, 0);

          const batch: ReviewsBatch = {
            ...figures,
            complete: !passedOver && provenEmpty,
            reviews,
          };

          return batch;
        }
      }

      const batch: ReviewsBatch = { ...figures, complete: false, reviews };

      return batch;
    });

    const read = (
      account: ChannelAccount,
      keptSince: DateTime.Utc
    ): Effect.Effect<ReviewsBatch, ReviewsReadFailure> =>
      account.scopes.includes(googleBusinessReviewScope)
        ? access
            .withToken(account.channelId, ({ accessToken }) =>
              readAll(account, accessToken, keptSince)
            )
            .pipe(
              Effect.catchTags({
                ChannelUnusable: unusable,
                DatabaseError: databaseDown,
                TokenExpired: needsReconnect,
              })
            )
        : Effect.fail(new ChannelUnreadable({ reason: "paused" }));

    // A call as the account, whose failures to get a token each mean
    // nothing was sent.
    const asAccount = <A>(
      account: ChannelAccount,
      onRefused: (reason: ReviewReplyFailure) => A,
      use: (token: Redacted.Redacted) => Effect.Effect<A, TokenRejected>
    ): Effect.Effect<A> =>
      access
        .withToken(account.channelId, ({ accessToken }) => use(accessToken))
        .pipe(
          Effect.catchTags({
            ChannelUnusable: () =>
              Effect.succeed(onRefused("channelUnavailable")),
            DatabaseError: () =>
              Effect.succeed(onRefused("platformUnavailable")),
            PlatformUnavailable: () =>
              Effect.succeed(onRefused("platformUnavailable")),
            TokenExpired: () => Effect.succeed(onRefused("reconnectNeeded")),
          })
        );

    const putReply = Effect.fn("GoogleBusinessReviews.reply")(
      function* putReply(token: Redacted.Redacted, target: ReviewTarget) {
        const request = HttpClientRequest.put(
          url(`${target.platformReviewId}/reply`)
        ).pipe(
          HttpClientRequest.bearerToken(token),
          HttpClientRequest.bodyJsonUnsafe({ comment: target.text })
        );

        const sent = yield* http.execute(request).pipe(Effect.result);

        // The request may have reached Google.
        if (sent._tag === "Failure") {
          const outcome: ReviewSendOutcome = {
            _tag: "unconfirmed",
            reason: "noResponse",
          };

          return outcome;
        }

        const response = sent.success;

        if (isSuccess(response)) {
          const now = yield* DateTime.now;

          // Set, and answered in a shape Peal cannot read: the reply is
          // the text sent, as of now.
          const reply = yield* replyBodyOf(response).pipe(
            Effect.map(ownerReplyOf),
            Effect.orElseSucceed(() => Option.none<OwnerReply>())
          );

          const outcome: ReviewSendOutcome = {
            _tag: "sent",
            reply: Option.getOrElse(reply, () => ({
              moderation: Option.none(),
              text: target.text,
              updatedAt: now,
            })),
          };

          return outcome;
        }

        const refusal = yield* refusalOf(response);

        // Refused before anything was set: a renewed token is tried.
        if (refusal === "token") {
          return yield* new TokenRejected();
        }

        // Google failed on the reply itself: it may be set.
        if (refusal === "unavailable") {
          const outcome: ReviewSendOutcome = {
            _tag: "unconfirmed",
            reason: "noResponse",
          };

          return outcome;
        }

        return failedWith(failureOf(refusal));
      }
    );

    const send = (
      account: ChannelAccount,
      target: ReviewTarget
    ): Effect.Effect<ReviewSendOutcome> =>
      asAccount(account, failedWith, (token) => putReply(token, target));

    // Reads the review back; sends only when its reply is not this one,
    // as setting it again shows it once.
    const resume = (
      account: ChannelAccount,
      target: ReviewTarget
    ): Effect.Effect<ReviewSendOutcome> =>
      asAccount<ReviewSendOutcome>(
        account,
        () => ({ _tag: "unconfirmed", reason: "interrupted" }),
        Effect.fn("GoogleBusinessReviews.resume")(function* resuming(token) {
          const request = HttpClientRequest.get(
            url(target.platformReviewId)
          ).pipe(HttpClientRequest.bearerToken(token));

          const sent = yield* http.execute(request).pipe(Effect.result);

          const undecided: ReviewSendOutcome = {
            _tag: "unconfirmed",
            reason: "interrupted",
          };

          if (sent._tag === "Failure") {
            return undecided;
          }

          if (!isSuccess(sent.success)) {
            const refusal = yield* refusalOf(sent.success);

            if (refusal === "token") {
              return yield* new TokenRejected();
            }

            return refusal === "gone" ? failedWith("reviewGone") : undecided;
          }

          const found = yield* reviewBodyOf(sent.success).pipe(Effect.option);

          if (Option.isNone(found)) {
            return undecided;
          }

          const reply = Option.fromUndefinedOr(found.value.reviewReply).pipe(
            Option.flatMap(ownerReplyOf)
          );

          if (isLocationReply(target, reply) && Option.isSome(reply)) {
            const outcome: ReviewSendOutcome = {
              _tag: "sent",
              reply: reply.value,
            };

            return outcome;
          }

          return yield* putReply(token, target);
        })
      );

    const withdraw = (
      account: ChannelAccount,
      platformReviewId: string
    ): Effect.Effect<ReviewActionOutcome> =>
      asAccount<ReviewActionOutcome>(
        account,
        (reason) => ({ _tag: "failed", reason }),
        Effect.fn("GoogleBusinessReviews.withdraw")(
          function* withdrawing(token) {
            const request = HttpClientRequest.delete(
              url(`${platformReviewId}/reply`)
            ).pipe(HttpClientRequest.bearerToken(token));

            const sent = yield* http.execute(request).pipe(Effect.result);

            if (sent._tag === "Failure") {
              const outcome: ReviewActionOutcome = {
                _tag: "failed",
                reason: "platformUnavailable",
              };

              return outcome;
            }

            if (isSuccess(sent.success)) {
              const outcome: ReviewActionOutcome = { _tag: "done" };

              return outcome;
            }

            const refusal = yield* refusalOf(sent.success);

            if (refusal === "token") {
              return yield* new TokenRejected();
            }

            // No reply, or no review: nothing is left to delete.
            const outcome: ReviewActionOutcome =
              refusal === "gone"
                ? { _tag: "done" }
                : { _tag: "failed", reason: failureOf(refusal) };

            return outcome;
          }
        )
      );

    const platform: ReviewPlatform = { read, resume, send, withdraw };

    return platform;
  }
);
