import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { FetchHttpClient } from "effect/http";

import {
  loadSharp,
  makeSharpImageProbe,
} from "#media/infrastructure/sharp-image-probe.ts";

describe(makeSharpImageProbe, () => {
  it.effect("loads sharp where its prebuilt binary runs", () =>
    Effect.gen(function* loads() {
      assert.isTrue(Option.isSome(yield* loadSharp));
    })
  );

  it.effect(
    "skips images, without fetching them, when sharp did not load",
    () =>
      Effect.gen(function* skips() {
        const probe = yield* makeSharpImageProbe(Option.none());

        // Nothing listens on port 1: a fetch would fail the probe.
        const outcome = yield* probe({
          contentType: "image/png",
          url: "http://127.0.0.1:1/never-fetched.png",
        });

        assert.deepStrictEqual(outcome, {
          _tag: "skipped",
          reason: "probeUnavailable",
        });
      }).pipe(Effect.provide(FetchHttpClient.layer))
  );
});
