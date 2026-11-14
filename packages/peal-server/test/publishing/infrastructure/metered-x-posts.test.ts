import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Ref } from "effect";

import { XPassThrough } from "#billing/application/x-pass-through.ts";
import { rateCard } from "#billing/domain/rate-card.ts";
import { PostMeter } from "#publishing/application/post-meter.ts";
import { MeteredXPostsLive } from "#publishing/infrastructure/metered-x-posts.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { FakeMetersLedger, fakeMeters } from "#test/shared/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "6f1c1b8e-2f5a-4c3e-9d7b-0a1b2c3d4e5f"
);

const XRatesTest = Layer.succeed(
  XPassThrough,
  XPassThrough.of({
    rates: rateCard.x.rates,
    readsOf: () => Effect.succeedNone,
    readsOn: () => Effect.succeed(false),
    setReads: () => Effect.die("not set in this test"),
  })
);

const claimed = FakeMetersLedger.use(Ref.get).pipe(
  Effect.map(({ claims }) => claims.map(({ meter, units }) => [meter, units]))
);

layer(
  MeteredXPostsLive.pipe(
    Layer.provideMerge(
      Layer.merge(fakeMeters({ allowed: Option.none() }), XRatesTest)
    )
  )
)("the posts X bills", (it) => {
  it.effect(
    "claim X's rate for a post, its rate with a link for one with a link, and nothing elsewhere",
    () =>
      Effect.gen(function* rates() {
        const meter = yield* PostMeter;

        yield* meter.claim({
          platform: "x",
          text: "We shipped it",
          workspaceId,
        });
        yield* meter.claim({
          platform: "x",
          text: "Read it at https://example.com/launch",
          workspaceId,
        });

        const elsewhere = yield* meter.claim({
          platform: "mastodon",
          text: "Read it at https://example.com/launch",
          workspaceId,
        });

        assert.isTrue(Option.isNone(elsewhere));
        assert.deepStrictEqual(yield* claimed, [
          ["xApi", 15],
          ["xApi", 200],
        ]);
      })
  );
});

layer(
  MeteredXPostsLive.pipe(
    Layer.provideMerge(
      Layer.merge(fakeMeters({ allowed: Option.some(30) }), XRatesTest)
    )
  )
)("the room of a thread X bills", (it) => {
  it.effect("fits the parts the meter has room for, and refuses one more", () =>
    Effect.gen(function* room() {
      const meter = yield* PostMeter;
      const part = { platform: "x" as const, text: "A part", workspaceId };

      assert.isTrue(Option.isNone(yield* meter.fits([part, part])));

      const refused = yield* meter.fits([part, part, part]);

      assert.deepInclude(Option.getOrUndefined(refused), {
        allowed: 30,
        meter: "xApi",
        reason: "ceilingReached",
      });
      assert.deepStrictEqual(yield* claimed, []);
    })
  );
});
