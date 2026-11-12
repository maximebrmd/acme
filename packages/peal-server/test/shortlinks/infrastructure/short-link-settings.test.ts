import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Exit, Option } from "effect";

import { shortLinkBaseConfig } from "#shortlinks/infrastructure/short-link-settings.ts";

const read = (env: Readonly<Record<string, string>>) =>
  shortLinkBaseConfig.pipe(
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    Effect.exit
  );

describe("where short links live", () => {
  it.effect("is off when unset or blank", () =>
    Effect.gen(function* off() {
      for (const env of [{}, { PEAL_SHORT_LINK_BASE: " " }]) {
        const exit = yield* read(env);

        assert.isTrue(Exit.isSuccess(exit) && Option.isNone(exit.value));
      }
    })
  );

  it.effect("takes an address on a public domain, ending in /", () =>
    Effect.gen(function* taken() {
      for (const base of [
        "https://go.example.com/",
        "https://peal.example.com/api/l/",
      ]) {
        const exit = yield* read({ PEAL_SHORT_LINK_BASE: base });

        assert.isTrue(Exit.isSuccess(exit) && Option.isSome(exit.value), base);
      }
    })
  );

  it.effect(
    "refuses a host the platforms' link rules do not take for a link",
    () =>
      Effect.gen(function* refused() {
        for (const base of [
          "http://localhost:3001/api/l/",
          "https://10.0.0.5/api/l/",
          "https://links/",
          "https://links.internal/",
        ]) {
          const exit = yield* read({ PEAL_SHORT_LINK_BASE: base });

          assert.isTrue(Exit.isFailure(exit), base);
        }
      })
  );

  it.effect("refuses an address that does not end in /", () =>
    Effect.gen(function* noSlash() {
      const exit = yield* read({
        PEAL_SHORT_LINK_BASE: "https://go.example.com",
      });

      assert.isTrue(Exit.isFailure(exit));
    })
  );
});
