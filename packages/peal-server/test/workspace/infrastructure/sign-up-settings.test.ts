import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Result } from "effect";

import { signUpModeConfig } from "#workspace/infrastructure/sign-up-settings.ts";

// `PEAL_SIGN_UP`, read once when the server starts: anyone may sign up
// unless the operator asks for invitations, and any other value stops it.

const read = (env: Record<string, string>) =>
  signUpModeConfig.pipe(
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    Effect.result
  );

describe("who may sign up", () => {
  it.effect("is anyone unless set", () =>
    Effect.gen(function* open() {
      assert.deepStrictEqual(yield* read({}), Result.succeed("open"));
      assert.deepStrictEqual(
        yield* read({ PEAL_SIGN_UP: "open" }),
        Result.succeed("open")
      );
    })
  );

  it.effect("is the invited, when the operator asks", () =>
    Effect.gen(function* invitation() {
      assert.deepStrictEqual(
        yield* read({ PEAL_SIGN_UP: "invitation" }),
        Result.succeed("invitation")
      );
    })
  );

  it.effect("stops the server for any other value", () =>
    Effect.gen(function* unknown() {
      assert.isTrue(Result.isFailure(yield* read({ PEAL_SIGN_UP: "closed" })));
      assert.isTrue(Result.isFailure(yield* read({ PEAL_SIGN_UP: "Open" })));
    })
  );
});
