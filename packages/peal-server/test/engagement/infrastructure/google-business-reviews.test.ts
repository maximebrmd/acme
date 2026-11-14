import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Exit, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import {
  googleBusinessReviews,
  reviewsPagesPerRead,
  reviewsPageSize,
} from "#engagement/infrastructure/platforms/google-business/google-business-reviews.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { googleBusinessReviewScope } from "#shared/domain/inbox-platform.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import {
  businessError,
  fakeBusinessReviews,
  fakeLocation,
} from "#test/engagement/fakes/fake-business-reviews.ts";
import type { FakeReview } from "#test/engagement/fakes/fake-business-reviews.ts";
import { json, textOf } from "#test/publishing/fakes/platform-server.ts";

// A location's reviews against a loopback API that answers as Google's
// reference of the My Business API v4 says: reviews listed by pages, the
// latest changed first, the one reply set, read back and deleted.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000b6");

const keptSince = DateTime.makeUnsafe("2026-10-16T10:00:00Z");

const review = (n: number, changed: Partial<FakeReview> = {}): FakeReview => ({
  comment: `Review ${String(n)}`,
  createTime: `2026-11-${String(10 + (n % 4)).padStart(2, "0")}T09:00:00Z`,
  id: `r${String(n)}`,
  starRating: "FIVE",
  updateTime: `2026-11-${String(10 + (n % 4)).padStart(2, "0")}T09:${String(n % 60).padStart(2, "0")}:00Z`,
  ...changed,
});

const reviewName = (n: number) => `${fakeLocation}/reviews/r${String(n)}`;

const onGoogle = Effect.fnUntraced(function* onGoogle(
  options: {
    readonly scopes?: readonly string[];
    readonly tokens?: readonly string[];
    readonly pageSize?: number;
    readonly maxPages?: number;
  } = {}
) {
  const api = yield* fakeBusinessReviews(options.tokens ?? ["gbp-token-1"]);

  const account: ChannelAccount = {
    accountId: fakeLocation,
    channelId,
    connection: Option.none(),
    platform: "googleBusiness",
    scopes: options.scopes ?? [googleBusinessReviewScope],
  };

  const platform = yield* Effect.gen(function* building() {
    return yield* googleBusinessReviews({
      api: new URL(api.url),
      http: yield* publicHttpClient,
      maxPages: options.maxPages ?? reviewsPagesPerRead,
      pageSize: options.pageSize ?? reviewsPageSize,
    });
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        channelAccessOf(account, ["gbp-token-1", "gbp-token-2"]),
        FetchHttpClient.layer,
        OpenOutboundGuard
      )
    )
  );

  return { account, api, platform };
});

describe("Google Business Profile's reviews", () => {
  it.effect(
    "reads a location's reviews, newest change first, with what Google says of the location",
    () =>
      Effect.scoped(
        Effect.gen(function* reads() {
          const { account, api, platform } = yield* onGoogle();

          api.add(
            review(1, {
              anonymous: true,
              comment: undefined,
              media: 2,
              starRating: "TWO",
            }),
            review(2, {
              reply: {
                comment: "Thank you!",
                updateTime: "2026-11-13T10:00:00Z",
              },
            })
          );

          const batch = yield* platform.read(account, keptSince);

          assert.isTrue(batch.complete);
          assert.deepStrictEqual(batch.averageRating, Option.some(4.5));
          assert.deepStrictEqual(batch.totalReviewCount, Option.some(2));
          assert.deepStrictEqual(
            batch.reviews.map(({ platformReviewId }) => platformReviewId),
            [reviewName(2), reviewName(1)]
          );

          const [second, first] = batch.reviews;

          assert.deepStrictEqual(first?.rating, 2);
          assert.deepStrictEqual(first?.text, "");
          assert.deepStrictEqual(first?.reviewerName, Option.none());
          assert.deepStrictEqual(first?.photoCount, 2);
          assert.deepStrictEqual(
            second?.reviewerName,
            Option.some("Visitor r2")
          );
          assert.deepStrictEqual(
            second?.reply,
            Option.some({
              moderation: Option.some("approved" as const),
              text: "Thank you!",
              updatedAt: DateTime.makeUnsafe("2026-11-13T10:00:00Z"),
            })
          );

          const [listed] = api.requests();

          assert.strictEqual(listed?.path, `/v4/${fakeLocation}/reviews`);
          assert.strictEqual(listed?.query.get("orderBy"), "updateTime desc");
          assert.strictEqual(listed?.query.get("pageSize"), "50");
        })
      )
  );

  it.effect(
    "reads every page back to the oldest review Peal may keep, and no further",
    () =>
      Effect.scoped(
        Effect.gen(function* pages() {
          const { account, api, platform } = yield* onGoogle({ pageSize: 2 });

          api.add(
            review(1),
            review(2),
            review(3),
            review(4, {
              createTime: "2026-09-01T09:00:00Z",
              updateTime: "2026-09-01T09:00:00Z",
            }),
            review(5, {
              createTime: "2026-08-01T09:00:00Z",
              updateTime: "2026-08-01T09:00:00Z",
            })
          );

          const batch = yield* platform.read(account, keptSince);

          assert.isTrue(batch.complete);
          assert.strictEqual(batch.reviews.length, 3);
          // The second page held a review past the bound: no third page.
          assert.strictEqual(api.requests().length, 2);
        })
      )
  );

  it.effect(
    "is not complete when it stops at its last page, or passes over a review it cannot read",
    () =>
      Effect.scoped(
        Effect.gen(function* incomplete() {
          const { account, api, platform } = yield* onGoogle({
            maxPages: 1,
            pageSize: 2,
          });

          api.add(review(1), review(2), review(3));

          const capped = yield* platform.read(account, keptSince);

          assert.isFalse(capped.complete);
          assert.strictEqual(capped.reviews.length, 2);

          api.remove("r3");
          api.add(review(9, { starRating: "STAR_RATING_UNSPECIFIED" }));
          api.remove("r1");

          const unreadable = yield* platform.read(account, keptSince);

          assert.isFalse(unreadable.complete);
          assert.deepStrictEqual(
            unreadable.reviews.map(({ platformReviewId }) => platformReviewId),
            [reviewName(2)]
          );
        })
      )
  );

  it.effect(
    "takes an empty answer for complete only when Google counts no review at the location",
    () =>
      Effect.scoped(
        Effect.gen(function* empty() {
          const { account, api, platform } = yield* onGoogle();
          const route = `GET /v4/${fakeLocation}/reviews`;

          api.script(route, [
            json({ averageRating: 4.5, totalReviewCount: 12 }),
          ]);

          const unproven = yield* platform.read(account, keptSince);

          assert.isFalse(unproven.complete);

          api.script(route, [json({})]);

          assert.isFalse((yield* platform.read(account, keptSince)).complete);

          // A location with no review at all.
          const none = yield* platform.read(account, keptSince);

          assert.isTrue(none.complete);
          assert.deepStrictEqual(none.totalReviewCount, Option.some(0));
        })
      )
  );

  it.effect("passes over a review named under another location", () =>
    Effect.scoped(
      Effect.gen(function* foreign() {
        const { account, api, platform } = yield* onGoogle();

        api.add(review(1, { name: "accounts/999/locations/1/reviews/r1" }));

        const batch = yield* platform.read(account, keptSince);

        assert.deepStrictEqual(batch.reviews, []);
        assert.isFalse(batch.complete);
      })
    )
  );

  it.effect(
    "renews a token Google refuses, and pauses a channel it no longer lets read",
    () =>
      Effect.scoped(
        Effect.gen(function* refusals() {
          const renewed = yield* onGoogle({ tokens: ["gbp-token-2"] });

          renewed.api.add(review(1));

          const batch = yield* renewed.platform.read(
            renewed.account,
            keptSince
          );

          assert.strictEqual(batch.reviews.length, 1);

          const denied = yield* onGoogle();

          denied.api.script(`GET /v4/${fakeLocation}/reviews`, [
            businessError(403, "PERMISSION_DENIED"),
          ]);

          const refused = yield* denied.platform
            .read(denied.account, keptSince)
            .pipe(Effect.flip);

          assert.deepStrictEqual(refused._tag, "ChannelUnreadable");

          const busy = yield* onGoogle();

          busy.api.script(`GET /v4/${fakeLocation}/reviews`, [
            businessError(429, "RESOURCE_EXHAUSTED"),
          ]);

          const limited = yield* busy.platform
            .read(busy.account, keptSince)
            .pipe(Effect.flip);

          assert.deepStrictEqual(limited._tag, "RateLimited");

          // Google's Retry-After paces the collection.
          busy.api.script(`GET /v4/${fakeLocation}/reviews`, [
            json({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } }, 429, {
              "Retry-After": "120",
            }),
          ]);

          const paced = yield* busy.platform
            .read(busy.account, keptSince)
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            paced._tag === "RateLimited" ? paced.retryAfter : undefined,
            Duration.seconds(120)
          );

          const unscoped = yield* onGoogle({ scopes: [] });

          const exit = yield* unscoped.platform
            .read(unscoped.account, keptSince)
            .pipe(Effect.exit);

          assert.isTrue(Exit.isFailure(exit));
          assert.strictEqual(unscoped.api.requests().length, 0);
        })
      )
  );

  it.effect("puts the reply on the review, as Google answers it", () =>
    Effect.scoped(
      Effect.gen(function* replies() {
        const { account, api, platform } = yield* onGoogle();

        api.add(review(1));

        const outcome = yield* platform.send(account, {
          platformReviewId: reviewName(1),
          text: "Thank you, synthetic visitor!",
        });

        assert.deepStrictEqual(outcome, {
          _tag: "sent",
          reply: {
            moderation: Option.some("pending" as const),
            text: "Thank you, synthetic visitor!",
            updatedAt: DateTime.makeUnsafe("2026-11-14T10:00:00Z"),
          },
        });

        const [put] = api.requests();

        assert.strictEqual(put?.method, "PUT");
        assert.strictEqual(put?.path, `/v4/${reviewName(1)}/reply`);
        assert.strictEqual(
          put === undefined ? "" : textOf(put),
          JSON.stringify({ comment: "Thank you, synthetic visitor!" })
        );
      })
    )
  );

  it.effect(
    "tells a reply whose call got no answer from one Google refused",
    () =>
      Effect.scoped(
        Effect.gen(function* doubts() {
          const { account, api, platform } = yield* onGoogle();

          api.add(review(1));

          const route = `PUT /v4/${reviewName(1)}/reply`;
          const target = { platformReviewId: reviewName(1), text: "Thanks!" };

          api.lose(route);

          assert.deepStrictEqual(yield* platform.send(account, target), {
            _tag: "unconfirmed",
            reason: "noResponse",
          });

          api.script(route, [businessError(400, "INVALID_ARGUMENT")]);

          assert.deepStrictEqual(yield* platform.send(account, target), {
            _tag: "failed",
            reason: "refused",
          });

          assert.deepStrictEqual(
            yield* platform.send(account, {
              platformReviewId: `${fakeLocation}/reviews/gone`,
              text: "Thanks!",
            }),
            { _tag: "failed", reason: "reviewGone" }
          );
        })
      )
  );

  it.effect(
    "resumes by reading the review back: sent when the reply is there, sent again when it is not",
    () =>
      Effect.scoped(
        Effect.gen(function* resumes() {
          const { account, api, platform } = yield* onGoogle();

          api.add(
            review(1, {
              reply: {
                comment: "Thanks!",
                updateTime: "2026-11-14T09:00:00Z",
              },
            }),
            review(2)
          );

          const there = yield* platform.resume(account, {
            platformReviewId: reviewName(1),
            text: "Thanks!",
          });

          assert.strictEqual(there._tag, "sent");
          assert.isFalse(api.requests().some(({ method }) => method === "PUT"));

          const absent = yield* platform.resume(account, {
            platformReviewId: reviewName(2),
            text: "Thanks!",
          });

          assert.strictEqual(absent._tag, "sent");
          assert.strictEqual(api.review("r2")?.reply?.comment, "Thanks!");

          api.lose(`GET /v4/${reviewName(1)}`);

          assert.deepStrictEqual(
            yield* platform.resume(account, {
              platformReviewId: reviewName(1),
              text: "Thanks!",
            }),
            { _tag: "unconfirmed", reason: "interrupted" }
          );
        })
      )
  );

  it.effect(
    "reads one review back, sending nothing: its reply, none, the review gone, or nothing it can tell",
    () =>
      Effect.scoped(
        Effect.gen(function* checks() {
          const { account, api, platform } = yield* onGoogle();

          api.add(
            review(1, {
              reply: { comment: "Thanks!", updateTime: "2026-11-14T09:00:00Z" },
            }),
            review(2)
          );

          const replied = yield* platform.check(account, reviewName(1));

          assert.deepStrictEqual(
            replied._tag === "found"
              ? replied.reply.pipe(Option.map(({ text }) => text))
              : undefined,
            Option.some("Thanks!")
          );
          assert.deepStrictEqual(
            yield* platform.check(account, reviewName(2)),
            {
              _tag: "found",
              reply: Option.none(),
            }
          );
          assert.deepStrictEqual(
            yield* platform.check(account, `${fakeLocation}/reviews/gone`),
            { _tag: "gone" }
          );

          api.lose(`GET /v4/${reviewName(1)}`);

          assert.deepStrictEqual(
            yield* platform.check(account, reviewName(1)),
            {
              _tag: "unknown",
            }
          );
          assert.isFalse(api.requests().some(({ method }) => method !== "GET"));
        })
      )
  );

  it.effect(
    "deletes the location's reply, and takes a reply already gone for done",
    () =>
      Effect.scoped(
        Effect.gen(function* withdraws() {
          const { account, api, platform } = yield* onGoogle();

          api.add(
            review(1, {
              reply: { comment: "Thanks!", updateTime: "2026-11-14T09:00:00Z" },
            })
          );

          assert.deepStrictEqual(
            yield* platform.withdraw(account, reviewName(1)),
            { _tag: "done" }
          );
          assert.strictEqual(api.review("r1")?.reply, undefined);
          assert.deepStrictEqual(
            yield* platform.withdraw(account, `${fakeLocation}/reviews/gone`),
            { _tag: "done" }
          );

          api.script(`DELETE /v4/${reviewName(1)}/reply`, [
            businessError(503, "UNAVAILABLE"),
          ]);

          assert.deepStrictEqual(
            yield* platform.withdraw(account, reviewName(1)),
            { _tag: "failed", reason: "platformUnavailable" }
          );
        })
      )
  );
});
