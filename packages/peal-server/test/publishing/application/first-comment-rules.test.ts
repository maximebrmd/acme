import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { AccountRules } from "#publishing/application/account-rules.ts";
import { AccountStandings } from "#publishing/application/account-standings.ts";
import { ChannelGrants } from "#publishing/application/channel-grants.ts";
import { PlatformLookups } from "#publishing/application/platform-lookups.ts";
import {
  CurrentThreadedPlatforms,
  threadedPlatformsWith,
} from "#publishing/application/threaded-platforms.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import {
  facebookCommentScopes,
  instagramLoginCommentScope,
  instagramPageCommentScope,
} from "#shared/domain/inbox-platform.ts";
import type { OptionalInboxPlatform } from "#shared/domain/inbox-platform.ts";

const facebook: ChannelOnPlatform = {
  channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000001"),
  platform: "facebook",
};

const instagram: ChannelOnPlatform = {
  channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000002"),
  connection: "instagramLogin",
  platform: "instagram",
};

// What a Page connected before the server read its comments granted.
const before = ["pages_show_list", "pages_manage_posts"];

const inboxOf = (...platforms: readonly OptionalInboxPlatform[]) =>
  Layer.succeed(
    CurrentThreadedPlatforms,
    threadedPlatformsWith(true, new Set(platforms))
  );

const tiktok = Layer.succeed(
  TikTokCreators,
  TikTokCreators.of({
    read: () => Effect.die("TikTok is not asked"),
    takesPhotos: true,
  })
);

const scheduling = (
  channel: ChannelOnPlatform,
  grants: Layer.Layer<ChannelGrants>,
  inbox = inboxOf("facebook", "instagram"),
  followUps = 1
) =>
  AccountRules.use((rules) =>
    rules.violationsOn({
      channel,
      files: [],
      followUps,
      options: Option.none(),
    })
  ).pipe(
    Effect.provide(
      AccountRules.layer.pipe(
        Layer.provide(Layer.mergeAll(grants, tiktok, inbox))
      )
    )
  );

const standing = (
  channel: ChannelOnPlatform,
  grants: Layer.Layer<ChannelGrants>,
  inbox = inboxOf("facebook", "instagram")
) =>
  AccountStandings.use((standings) => standings.read(channel)).pipe(
    Effect.provide(
      AccountStandings.layer.pipe(
        Layer.provide(
          Layer.mergeAll(
            grants,
            inbox,
            Layer.succeed(
              PlatformLookups,
              PlatformLookups.of({ run: () => Effect.die("no lookup is run") })
            )
          )
        )
      )
    )
  );

describe("a first comment", () => {
  it.effect("is refused as a part too many where the inbox is off", () =>
    Effect.gen(function* off() {
      assert.deepStrictEqual(
        yield* scheduling(
          facebook,
          ChannelGrants.granting([facebookCommentScopes.manage]),
          inboxOf()
        ),
        [{ _tag: "tooManyParts", ...facebook, count: 2, maximum: 1 }]
      );
    })
  );

  it.effect(
    "is refused where the channel did not grant the comment scope",
    () =>
      Effect.gen(function* refused() {
        assert.deepStrictEqual(
          yield* scheduling(facebook, ChannelGrants.granting(before)),
          [{ _tag: "partsNeedReconnect", ...facebook, part: 1 }]
        );
        assert.deepStrictEqual(
          yield* scheduling(
            facebook,
            ChannelGrants.granting([...before, facebookCommentScopes.manage])
          ),
          []
        );
        // Scopes Peal cannot read let it through: the platform decides.
        assert.deepStrictEqual(
          yield* scheduling(facebook, ChannelGrants.none),
          []
        );
        // A post of one part needs nothing.
        assert.deepStrictEqual(
          yield* scheduling(
            facebook,
            ChannelGrants.granting(before),
            inboxOf("facebook"),
            0
          ),
          []
        );
      })
  );

  it.effect("takes the scope of the account's way in on Instagram", () =>
    Effect.gen(function* instagramLogin() {
      const { connection: _connection, ...withoutConnection } = instagram;

      assert.deepStrictEqual(
        yield* scheduling(
          instagram,
          ChannelGrants.granting([instagramPageCommentScope])
        ),
        [{ _tag: "partsNeedReconnect", ...withoutConnection, part: 1 }]
      );
      assert.deepStrictEqual(
        yield* scheduling(
          instagram,
          ChannelGrants.granting([instagramLoginCommentScope])
        ),
        []
      );
    })
  );

  it.effect("says beforehand that it needs the channel connected again", () =>
    Effect.gen(function* said() {
      assert.deepStrictEqual(
        yield* standing(facebook, ChannelGrants.granting(before)),
        {
          _tag: "read",
          blocked: undefined,
          restrictions: [{ _tag: "partsNeedReconnect" }],
        }
      );
      assert.deepStrictEqual(
        yield* standing(
          facebook,
          ChannelGrants.granting([facebookCommentScopes.manage])
        ),
        { _tag: "unrestricted" }
      );
      // Where the server sends no comment, there is nothing to grant.
      assert.deepStrictEqual(
        yield* standing(facebook, ChannelGrants.granting(before), inboxOf()),
        { _tag: "unrestricted" }
      );
    })
  );
});
