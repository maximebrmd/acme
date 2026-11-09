import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { Ids, newId } from "#shared/application/ids.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";

describe("the test Ids layer", () => {
  it.effect("issues ids that count up from 1", () =>
    Effect.gen(function* countsUp() {
      const ids = yield* Ids;

      assert.strictEqual(
        yield* ids.next,
        "00000000-0000-7000-8000-000000000001"
      );
      assert.strictEqual(
        yield* ids.next,
        "00000000-0000-7000-8000-000000000002"
      );
    }).pipe(Effect.provide(Ids.layerTest))
  );

  it.effect("starts again from 1 in each build of the layer", () =>
    Effect.gen(function* startsAgain() {
      const first = yield* Ids.use((ids) => ids.next).pipe(
        Effect.provide(Ids.layerTest)
      );

      const again = yield* Ids.use((ids) => ids.next).pipe(
        Effect.provide(Ids.layerTest)
      );

      assert.strictEqual(again, first);
    })
  );
});

describe(newId, () => {
  it.effect("issues an id of the kind asked for", () =>
    Effect.gen(function* issuesPostId() {
      const postId = yield* newId(PostIdSchema);

      assert.isTrue(Schema.is(PostIdSchema)(postId));
      assert.strictEqual(postId, "00000000-0000-7000-8000-000000000001");
    }).pipe(Effect.provide(Ids.layerTest))
  );
});
