import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Result } from "effect";

import { inboxPlatformsConfig } from "#shared/infrastructure/inbox-platforms.ts";

// `PEAL_INBOX_PLATFORMS`, read once when the server starts: the platforms
// whose comments wait for Meta's review are off unless named, and a name
// the server cannot serve stops it.

const metaApp = {
  META_APP_ID: "100000000000001",
  META_APP_SECRET: "synthetic-meta-secret",
};

const instagramApp = {
  INSTAGRAM_APP_ID: "100000000000002",
  INSTAGRAM_APP_SECRET: "synthetic-instagram-secret",
};

const read = (env: Record<string, string>) =>
  inboxPlatformsConfig.pipe(
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    Effect.map((platforms) => [...platforms].toSorted()),
    Effect.result
  );

describe("the inbox's optional platforms", () => {
  it.effect("are off unless named", () =>
    Effect.gen(function* off() {
      assert.deepStrictEqual(yield* read({}), Result.succeed([]));
      assert.deepStrictEqual(
        yield* read({ ...metaApp, PEAL_INBOX_PLATFORMS: " " }),
        Result.succeed([])
      );
    })
  );

  it.effect("are those named, with the apps they sign in with", () =>
    Effect.gen(function* named() {
      assert.deepStrictEqual(
        yield* read({
          ...metaApp,
          PEAL_INBOX_PLATFORMS: "facebook, instagram",
        }),
        Result.succeed(["facebook", "instagram"])
      );
      // Instagram's own app is a way in of its own.
      assert.deepStrictEqual(
        yield* read({ ...instagramApp, PEAL_INBOX_PLATFORMS: "instagram" }),
        Result.succeed(["instagram"])
      );
    })
  );

  it.effect("stop the server for a name it does not know", () =>
    Effect.gen(function* unknown() {
      const refused = yield* read({
        ...metaApp,
        PEAL_INBOX_PLATFORMS: "mastodon",
      });

      assert.isTrue(Result.isFailure(refused));
      assert.isTrue(
        Result.isFailure(
          yield* read({ ...metaApp, PEAL_INBOX_PLATFORMS: "facebook,threads" })
        )
      );
    })
  );

  it.effect("stop the server for a platform without its app", () =>
    Effect.gen(function* withoutApp() {
      assert.isTrue(
        Result.isFailure(
          yield* read({ ...instagramApp, PEAL_INBOX_PLATFORMS: "facebook" })
        )
      );
      assert.isTrue(
        Result.isFailure(yield* read({ PEAL_INBOX_PLATFORMS: "instagram" }))
      );
    })
  );
});
