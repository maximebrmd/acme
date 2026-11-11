import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { AccountRules } from "#publishing/application/account-rules.ts";
import { AccountStandings } from "#publishing/application/account-standings.ts";
import { ChannelGrants } from "#publishing/application/channel-grants.ts";
import { PlatformLookups } from "#publishing/application/platform-lookups.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import { BlueskyOptions } from "#publishing/domain/bluesky-options.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import { blueskyGateScopes } from "#shared/domain/bluesky-scopes.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

const bluesky: ChannelOnPlatform = {
  channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000001"),
  platform: "bluesky",
};

// The scopes a channel connected before Peal asked for the gates holds.
const before = [
  "atproto",
  "repo:app.bsky.feed.post?action=create&action=delete",
];

const rulesOn = (grants: Layer.Layer<ChannelGrants>) =>
  AccountRules.layer.pipe(
    Layer.provide(grants),
    Layer.provide(
      Layer.succeed(
        TikTokCreators,
        TikTokCreators.of({
          read: () => Effect.die("TikTok is not asked"),
          takesPhotos: true,
        })
      )
    )
  );

const standingsOn = (grants: Layer.Layer<ChannelGrants>) =>
  AccountStandings.layer.pipe(
    Layer.provide(grants),
    Layer.provide(
      Layer.succeed(
        PlatformLookups,
        PlatformLookups.of({ run: () => Effect.die("no lookup is run") })
      )
    )
  );

const gated = Option.some(
  new BlueskyOptions({ disableQuotes: true, replies: "nobody" })
);

const scheduling = (grants: Layer.Layer<ChannelGrants>) =>
  AccountRules.use((rules) =>
    rules.violationsOn({
      channel: bluesky,
      files: [],
      followUps: 0,
      options: gated,
    })
  ).pipe(Effect.provide(rulesOn(grants)));

const standing = (grants: Layer.Layer<ChannelGrants>) =>
  AccountStandings.use((standings) => standings.read(bluesky)).pipe(
    Effect.provide(standingsOn(grants))
  );

describe("a Bluesky channel's gates", () => {
  it.effect(
    "are refused at scheduling where the channel did not grant their scopes",
    () =>
      Effect.gen(function* refused() {
        assert.deepStrictEqual(
          yield* scheduling(ChannelGrants.granting(before)),
          [
            { _tag: "optionInvalid", ...bluesky, field: "disableQuotes" },
            { _tag: "optionInvalid", ...bluesky, field: "replies" },
          ]
        );
        assert.deepStrictEqual(
          yield* scheduling(
            ChannelGrants.granting([...before, ...blueskyGateScopes])
          ),
          []
        );
        // Scopes Peal cannot read let the post through: the PDS decides.
        assert.deepStrictEqual(yield* scheduling(ChannelGrants.none), []);
      })
  );

  it.effect("say beforehand that they need the channel connected again", () =>
    Effect.gen(function* said() {
      assert.deepStrictEqual(yield* standing(ChannelGrants.granting(before)), {
        _tag: "read",
        blocked: undefined,
        restrictions: [
          { _tag: "optionNeedsReconnect", field: "disableQuotes" },
          { _tag: "optionNeedsReconnect", field: "replies" },
        ],
      });
      assert.deepStrictEqual(
        yield* standing(
          ChannelGrants.granting([...before, ...blueskyGateScopes])
        ),
        { _tag: "unrestricted" }
      );
    })
  );
});
