import { Effect, Schema } from "effect";

import {
  dropped,
  headerOf,
  json,
  platformServer,
  scripted,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

/** The synthetic location the fake's token manages. */
export const fakeLocation = "accounts/101/locations/202";

/**
 * A review the fake keeps, as the My Business API v4 writes one: its
 * reviewer (no name when anonymous), its stars as Google's enum, its text
 * (none for a rating alone), its times and the location's reply.
 */
export interface FakeReview {
  readonly anonymous?: boolean;
  readonly comment?: string | undefined;
  readonly createTime: string;
  readonly id: string;
  readonly media?: number;
  readonly name?: string;
  reply?: { comment: string; state?: string; updateTime: string };
  readonly starRating: string;
  readonly updateTime: string;
}

export interface FakeBusinessReviewsOptions {
  /** When the replies the fake sets were written. */
  readonly now?: string;
  readonly averageRating?: number;
}

// A review, and a page of them, as the API writes them.
interface ReviewJson {
  comment?: string;
  readonly createTime: string;
  readonly name: string;
  readonly reviewId: string;
  readonly reviewMediaItems: readonly JsonValue[];
  reviewReply?: JsonValue;
  readonly reviewer: JsonValue;
  readonly starRating: string;
  readonly updateTime: string;
}

interface PageJson {
  readonly averageRating: number;
  nextPageToken?: string;
  readonly reviews: readonly JsonValue[];
  readonly totalReviewCount: number;
}

/** An error as Google's APIs write one. */
export const businessError = (code: number, status: string): PlatformAnswer =>
  json({ error: { code, message: "synthetic", status } }, code);

const ReplyBodySchema = Schema.Struct({ comment: Schema.String });

const decodeReply = Schema.decodeUnknownSync(
  Schema.fromJsonString(ReplyBodySchema)
);

/**
 * A location's reviews on a loopback server that answers as Google's
 * reference of `accounts.locations.reviews` says: `list` by pages, the
 * latest changed first; `get`; `updateReply` (PUT, which makes or
 * replaces the one reply, `PENDING` until Google checked it); and
 * `deleteReply`. Only `tokens` are taken.
 */
export const fakeBusinessReviews = Effect.fnUntraced(
  function* fakeBusinessReviews(
    tokens: readonly string[],
    options: FakeBusinessReviewsOptions = {}
  ) {
    const reviews: FakeReview[] = [];
    const script = scripted<PlatformAnswer>();
    const now = options.now ?? "2026-11-14T10:00:00Z";

    // Fields Google leaves out are left out.
    const reviewJson = (review: FakeReview): JsonValue => {
      const written: ReviewJson = {
        createTime: review.createTime,
        name: review.name ?? `${fakeLocation}/reviews/${review.id}`,
        reviewId: review.id,
        reviewMediaItems: Array.from({ length: review.media ?? 0 }, (_, n) => ({
          thumbnailUrl: `https://photos.example/${review.id}/${String(n)}`,
        })),
        reviewer:
          review.anonymous === true
            ? { isAnonymous: true }
            : {
                displayName: `Visitor ${review.id}`,
                isAnonymous: false,
                profilePhotoUrl: `https://photos.example/people/${review.id}`,
              },
        starRating: review.starRating,
        updateTime: review.updateTime,
      };

      if (review.comment !== undefined) {
        written.comment = review.comment;
      }

      if (review.reply !== undefined) {
        written.reviewReply = {
          comment: review.reply.comment,
          reviewReplyState: review.reply.state ?? "APPROVED",
          updateTime: review.reply.updateTime,
        };
      }

      return { ...written };
    };

    const notFound = businessError(404, "NOT_FOUND");

    const list = (request: PlatformRequest): PlatformAnswer => {
      const size = Number(request.query.get("pageSize") ?? "10");
      const start = Number(request.query.get("pageToken") ?? "0");

      const sorted = reviews.toSorted((left, right) =>
        right.updateTime.localeCompare(left.updateTime)
      );

      const page = sorted.slice(start, start + size);
      const next = start + size < sorted.length ? String(start + size) : null;

      const body: PageJson = {
        averageRating: options.averageRating ?? 4.5,
        reviews: page.map(reviewJson),
        totalReviewCount: reviews.length,
      };

      if (next !== null) {
        body.nextPageToken = next;
      }

      return json({ ...body });
    };

    const found = (id: string) => reviews.find((review) => review.id === id);

    const handle = (request: PlatformRequest): PlatformAnswer => {
      const route = `${request.method} ${request.path}`;
      const queued = script.next(route);

      if (queued !== undefined) {
        return queued;
      }

      const token = headerOf(request, "authorization").replace("Bearer ", "");

      if (!tokens.includes(token)) {
        return businessError(401, "UNAUTHENTICATED");
      }

      const prefix = `/v4/${fakeLocation}/reviews`;

      if (request.method === "GET" && request.path === prefix) {
        return list(request);
      }

      if (!request.path.startsWith(`${prefix}/`)) {
        return notFound;
      }

      const [id, rest] = request.path.slice(prefix.length + 1).split("/");
      const review = found(id ?? "");

      if (review === undefined) {
        return notFound;
      }

      if (request.method === "GET" && rest === undefined) {
        return json(reviewJson(review));
      }

      if (request.method === "PUT" && rest === "reply") {
        review.reply = {
          comment: decodeReply(textOf(request)).comment,
          state: "PENDING",
          updateTime: now,
        };

        return json({
          comment: review.reply.comment,
          reviewReplyState: "PENDING",
          updateTime: now,
        });
      }

      if (request.method === "DELETE" && rest === "reply") {
        delete review.reply;

        return json({});
      }

      return notFound;
    };

    const server = yield* platformServer(handle);

    return {
      ...server,
      add: (...added: readonly FakeReview[]) => {
        reviews.push(...added);
      },
      lose: (route: string) => {
        script.push(route, [dropped]);
      },
      remove: (id: string) => {
        const at = reviews.findIndex((review) => review.id === id);

        if (at !== -1) {
          reviews.splice(at, 1);
        }
      },
      review: found,
      script: (route: string, answers: readonly PlatformAnswer[]) => {
        script.push(route, answers);
      },
    };
  }
);
