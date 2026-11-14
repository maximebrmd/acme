import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option } from "effect";

import {
  blueskyScope,
  blueskySignInScope,
  clientMetadataOf,
} from "#channels/infrastructure/platforms/bluesky/bluesky-client.ts";
import { channelPlatformsConfig } from "#channels/infrastructure/platforms/channel-platform-settings.ts";
import { messageAbilitiesOf } from "#engagement/domain/message-abilities.ts";
import {
  blueskyChatScopes,
  blueskyRepostScope,
} from "#shared/domain/bluesky-scopes.ts";

// What Bluesky's client may ask for (its metadata): the repost's scope,
// and the chat methods' only where the inbox reads Bluesky's messages. What
// a sign-in asks: publishing's scopes alone, unless asked for more.

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
      const most = [blueskyScope, blueskyRepostScope].join(" ");

      assert.strictEqual(yield* scopeWith({}), most);
      assert.strictEqual(
        yield* scopeWith({ PEAL_INBOX_MESSAGES: "mastodon" }),
        most
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
          [blueskyScope, blueskyRepostScope, ...blueskyChatScopes].join(" ")
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

  it("asks publishing's scopes alone, and the repost's or the chat's only when asked or granted before", () => {
    const most = [blueskyScope, blueskyRepostScope, ...blueskyChatScopes].join(
      " "
    );

    const asked = (
      ask: { readonly messages?: boolean; readonly reposts?: boolean },
      granted: readonly string[] = []
    ) => blueskySignInScope(most, ask, Option.some(granted));

    assert.strictEqual(asked({}), blueskyScope);
    assert.strictEqual(
      asked({ reposts: true }),
      [blueskyScope, blueskyRepostScope].join(" ")
    );
    assert.strictEqual(
      asked({}, [blueskyRepostScope]),
      [blueskyScope, blueskyRepostScope].join(" ")
    );
    assert.strictEqual(
      asked({ messages: true }),
      [blueskyScope, ...blueskyChatScopes].join(" ")
    );
    // Never more than the client may ask.
    assert.strictEqual(
      blueskySignInScope(blueskyScope, { messages: true, reposts: true }, Option.none()),
      blueskyScope
    );
  });
});
