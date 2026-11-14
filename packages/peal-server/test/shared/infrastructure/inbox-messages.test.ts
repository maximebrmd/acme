import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Result } from "effect";

import { inboxMessagesConfig } from "#shared/infrastructure/inbox-messages.ts";

// `PEAL_INBOX_MESSAGES`, read once when the server starts: direct
// messages are private correspondence, read on no platform unless named,
// and a name the inbox cannot read stops the server.

const read = (env: Record<string, string>) =>
  inboxMessagesConfig.pipe(
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    Effect.map((platforms) => [...platforms].toSorted()),
    Effect.result
  );

describe("the inbox's direct messages", () => {
  it.effect("are read on no platform unless named", () =>
    Effect.gen(function* off() {
      assert.deepStrictEqual(yield* read({}), Result.succeed([]));
      assert.deepStrictEqual(
        yield* read({ PEAL_INBOX_MESSAGES: " , " }),
        Result.succeed([])
      );
    })
  );

  it.effect("are read on the platforms named", () =>
    Effect.gen(function* named() {
      assert.deepStrictEqual(
        yield* read({ PEAL_INBOX_MESSAGES: "mastodon" }),
        Result.succeed(["mastodon"])
      );
      assert.deepStrictEqual(
        yield* read({ PEAL_INBOX_MESSAGES: " bluesky , mastodon " }),
        Result.succeed(["bluesky", "mastodon"])
      );
    })
  );

  it.effect("stop the server for a platform they are not read on", () =>
    Effect.gen(function* refused() {
      const result = yield* read({ PEAL_INBOX_MESSAGES: "mastodon,facebook" });

      assert.isTrue(Result.isFailure(result));

      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "InvalidInboxSettings");
        assert.include(result.failure.message, "mastodon and bluesky");
      }
    })
  );
});
