import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option } from "effect";

import {
  blueskyScope,
  clientMetadataOf,
} from "#channels/infrastructure/platforms/bluesky/bluesky-client.ts";
import { channelPlatformsConfig } from "#channels/infrastructure/platforms/channel-platform-settings.ts";
import { messageAbilitiesOf } from "#engagement/domain/message-abilities.ts";
import { blueskyChatScopes } from "#shared/domain/bluesky-scopes.ts";

// What Bluesky's sign-in asks for: the chat methods' scopes only where
// the inbox reads Bluesky's messages, and otherwise exactly what it asked
// before.

const scopeWith = (env: Record<string, string>) =>
  channelPlatformsConfig.pipe(
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromUnknown({
          PUBLIC_URL: "http://localhost:3001",
          ...env,
        })
      )
    ),
    Effect.map(({ bluesky }) =>
      bluesky.pipe(
        Option.map((options) => clientMetadataOf(options).scope),
        Option.getOrUndefined
      )
    )
  );

describe("Bluesky's sign-in", () => {
  it.effect("asks what it asked before where Bluesky's messages are off", () =>
    Effect.gen(function* off() {
      assert.strictEqual(yield* scopeWith({}), blueskyScope);
      assert.strictEqual(
        yield* scopeWith({ PEAL_INBOX_MESSAGES: "mastodon" }),
        blueskyScope
      );
    })
  );

  it.effect(
    "asks the chat scopes too where they are on, and they suffice",
    () =>
      Effect.gen(function* on() {
        const scope = yield* scopeWith({ PEAL_INBOX_MESSAGES: "bluesky" });

        assert.strictEqual(
          scope,
          [blueskyScope, ...blueskyChatScopes].join(" ")
        );
        assert.deepStrictEqual(
          messageAbilitiesOf(
            "bluesky",
            (scope ?? "").split(" "),
            new Set(["bluesky"])
          ),
          { read: "available", send: "available" }
        );
      })
  );
});
