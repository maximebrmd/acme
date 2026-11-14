import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Option, Result } from "effect";
import { TestClock } from "effect/testing";

import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import {
  CollectReviews,
  ReviewsPaceRef,
} from "#engagement/application/collect-reviews.ts";
import { EngagementReviews } from "#engagement/application/engagement-reviews.ts";
import { PurgeReviews } from "#engagement/application/purge-reviews.ts";
import { SendReviewReply } from "#engagement/application/send-review-reply.ts";
import { beginReviewReply } from "#engagement/domain/review-reply.ts";
import type { ReviewReading } from "#engagement/domain/review.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import {
  locationChannel,
  makeReviewWorld,
} from "#test/engagement/fakes/review-world.ts";
import type { ReviewWorld } from "#test/engagement/fakes/review-world.ts";
import {
  channelId,
  memberId,
  reviewedAt,
  reviewReading,
  workspaceId,
} from "#test/engagement/support.ts";

// The reviews of a workspace's locations, on memory: what the hourly
// collection keeps, what members see and send, and how a reply's job ends.

const actorWith = (permissions: readonly Permission[]) =>
  new Actor({
    permissions: [...permissions],
    subject: { _tag: "user", impersonatedBy: Option.none(), userId: memberId },
    workspaceId,
  });

const editor = actorWith(["engagement:read", "engagement:reply"]);

// An API key, and an application acting for the member, with the same
// permissions: neither answers a review, as Google's policies ask that
// replies follow the user's own consent.
const apiKey = new Actor({
  permissions: ["engagement:read", "engagement:reply"],
  subject: { _tag: "apiKey", apiKeyId: "key_synthetic_1" },
  workspaceId,
});

const application = new Actor({
  permissions: ["engagement:read", "engagement:reply"],
  subject: {
    _tag: "user",
    clientId: "synthetic-mcp-client",
    impersonatedBy: Option.none(),
    userId: memberId,
  },
  workspaceId,
});

const viewer = actorWith(["engagement:read"]);

const at = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  TestClock.setTime(DateTime.toEpochMillis(reviewedAt)).pipe(
    Effect.andThen(effect)
  );

const located = (world: ReviewWorld = makeReviewWorld()) => {
  world.state.locations.push({ channelId: channelId(1), workspaceId });
  world.state.channels.set(channelId(1), locationChannel);

  return world;
};

const reading =
  (reviews: readonly ReviewReading[], complete = true) =>
  () =>
    Effect.succeed({
      averageRating: Option.some(4.5),
      complete,
      reviews,
      totalReviewCount: Option.some(reviews.length),
    });

const collect = CollectReviews.use((collecting) => collecting.run(reviewedAt));

const onlyThread = (world: ReviewWorld) => {
  const [thread] = [...world.state.threads.values()];

  if (thread === undefined) {
    throw new Error("no thread");
  }

  return thread;
};

const onlyReview = (world: ReviewWorld) => {
  const [review] = [...world.state.reviews.values()];

  if (review === undefined) {
    throw new Error("no review");
  }

  return review;
};

describe("the reviews' collection", () => {
  it.effect(
    "follows nothing and calls nothing while the inbox does not read Google Business Profile",
    () => {
      const world = located(makeReviewWorld(new Set()));

      return at(
        Effect.gen(function* off() {
          const report = yield* collect;

          assert.strictEqual(report.followed, 0);
          assert.strictEqual(world.state.threads.size, 0);
          assert.lengthOf(world.state.reads, 0);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "follows a location once, reads its reviews back to the oldest Peal may keep, and tells of each new one",
    () => {
      const world = located();

      world.state.read = reading([reviewReading(1), reviewReading(2)]);

      return at(
        Effect.gen(function* reads() {
          const report = yield* collect;

          assert.strictEqual(report.followed, 1);
          assert.strictEqual(report.read, 1);
          assert.strictEqual(world.state.reviews.size, 2);
          assert.deepStrictEqual(
            world.state.reads[0]?.keptSince,
            DateTime.subtractDuration(reviewedAt, "29 days")
          );

          const [told] = world.state.received;

          assert.strictEqual(told?.reviews.length, 2);

          const thread = onlyThread(world);

          assert.deepStrictEqual(thread.averageRating, Option.some(4.5));
          // A review this week: the next read is in an hour.
          assert.deepStrictEqual(
            thread.nextReadAt,
            DateTime.addDuration(reviewedAt, "1 hour")
          );

          // Read again: nothing new is told, nothing is kept twice.
          yield* CollectReviews.use((collecting) =>
            collecting.run(DateTime.addDuration(reviewedAt, "1 hour"))
          );

          assert.strictEqual(report.followed, 1);
          assert.strictEqual(world.state.reviews.size, 2);
          assert.lengthOf(world.state.received, 1);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("deletes a review a complete read no longer finds", () => {
    const world = located();

    world.state.read = reading([reviewReading(1), reviewReading(2)]);

    return at(
      Effect.gen(function* deleted() {
        yield* collect;

        world.state.read = reading([reviewReading(2)], false);
        yield* CollectReviews.use((collecting) =>
          collecting.run(DateTime.addDuration(reviewedAt, "1 hour"))
        );

        assert.strictEqual(world.state.reviews.size, 2);

        world.state.read = reading([reviewReading(2)]);
        yield* CollectReviews.use((collecting) =>
          collecting.run(DateTime.addDuration(reviewedAt, "2 hours"))
        );

        assert.deepStrictEqual(
          [...world.state.reviews.values()].map(({ text }) => text),
          ["Review 2"]
        );
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "puts a location off while Google is down, and longer while its channel cannot be read",
    () => {
      const world = located();

      world.state.read = () => Effect.fail(new PlatformUnavailable());

      return at(
        Effect.gen(function* putOff() {
          const report = yield* collect;

          assert.strictEqual(report.deferred, 1);
          assert.deepStrictEqual(
            onlyThread(world).nextReadAt,
            DateTime.addDuration(reviewedAt, "1 hour")
          );

          world.state.read = () =>
            Effect.fail(new ChannelUnreadable({ reason: "paused" }));

          const later = DateTime.addDuration(reviewedAt, "1 hour");

          yield* CollectReviews.use((collecting) => collecting.run(later));

          assert.deepStrictEqual(
            onlyThread(world).nextReadAt,
            DateTime.addDuration(later, "6 hours")
          );

          world.state.read = () =>
            Effect.fail(new ChannelUnreadable({ reason: "disconnected" }));

          const latest = DateTime.addDuration(later, "6 hours");

          yield* CollectReviews.use((collecting) => collecting.run(latest));

          // Gone with its channel; a channel still listed is followed anew.
          assert.isFalse(
            [...world.state.threads.values()].some(
              ({ nextReadAt }) =>
                DateTime.toEpochMillis(nextReadAt) >
                DateTime.toEpochMillis(latest)
            )
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

const withReview = (changed: Partial<ReviewReading> = {}) => {
  const world = located();

  world.state.read = reading([reviewReading(1, changed)]);

  return world;
};

describe("the reviews' collection, paced by Google", () => {
  it.effect(
    "stops a run once Google asks to slow down, and puts the location off as long as Google says",
    () => {
      const world = located();

      world.state.locations.push({ channelId: channelId(2), workspaceId });
      world.state.channels.set(channelId(2), locationChannel);
      world.state.read = () =>
        Effect.fail(new RateLimited({ retryAfter: Duration.hours(3) }));

      return at(
        Effect.gen(function* paced() {
          const report = yield* collect.pipe(
            Effect.provideService(ReviewsPaceRef, {
              budget: Duration.minutes(40),
              concurrency: 1,
              pageSize: 500,
            })
          );

          // The first read was refused: the second was not asked.
          assert.lengthOf(world.state.reads, 1);
          assert.strictEqual(report.deferred, 1);
          assert.strictEqual(report.left, 1);

          const limited = [...world.state.threads.values()].find(
            ({ channelId: id }) => id === world.state.reads[0]?.channelId
          );

          assert.deepStrictEqual(
            limited?.nextReadAt,
            DateTime.addDuration(reviewedAt, "3 hours")
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

describe("members and the reviews", () => {
  it.effect(
    "list the locations whose reviews wait, and show one whole with what its channel can do",
    () => {
      const world = withReview();

      return at(
        Effect.gen(function* lists() {
          yield* collect;

          const page = yield* EngagementReviews.use((reviews) =>
            reviews.threads(
              viewer,
              { channelId: Option.none(), unanswered: true },
              { after: Option.none(), limit: 30 }
            )
          );

          assert.strictEqual(page.threads.length, 1);
          assert.strictEqual(page.threads[0]?.unanswered, 1);

          const detail = yield* EngagementReviews.use((reviews) =>
            reviews.thread(viewer, onlyThread(world).id)
          );

          assert.strictEqual(detail.reviews.length, 1);
          assert.deepStrictEqual(detail.abilities, {
            read: "available",
            reply: "available",
            withdraw: "available",
          });
          assert.deepStrictEqual(
            detail.platform,
            Option.some("googleBusiness")
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "journal a reply with the start of its job, and refuse a second while it is on its way",
    () => {
      const world = withReview();

      return at(
        Effect.gen(function* replies() {
          yield* collect;

          const review = onlyReview(world);

          const reply = yield* EngagementReviews.use((reviews) =>
            reviews.reply(editor, review.id, "  Thank you for coming!  ")
          );

          assert.strictEqual(reply.text, "Thank you for coming!");
          assert.deepStrictEqual(world.state.jobs, [reply.id]);
          assert.lengthOf(world.state.sent, 0);

          const second = yield* EngagementReviews.use((reviews) =>
            reviews.reply(editor, review.id, "Again")
          ).pipe(Effect.flip);

          assert.strictEqual(second._tag, "ReviewReplyPending");
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "refuse an empty reply, one past Google's 4096 bytes, and a member who may only read",
    () => {
      const world = withReview();

      return at(
        Effect.gen(function* refusals() {
          yield* collect;

          const review = onlyReview(world);

          const refused = (actor: Actor, text: string) =>
            EngagementReviews.use((reviews) =>
              reviews.reply(actor, review.id, text)
            ).pipe(
              Effect.flip,
              Effect.map(({ _tag }) => _tag)
            );

          assert.strictEqual(yield* refused(editor, "   "), "ReplyEmpty");
          assert.strictEqual(
            yield* refused(editor, "é".repeat(2049)),
            "ReplyTooLong"
          );
          assert.strictEqual(
            yield* refused(viewer, "Thanks"),
            "MissingPermission"
          );
          assert.lengthOf(world.state.jobs, 0);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "cannot answer where the inbox does not read reviews, nor without the scope",
    () => {
      const world = withReview();

      return at(
        Effect.gen(function* unable() {
          yield* collect;

          const review = onlyReview(world);

          world.state.channels.set(channelId(1), {
            ...locationChannel,
            scopes: [],
          });

          const refused = yield* EngagementReviews.use((reviews) =>
            reviews.reply(editor, review.id, "Thanks")
          ).pipe(Effect.flip);

          assert.deepStrictEqual(refused._tag, "AbilityUnavailable");
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "say a review needs no answer, and withdraw the location's reply",
    () => {
      const world = withReview({
        reply: Option.some({
          moderation: Option.some("approved"),
          text: "Thanks!",
          updatedAt: reviewedAt,
        }),
      });

      return at(
        Effect.gen(function* acts() {
          yield* collect;

          const review = onlyReview(world);

          const withdrawn = yield* EngagementReviews.use((reviews) =>
            reviews.withdraw(editor, review.id)
          );

          assert.deepStrictEqual(withdrawn.reply, Option.none());
          assert.deepStrictEqual(world.state.withdrawn, [
            { channelId: channelId(1), reviewId: review.id },
          ]);

          const marked = yield* EngagementReviews.use((reviews) =>
            reviews.setAnswered(editor, review.id, true)
          );

          assert.isTrue(Option.isSome(marked.answeredAt));

          world.state.withdrawal = { _tag: "failed", reason: "rateLimited" };

          // Nothing left to delete: Google is not asked again.
          yield* EngagementReviews.use((reviews) =>
            reviews.withdraw(editor, review.id)
          );

          assert.lengthOf(world.state.withdrawn, 1);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

const journalled = (world: ReviewWorld) =>
  Effect.gen(function* journalling() {
    world.state.read = reading([reviewReading(1)]);
    yield* collect;

    return yield* EngagementReviews.use((reviews) =>
      reviews.reply(editor, onlyReview(world).id, "Thank you!")
    );
  });

describe("a reply's text", () => {
  it.effect(
    "is kept without a control character a platform or a terminal would act on",
    () => {
      const world = withReview();

      return at(
        Effect.gen(function* cleans() {
          yield* collect;

          const reply = yield* EngagementReviews.use((reviews) =>
            reviews.reply(
              editor,
              onlyReview(world).id,
              `Thanks${String.fromCodePoint(0x1b)}[2J for${String.fromCodePoint(0)} coming`
            )
          );

          assert.strictEqual(reply.text, "Thanks[2J for coming");
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

describe("replying to reviews in person", () => {
  it.effect(
    "refuses an API key and an application a reply or a deleted reply, and lets them read and mark",
    () => {
      const world = withReview({
        reply: Option.some({
          moderation: Option.some("approved"),
          text: "Thanks!",
          updatedAt: reviewedAt,
        }),
      });

      return at(
        Effect.gen(function* refusals() {
          yield* collect;

          const review = onlyReview(world);

          for (const actor of [apiKey, application]) {
            const replied = yield* EngagementReviews.use((reviews) =>
              reviews.reply(actor, review.id, "Thanks")
            ).pipe(Effect.flip);

            const withdrawn = yield* EngagementReviews.use((reviews) =>
              reviews.withdraw(actor, review.id)
            ).pipe(Effect.flip);

            assert.strictEqual(replied._tag, "ReviewReplyNeedsPerson");
            assert.strictEqual(withdrawn._tag, "ReviewReplyNeedsPerson");

            yield* EngagementReviews.use((reviews) =>
              reviews.thread(actor, review.threadId)
            );
            yield* EngagementReviews.use((reviews) =>
              reviews.setAnswered(actor, review.id, true)
            );
          }

          assert.lengthOf(world.state.jobs, 0);
          assert.lengthOf(world.state.withdrawn, 0);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

describe("a reply's job", () => {
  it.effect(
    "sends once, and the review holds the reply Google answered",
    () => {
      const world = located();

      world.state.sending = {
        _tag: "sent",
        reply: {
          moderation: Option.some("pending"),
          text: "Thank you!",
          updatedAt: reviewedAt,
        },
      };

      return at(
        Effect.gen(function* sends() {
          const reply = yield* journalled(world);

          assert.strictEqual(
            yield* SendReviewReply.use((sending) => sending.run(reply.id)),
            "settled"
          );
          assert.strictEqual(
            yield* SendReviewReply.use((sending) => sending.run(reply.id)),
            "superseded"
          );
          assert.lengthOf(world.state.sent, 1);
          assert.strictEqual(
            world.state.replies.get(reply.id)?.status._tag,
            "sent"
          );
          assert.deepStrictEqual(
            onlyReview(world).reply.pipe(Option.map(({ text }) => text)),
            Option.some("Thank you!")
          );
          assert.deepStrictEqual(
            world.state.replied.map(({ id }) => id),
            [reply.id]
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "leaves a reply whose call got no answer to the next read, which settles it",
    () => {
      const world = located();

      world.state.sending = { _tag: "unconfirmed", reason: "noResponse" };

      return at(
        Effect.gen(function* doubts() {
          const reply = yield* journalled(world);

          yield* SendReviewReply.use((sending) => sending.run(reply.id));

          assert.strictEqual(
            world.state.replies.get(reply.id)?.status._tag,
            "unconfirmed"
          );
          // Brought forward to the next run.
          assert.deepStrictEqual(onlyThread(world).nextReadAt, reviewedAt);

          world.state.read = reading([
            reviewReading(1, {
              reply: Option.some({
                moderation: Option.none(),
                text: "Thank you!",
                updatedAt: reviewedAt,
              }),
            }),
          ]);

          yield* CollectReviews.use((collecting) =>
            collecting.run(DateTime.addDuration(reviewedAt, "1 hour"))
          );

          assert.strictEqual(
            world.state.replies.get(reply.id)?.status._tag,
            "sent"
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "reads the review back when an earlier run may have called Google",
    () => {
      const world = located();

      world.state.sending = { _tag: "unconfirmed", reason: "interrupted" };
      world.state.resuming = {
        _tag: "sent",
        reply: {
          moderation: Option.none(),
          text: "Thank you!",
          updatedAt: reviewedAt,
        },
      };

      return at(
        Effect.gen(function* resumes() {
          const reply = yield* journalled(world);

          // A run that set out, then stopped before it recorded anything.
          world.state.replies.set(
            reply.id,
            Result.getOrThrow(beginReviewReply(reply, reviewedAt))
          );

          yield* SendReviewReply.use((sending) => sending.run(reply.id));

          assert.lengthOf(world.state.sent, 0);
          assert.lengthOf(world.state.resumed, 1);
          assert.strictEqual(
            world.state.replies.get(reply.id)?.status._tag,
            "sent"
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "hands a reply no job settled to the next read, and stops its job",
    () => {
      const world = located();

      return at(
        Effect.gen(function* stranded() {
          const reply = yield* journalled(world);

          yield* TestClock.adjust("2 hours");

          assert.strictEqual(
            yield* SendReviewReply.use((sending) => sending.settleStranded),
            1
          );
          assert.deepStrictEqual(world.state.cancelled, [reply.id]);
          assert.strictEqual(
            world.state.replies.get(reply.id)?.status._tag,
            "unconfirmed"
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

describe("the reviews' retention", () => {
  it.effect("forgets a review 29 days after it was last changed", () => {
    const world = located();

    world.state.read = reading([reviewReading(1)]);

    return at(
      Effect.gen(function* forgets() {
        yield* collect;
        yield* TestClock.adjust("28 days");

        assert.strictEqual(
          (yield* PurgeReviews.use((purging) => purging.purge)).reviews,
          0
        );

        yield* TestClock.adjust("2 days");

        const purged = yield* PurgeReviews.use((purging) => purging.purge);

        assert.strictEqual(purged.reviews, 1);
        // Nor read since: the location's thread goes too.
        assert.strictEqual(purged.threads, 1);
        assert.strictEqual(world.state.reviews.size, 0);
      })
    ).pipe(Effect.provide(world.layer));
  });
});
