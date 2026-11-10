import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Layer, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { pacedLookups } from "#publishing/application/paced-lookups.ts";
import { PlatformLookups } from "#publishing/application/platform-lookups.ts";
import type { LookupFailure } from "#publishing/application/platform-lookups.ts";
import {
  lookupAnswerLifetime,
  lookupRunsPerMinute,
} from "#publishing/domain/lookup.ts";
import type { LookupQuery } from "#publishing/domain/lookup.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";

const first = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000e1");
const second = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000e2");

const boards = (cursor?: string): LookupQuery => ({
  _tag: "pinterestBoards",
  cursor: Option.fromUndefinedOr(cursor),
  limit: 25,
});

// The paced lookups over a platform that counts what reaches it, and
// answers each query with its number, or fails with `failure`.
const paced = Effect.fn("test.paced")(function* paced(failure?: LookupFailure) {
  const reached = yield* Ref.make(0);

  const lookups = yield* PlatformLookups.pipe(
    Effect.provide(
      pacedLookups(
        Layer.succeed(
          PlatformLookups,
          PlatformLookups.of({
            run: () =>
              Ref.updateAndGet(reached, (count) => count + 1).pipe(
                Effect.flatMap((count) =>
                  failure === undefined
                    ? Effect.succeed({
                        _tag: "pinterestBoards" as const,
                        items: [
                          {
                            id: String(count),
                            name: `Board ${String(count)}`,
                            privacy: Option.none(),
                          },
                        ],
                        nextCursor: Option.none(),
                      })
                    : Effect.fail(failure)
                )
              ),
          })
        )
      )
    )
  );

  return { lookups, reached: Ref.get(reached) };
});

describe("a channel's lookups, paced", () => {
  it.effect(
    "give an answer again to the same query for a minute, without asking the platform",
    () =>
      Effect.gen(function* kept() {
        const { lookups, reached } = yield* paced();

        const asked = yield* lookups.run(first, boards());

        yield* TestClock.adjust(Duration.seconds(59));

        assert.deepStrictEqual(yield* lookups.run(first, boards()), asked);
        assert.strictEqual(yield* reached, 1);

        // Another page, and another channel, are other queries.
        yield* lookups.run(first, boards("page-2"));
        yield* lookups.run(second, boards());

        assert.strictEqual(yield* reached, 3);

        // Past its lifetime, the platform is asked again.
        yield* TestClock.adjust(lookupAnswerLifetime);

        assert.notDeepEqual(yield* lookups.run(first, boards()), asked);
        assert.strictEqual(yield* reached, 4);
      })
  );

  it.effect(
    "let a channel reach its platform so many times a minute, and say when to ask again",
    () =>
      Effect.gen(function* limited() {
        const { lookups, reached } = yield* paced();

        const page = (number: number) =>
          lookups.run(first, boards(`page-${String(number)}`));

        for (let run = 0; run < lookupRunsPerMinute; run += 1) {
          yield* page(run);
          yield* TestClock.adjust(Duration.seconds(1));
        }

        // Thirty seconds went by since the first run.
        assert.deepStrictEqual(
          yield* Effect.flip(page(lookupRunsPerMinute)),
          new RateLimited({
            code: "lookupPace",
            retryAfter: Duration.seconds(60 - lookupRunsPerMinute),
          })
        );
        assert.strictEqual(yield* reached, lookupRunsPerMinute);

        // Another channel is not held back, and an answer kept still comes.
        yield* lookups.run(second, boards());
        yield* page(lookupRunsPerMinute - 1);

        // Once the first run is a minute old, there is room for one more.
        yield* TestClock.adjust(Duration.seconds(60 - lookupRunsPerMinute));
        yield* page(lookupRunsPerMinute);

        assert.strictEqual(yield* reached, lookupRunsPerMinute + 2);
      })
  );

  it.effect("keep no failure: the platform is asked again at once", () =>
    Effect.gen(function* failing() {
      const { lookups, reached } = yield* paced(new PlatformUnavailable());

      for (const _attempt of [1, 2]) {
        assert.deepStrictEqual(
          yield* Effect.flip(lookups.run(first, boards())),
          new PlatformUnavailable()
        );
      }

      assert.strictEqual(yield* reached, 2);
    })
  );
});
