import { assert, describe, expect, it } from "@effect/vitest";
import { Duration, Effect, Layer, Option } from "effect";

import { AccountRules } from "#publishing/application/account-rules.ts";
import { ChannelGrants } from "#publishing/application/channel-grants.ts";
import { CurrentThreadedPlatforms } from "#publishing/application/threaded-platforms.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import {
  creatorViolationsOn,
  TikTokCreator,
} from "#publishing/domain/tiktok-creator.ts";
import type { TikTokPosting } from "#publishing/domain/tiktok-creator.ts";
import { TikTokOptions } from "#publishing/domain/tiktok-options.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { mediaFile } from "#test/publishing/support.ts";

const tiktok: ChannelOnPlatform = {
  channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000001"),
  platform: "tiktok",
};

const clip = mediaFile(
  MediaAssetIdSchema.make("00000000-0000-7000-8000-00000000a001"),
  {
    contentType: "video/mp4",
    dimensions: Option.some({ height: 1920, width: 1080 }),
    duration: Option.some(Duration.seconds(90)),
  }
);

const picture = mediaFile(
  MediaAssetIdSchema.make("00000000-0000-7000-8000-00000000a002")
);

// A private account: followers, friends or only me, no Duets or Stitches,
// videos of a minute at most, comments off.
const privateCreator = new TikTokCreator({
  avatarUrl: Option.none(),
  commentDisabled: true,
  duetDisabled: true,
  maxVideoDuration: Option.some(Duration.seconds(60)),
  nickname: "Peal Example",
  privacyLevels: ["FOLLOWER_OF_CREATOR", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
  stitchDisabled: true,
  username: "peal_example",
});

const allowing = new TikTokOptions({
  disableComment: false,
  disableDuet: false,
  disableStitch: false,
  privacyLevel: "PUBLIC_TO_EVERYONE",
});

describe(creatorViolationsOn, () => {
  it("refuses what the creator's settings forbid on a video", () => {
    expect(
      creatorViolationsOn(tiktok, privateCreator, Option.some(allowing), [clip])
    ).toStrictEqual([
      { _tag: "optionInvalid", ...tiktok, field: "privacyLevel" },
      { _tag: "optionInvalid", ...tiktok, field: "disableComment" },
      { _tag: "optionInvalid", ...tiktok, field: "disableDuet" },
      { _tag: "optionInvalid", ...tiktok, field: "disableStitch" },
      {
        _tag: "videoTooLong",
        ...tiktok,
        durationMs: 90_000,
        maximumMs: 60_000,
        mediaId: clip.mediaId,
      },
    ]);
  });

  it("leaves Duets and Stitches out of photo posts", () => {
    expect(
      creatorViolationsOn(
        tiktok,
        privateCreator,
        Option.some(
          new TikTokOptions({
            disableComment: true,
            disableDuet: false,
            disableStitch: false,
            privacyLevel: "SELF_ONLY",
          })
        ),
        [picture]
      )
    ).toStrictEqual([]);
  });

  it("takes what the settings allow, and nothing without options", () => {
    const chosen = new TikTokOptions({ privacyLevel: "FOLLOWER_OF_CREATOR" });

    expect(
      creatorViolationsOn(tiktok, privateCreator, Option.some(chosen), [])
    ).toStrictEqual([]);
    expect(
      creatorViolationsOn(tiktok, privateCreator, Option.none(), [clip])
    ).toStrictEqual([]);
  });
});

const rulesWith = (
  read: Effect.Effect<TikTokPosting, PlatformUnavailable>,
  takesPhotos = true
) =>
  AccountRules.layer.pipe(
    Layer.provide(ChannelGrants.none),
    Layer.provide(
      Layer.succeed(
        TikTokCreators,
        TikTokCreators.of({ read: () => read, takesPhotos })
      )
    )
  );

const violations = (
  target: Parameters<AccountRules["Service"]["violationsOn"]>[0]
) => AccountRules.use((rules) => rules.violationsOn(target));

describe("a TikTok account's rules at scheduling", () => {
  it.effect("are the creator's, read from TikTok", () =>
    Effect.gen(function* creators() {
      const found = yield* violations({
        channel: tiktok,
        files: [clip],
        followUps: 0,
        options: Option.some(new TikTokOptions({ privacyLevel: "SELF_ONLY" })),
      }).pipe(
        Effect.provide(
          rulesWith(Effect.succeed({ _tag: "ready", creator: privateCreator }))
        )
      );

      assert.deepStrictEqual(
        found.map(({ _tag }) => _tag),
        ["videoTooLong"]
      );
    })
  );

  it.effect("let a post through when TikTok cannot tell now", () =>
    Effect.gen(function* unread() {
      const found = yield* violations({
        channel: tiktok,
        files: [clip],
        followUps: 0,
        options: Option.some(allowing),
      }).pipe(
        Effect.provide(rulesWith(Effect.fail(new PlatformUnavailable())))
      );

      assert.deepStrictEqual(found, []);
    })
  );

  it.effect("refuse photos on a server TikTok takes none from", () =>
    Effect.gen(function* photos() {
      const found = yield* violations({
        channel: tiktok,
        files: [picture],
        followUps: 0,
        options: Option.some(new TikTokOptions({ privacyLevel: "SELF_ONLY" })),
      }).pipe(
        Effect.provide(
          rulesWith(
            Effect.succeed({ _tag: "blocked", reason: "postLimit" }),
            false
          )
        )
      );

      assert.deepStrictEqual(found, [
        {
          _tag: "mediaTypeUnsupported",
          ...tiktok,
          contentType: "image/jpeg",
          mediaId: picture.mediaId,
        },
      ]);
    })
  );

  it.effect(
    "refuse a post of several parts on X where the operator turned X threads off",
    () =>
      Effect.gen(function* xThreadsOff() {
        const onX = { ...tiktok, platform: "x" as const };

        const ask = (followUps: number) =>
          violations({
            channel: onX,
            files: [],
            followUps,
            options: Option.none(),
          });

        const off = { takesParts: (platform: string) => platform !== "x" };

        const refused = yield* ask(2).pipe(
          Effect.provide(rulesWith(Effect.die("not read"))),
          Effect.provideService(CurrentThreadedPlatforms, off)
        );

        assert.deepStrictEqual(refused, [
          { _tag: "tooManyParts", ...onX, count: 3, maximum: 1 },
        ]);

        // A post alone goes, and threads go where the setting is on.
        assert.deepStrictEqual(
          yield* ask(0).pipe(
            Effect.provide(rulesWith(Effect.die("not read"))),
            Effect.provideService(CurrentThreadedPlatforms, off)
          ),
          []
        );
        assert.deepStrictEqual(
          yield* ask(2).pipe(Effect.provide(rulesWith(Effect.die("not read")))),
          []
        );
      })
  );

  it.effect("are none on other platforms", () =>
    Effect.gen(function* others() {
      const found = yield* violations({
        channel: { ...tiktok, platform: "mastodon" },
        files: [picture],
        followUps: 0,
        options: Option.none(),
      }).pipe(Effect.provide(rulesWith(Effect.die("not read"), false)));

      assert.deepStrictEqual(found, []);
    })
  );
});
