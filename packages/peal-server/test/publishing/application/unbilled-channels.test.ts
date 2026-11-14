import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { unbilledOn } from "#publishing/application/post-checks.ts";
import { PostMeter } from "#publishing/application/post-meter.ts";
import type { MeteredPart } from "#publishing/application/post-meter.ts";
import { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { contentOf } from "#test/publishing/support.ts";

// Scheduling warns of the post's channels on X the billing account
// cannot pay for now, every X part counted together.

const workspaceId = WorkspaceIdSchema.make(
  "6f1c1b8e-2f5a-4c3e-9d7b-0a1b2c3d4e5f"
);

const x = ChannelIdSchema.make("01900000-0000-7000-8000-000000000001");
const mastodon = ChannelIdSchema.make("01900000-0000-7000-8000-000000000002");

// A meter with no room for anything, keeping what it was asked.
const asked = Ref.makeUnsafe<readonly MeteredPart[]>([]);

const FullMeter = Layer.succeed(
  PostMeter,
  PostMeter.of({
    claim: () => Effect.succeedNone,
    fits: (parts) =>
      Ref.set(asked, parts).pipe(
        Effect.as(
          Option.some(
            new AllowanceReached({
              allowed: 0,
              meter: "xApi",
              reason: "ceilingReached",
              resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
              used: 0,
            })
          )
        )
      ),
    giveBack: () => Effect.void,
  })
);

describe(unbilledOn, () => {
  it.effect(
    "names the post's X channels and why, asking for every X part",
    () =>
      Effect.gen(function* warns() {
        const unbilled = yield* unbilledOn(
          workspaceId,
          [
            { channelId: x, platform: "x" },
            { channelId: mastodon, platform: "mastodon" },
          ],
          contentOf("We shipped it")
        );

        assert.deepStrictEqual(
          unbilled,
          Option.some({ channelIds: [x], reason: "ceilingReached" as const })
        );
        assert.deepStrictEqual(
          (yield* Ref.get(asked)).map(({ platform, text }) => [platform, text]),
          [["x", "We shipped it"]]
        );
      }).pipe(Effect.provide(FullMeter))
  );

  it.effect("asks nothing of a post with no channel on X", () =>
    Effect.gen(function* none() {
      yield* Ref.set(asked, []);

      const unbilled = yield* unbilledOn(
        workspaceId,
        [{ channelId: mastodon, platform: "mastodon" }],
        contentOf("We shipped it")
      );

      assert.isTrue(Option.isNone(unbilled));
      assert.lengthOf(yield* Ref.get(asked), 0);
    }).pipe(Effect.provide(FullMeter))
  );
});
