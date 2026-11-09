import { assert, describe, it } from "@effect/vitest";
import {
  Api,
  ChannelCannotPost,
  ChannelNotFound,
  Forbidden,
  PlatformUnreachable,
} from "peal-contract";
import type { Member } from "peal-contract";
import { Duration, Effect, Layer, Option } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { TikTokHandlers } from "#publishing/api/tiktok.ts";
import { TikTokCreatorInfo } from "#publishing/application/tiktok-creator-info.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import type { CreatorFailure } from "#publishing/application/tiktok-creators.ts";
import { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { TikTokCreator } from "#publishing/domain/tiktok-creator.ts";
import type { TikTokPosting } from "#publishing/domain/tiktok-creator.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { memberOf } from "#test/channels/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const workspaceId = WorkspaceIdSchema.make(
  "3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6b"
);

const onTikTok = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c1");

const onMastodon = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c2");

const creator = new TikTokCreator({
  avatarUrl: Option.some("https://p16-sign.tiktokcdn.example/avatar/peal.jpeg"),
  commentDisabled: false,
  duetDisabled: true,
  maxVideoDuration: Option.some(Duration.minutes(10)),
  nickname: "Peal Example",
  privacyLevels: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
  stitchDisabled: false,
  username: "peal_example",
});

// The endpoint over the workspace's two channels, and TikTok answering
// `read` for the TikTok one.
const clientWith = (
  member: Member,
  read: Effect.Effect<TikTokPosting, CreatorFailure>
) =>
  HttpApiTest.groups(Api, ["tiktok"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        TikTokHandlers.pipe(
          Layer.provide(
            TikTokCreatorInfo.layer.pipe(
              Layer.provide(
                Layer.mergeAll(
                  Layer.succeed(
                    TikTokCreators,
                    TikTokCreators.of({ read: () => read, takesPhotos: false })
                  ),
                  Layer.succeed(
                    WorkspaceChannels,
                    WorkspaceChannels.of({
                      lookUp: (_actor, ids) =>
                        Effect.succeed(
                          [
                            {
                              channelId: onTikTok,
                              platform: "tiktok" as const,
                            },
                            {
                              channelId: onMastodon,
                              platform: "mastodon" as const,
                            },
                          ].filter(({ channelId }) => ids.includes(channelId))
                        ),
                    })
                  )
                )
              )
            )
          ),
          Layer.provideMerge(securityTest(member))
        ),
        HttpServer.layerServices
      )
    )
  );

const contributor = memberOf(workspaceId, permissionsFor("contributor"));

const ready = Effect.succeed<TikTokPosting>({ _tag: "ready", creator });

describe("a TikTok channel's creator endpoint", () => {
  it.effect("tells the composer who posts, and what they may choose", () =>
    Effect.gen(function* reads() {
      const client = yield* clientWith(contributor, ready);

      const account = yield* client.tiktok.creator({
        params: { channelId: onTikTok, workspaceId },
      });

      assert.deepStrictEqual(account, {
        posting: {
          _tag: "ready",
          creator: {
            avatarUrl: "https://p16-sign.tiktokcdn.example/avatar/peal.jpeg",
            commentDisabled: false,
            duetDisabled: true,
            maxVideoDurationMs: 600_000,
            nickname: "Peal Example",
            privacyLevels: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
            stitchDisabled: false,
            username: "peal_example",
          },
        },
        takesPhotos: false,
      });
    })
  );

  it.effect("says why a creator cannot post now", () =>
    Effect.gen(function* blocked() {
      const client = yield* clientWith(
        contributor,
        Effect.succeed({ _tag: "blocked", reason: "postLimit" })
      );

      const account = yield* client.tiktok.creator({
        params: { channelId: onTikTok, workspaceId },
      });

      assert.deepStrictEqual(account.posting, {
        _tag: "blocked",
        reason: "postLimit",
      });
    })
  );

  it.effect("finds no TikTok channel among the workspace's others", () =>
    Effect.gen(function* notTikTok() {
      const client = yield* clientWith(contributor, ready);

      for (const channelId of [onMastodon, "not-a-channel"]) {
        const refused = yield* client.tiktok
          .creator({ params: { channelId, workspaceId } })
          .pipe(Effect.flip);

        assert.instanceOf(refused, ChannelNotFound);
      }
    })
  );

  it.effect("maps what keeps TikTok from answering", () =>
    Effect.gen(function* refusals() {
      const cases = [
        [new TokenExpired(), new ChannelCannotPost({ reason: "reconnect" })],
        [
          new BadRequest({ code: ownRefusalCodes.channelDisabled }),
          new ChannelCannotPost({ reason: "disabled" }),
        ],
        [new PlatformUnavailable(), new PlatformUnreachable()],
      ] as const;

      for (const [failure, answer] of cases) {
        const client = yield* clientWith(contributor, Effect.fail(failure));

        const refused = yield* client.tiktok
          .creator({ params: { channelId: onTikTok, workspaceId } })
          .pipe(Effect.flip);

        assert.deepStrictEqual(refused, answer);
      }
    })
  );

  it.effect("needs post:create", () =>
    Effect.gen(function* forbidden() {
      const client = yield* clientWith(
        memberOf(workspaceId, permissionsFor("viewer")),
        ready
      );

      const refused = yield* client.tiktok
        .creator({ params: { channelId: onTikTok, workspaceId } })
        .pipe(Effect.flip);

      assert.instanceOf(refused, Forbidden);
    })
  );
});
