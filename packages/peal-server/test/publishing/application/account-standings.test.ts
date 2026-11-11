import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Ref } from "effect";

import { AccountStandings } from "#publishing/application/account-standings.ts";
import { ChannelGrants } from "#publishing/application/channel-grants.ts";
import { pacedLookups } from "#publishing/application/paced-lookups.ts";
import { PlatformLookups } from "#publishing/application/platform-lookups.ts";
import { PlatformQuota } from "#publishing/application/platform-quota.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

const channel = {
  channelId: ChannelIdSchema.make("01900000-0000-7000-8000-0000000000f1"),
  platform: "tiktok" as const,
};

// A channel's standing read through the paced lookups, over a TikTok that
// counts how often it is asked and blocks the creator.
const standings = Effect.gen(function* standings() {
  const asked = yield* Ref.make(0);

  const read = yield* AccountStandings.pipe(
    Effect.provide(
      AccountStandings.layer.pipe(
        Layer.provide(ChannelGrants.none),
        Layer.provide(
          pacedLookups(
            Layer.succeed(
              PlatformLookups,
              PlatformLookups.of({
                run: () =>
                  Ref.update(asked, (count) => count + 1).pipe(
                    Effect.as({
                      _tag: "tiktokCreator" as const,
                      items: [
                        {
                          posting: {
                            _tag: "blocked" as const,
                            reason: "postLimit" as const,
                          },
                          takesPhotos: false,
                        },
                      ],
                      nextCursor: Option.none(),
                    })
                  ),
              })
            )
          ).pipe(
            Layer.provide(
              Layer.succeed(
                PlatformQuota,
                PlatformQuota.of({
                  exhaust: () => Effect.void,
                  spend: () => Effect.succeed(true),
                })
              )
            )
          )
        )
      )
    )
  );

  return { asked: Ref.get(asked), read };
});

describe("a channel's standing on its platform", () => {
  it.effect(
    "is read through the paced lookups: asked again within a minute, the platform is not",
    () =>
      Effect.gen(function* paced() {
        const { asked, read } = yield* standings;

        const first = yield* read.read(channel);

        assert.strictEqual(first._tag, "read");
        assert.deepStrictEqual(yield* read.read(channel), first);
        assert.deepStrictEqual(yield* read.read(channel), first);
        // Three descriptions of the channel, one request to TikTok.
        assert.strictEqual(yield* asked, 1);
      })
  );
});
