import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result, Schema } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { TestClock } from "effect/testing";
import {
  Api,
  Forbidden,
  InboxActionUnavailable,
  InboxReviewNotFound,
  InboxReviewThreadNotFound,
  NewInboxReviewReplySchema,
  ReplyInvalid,
  ReplyPending,
} from "peal-contract";
import type { Member } from "peal-contract";

import { CollectReviews } from "#engagement/application/collect-reviews.ts";
import { InboxReviewsApiLive } from "#engagement/container.ts";
import type { Permission } from "#shared/domain/access.ts";
import { memberOf } from "#test/channels/support.ts";
import {
  locationChannel,
  makeReviewWorld,
} from "#test/engagement/fakes/review-world.ts";
import type { ReviewWorld } from "#test/engagement/fakes/review-world.ts";
import {
  channelId,
  reviewedAt,
  reviewReading,
  workspaceId,
} from "#test/engagement/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The reviews endpoints on their real use cases, over the in-memory
// world. Each request acts as a member, as WorkspaceAccess would.

const clientAs = (
  world: ReviewWorld,
  permissions: readonly Permission[],
  member: Member = memberOf(workspaceId, permissions)
) =>
  HttpApiTest.groups(Api, ["inboxReviews"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        InboxReviewsApiLive.pipe(
          Layer.provideMerge(securityTest(member)),
          Layer.provide(world.layer)
        ),
        HttpServer.layerServices
      )
    )
  );

const params = { workspaceId };

// A world whose one location was read once, with two reviews.
const collected = (world: ReviewWorld) =>
  Effect.gen(function* collecting() {
    world.state.locations.push({ channelId: channelId(1), workspaceId });
    world.state.channels.set(channelId(1), locationChannel);
    world.state.read = () =>
      Effect.succeed({
        averageRating: Option.some(4),
        complete: true,
        reviews: [
          reviewReading(1, { rating: 2, reviewerName: Option.none() }),
          reviewReading(2, {
            reply: Option.some({
              moderation: Option.some("approved"),
              text: "Thanks!",
              updatedAt: reviewedAt,
            }),
          }),
        ],
        totalReviewCount: Option.some(12),
      });

    yield* TestClock.setTime(DateTime.toEpochMillis(reviewedAt));
    yield* CollectReviews.use((collect) => collect.run(reviewedAt)).pipe(
      Effect.provide(world.layer)
    );

    const [thread] = [...world.state.threads.values()];
    const reviews = [...world.state.reviews.values()];

    return { reviews, thread };
  });

describe("the reviews endpoints", () => {
  it.effect("list the locations with reviews, and show one whole", () => {
    const world = makeReviewWorld();

    return Effect.gen(function* reads() {
      const { thread } = yield* collected(world);
      const client = yield* clientAs(world, permissionsFor("viewer"));

      const page = yield* client.inboxReviews.listReviewThreads({
        params,
        query: { unanswered: "true" },
      });

      assert.deepStrictEqual(
        page.items.map(
          ({ averageRating, kind, reviews, totalReviewCount, unanswered }) => ({
            averageRating,
            kind,
            reviews,
            totalReviewCount,
            unanswered,
          })
        ),
        [
          {
            averageRating: 4,
            kind: "reviews",
            reviews: 2,
            totalReviewCount: 12,
            unanswered: 1,
          },
        ]
      );

      const detail = yield* client.inboxReviews.getReviewThread({
        params: { ...params, threadId: thread?.id ?? "" },
      });

      assert.strictEqual(detail.platform, "googleBusiness");
      assert.deepStrictEqual(detail.abilities, {
        read: "available",
        reply: "available",
        withdraw: "available",
      });
      assert.deepStrictEqual(
        detail.reviews
          .map(({ rating, reviewerName, state }) => ({
            rating,
            reviewerName,
            state,
          }))
          .toSorted((left, right) => left.rating - right.rating),
        [
          { rating: 2, reviewerName: null, state: "new" },
          { rating: 5, reviewerName: "Visitor 2", state: "answered" },
        ]
      );
    });
  });

  it.effect(
    "answer a review with a reply on its way, and refuse what Google would not take",
    () => {
      const world = makeReviewWorld();

      return Effect.gen(function* replies() {
        const { reviews } = yield* collected(world);
        const client = yield* clientAs(world, permissionsFor("editor"));
        const reviewId = reviews[0]?.id ?? "";

        const reply = yield* client.inboxReviews.replyToReview({
          params: { ...params, reviewId },
          payload: { text: "Thank you for coming!" },
        });

        assert.strictEqual(reply.status, "sending");
        assert.deepStrictEqual(world.state.jobs, [reply.id]);

        const again = yield* client.inboxReviews
          .replyToReview({
            params: { ...params, reviewId },
            payload: { text: "Again" },
          })
          .pipe(Effect.flip);

        assert.instanceOf(again, ReplyPending);

        const tooLong = yield* client.inboxReviews
          .replyToReview({
            params: { ...params, reviewId: reviews[1]?.id ?? "" },
            payload: { text: "é".repeat(2049) },
          })
          .pipe(Effect.flip);

        assert.instanceOf(tooLong, ReplyInvalid);
      });
    }
  );

  it.effect("mark a review answered, and delete the location's reply", () => {
    const world = makeReviewWorld();

    return Effect.gen(function* acts() {
      const { reviews } = yield* collected(world);
      const client = yield* clientAs(world, permissionsFor("editor"));
      const replied = reviews.find((review) => Option.isSome(review.reply));
      const waiting = reviews.find((review) => Option.isNone(review.reply));

      const marked = yield* client.inboxReviews.setReviewAnswered({
        params: { ...params, reviewId: waiting?.id ?? "" },
        payload: { answered: true },
      });

      assert.strictEqual(marked.state, "answered");
      assert.isTrue(marked.markedAnswered);

      const withdrawn = yield* client.inboxReviews.withdrawReviewReply({
        params: { ...params, reviewId: replied?.id ?? "" },
      });

      assert.isNull(withdrawn.reply);
      assert.strictEqual(withdrawn.state, "new");
    });
  });

  it.effect(
    "refuse a viewer's reply, a review of nowhere, and a channel that cannot answer",
    () => {
      const world = makeReviewWorld();

      return Effect.gen(function* refusals() {
        const { reviews } = yield* collected(world);
        const viewer = yield* clientAs(world, permissionsFor("viewer"));
        const reviewId = reviews[0]?.id ?? "";

        const forbidden = yield* viewer.inboxReviews
          .replyToReview({
            params: { ...params, reviewId },
            payload: { text: "Thanks" },
          })
          .pipe(Effect.flip);

        assert.instanceOf(forbidden, Forbidden);

        const editor = yield* clientAs(world, permissionsFor("editor"));

        const missing = yield* editor.inboxReviews
          .replyToReview({
            params: { ...params, reviewId: "not-a-review" },
            payload: { text: "Thanks" },
          })
          .pipe(Effect.flip);

        assert.instanceOf(missing, InboxReviewNotFound);

        const nowhere = yield* editor.inboxReviews
          .getReviewThread({ params: { ...params, threadId: "not-a-thread" } })
          .pipe(Effect.flip);

        assert.instanceOf(nowhere, InboxReviewThreadNotFound);

        world.state.channels.set(channelId(1), {
          ...locationChannel,
          scopes: [],
        });

        const unable = yield* editor.inboxReviews
          .replyToReview({
            params: { ...params, reviewId },
            payload: { text: "Thanks" },
          })
          .pipe(Effect.flip);

        assert.instanceOf(unable, InboxActionUnavailable);
      });
    }
  );

  it.effect(
    "refuse an API key a reply and a deleted reply, as only a person answers a review",
    () => {
      const world = makeReviewWorld();
      const permissions = permissionsFor("editor");

      return Effect.gen(function* keys() {
        const { reviews } = yield* collected(world);
        const reviewId = reviews[0]?.id ?? "";

        const key = yield* clientAs(world, permissions, {
          permissions,
          principal: {
            _tag: "apiKey",
            apiKeyId: "synthetic-key",
            permissions,
            workspaceId,
          },
          workspaceId,
        });

        const replied = yield* key.inboxReviews
          .replyToReview({
            params: { ...params, reviewId },
            payload: { text: "Thanks" },
          })
          .pipe(Effect.flip);

        const withdrawn = yield* key.inboxReviews
          .withdrawReviewReply({ params: { ...params, reviewId } })
          .pipe(Effect.flip);

        for (const refused of [replied, withdrawn]) {
          assert.instanceOf(refused, Forbidden);
          assert.strictEqual(
            refused instanceof Forbidden ? refused.reason : undefined,
            "personRequired"
          );
        }

        // Reading stays open to it.
        const page = yield* key.inboxReviews.listReviewThreads({
          params,
          query: {},
        });

        assert.lengthOf(page.items, 1);
        assert.lengthOf(world.state.jobs, 0);
      });
    }
  );

  it("refuse a reply holding a NUL as a malformed request, before any use case", () => {
    const decode = Schema.decodeUnknownResult(NewInboxReviewReplySchema);

    assert.isTrue(Result.isFailure(decode({ text: "a\u0000b" })));
    assert.isTrue(Result.isSuccess(decode({ text: "Thank you!" })));
  });
});
