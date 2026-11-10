import { assert, describe, it } from "@effect/vitest";
import { Context, Duration, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";

import { PlatformLookups } from "#publishing/application/platform-lookups.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import type { LookupQuery } from "#publishing/domain/lookup.ts";
import { TikTokCreator } from "#publishing/domain/tiktok-creator.ts";
import { platformLookupsWith } from "#publishing/infrastructure/platforms/platform-lookups-live.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { fakeYouTubeApi } from "#test/publishing/fakes/fake-youtube-api.ts";
import { json } from "#test/publishing/fakes/platform-server.ts";

import { channelId, CredentialLog, credentialsOf } from "./support.ts";

const creator = new TikTokCreator({
  avatarUrl: Option.none(),
  commentDisabled: false,
  duetDisabled: false,
  maxVideoDuration: Option.some(Duration.minutes(10)),
  nickname: "Peal Example",
  privacyLevels: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
  stitchDisabled: false,
  username: "peal_example",
});

const categories = [
  { assignable: true, id: "1", title: "Film & Animation" },
  { assignable: true, id: "22", title: "People & Blogs" },
  { assignable: false, id: "30", title: "Movies" },
];

const playlists = [
  { id: "PLsynthetic01", privacy: "public", title: "Launches" },
  { id: "PLsynthetic02", privacy: "unlisted", title: "Field notes" },
  { id: "PLsynthetic03", privacy: "private", title: "Drafts" },
];

// YouTube, and the lookups reading it as the synthetic channel.
const onYouTube = Effect.fn("test.lookupsOnYouTube")(function* onYouTube(
  tokens: readonly string[] = ["token-1"]
) {
  const youtube = yield* fakeYouTubeApi({
    categories,
    playlists,
    tokens: ["token-2"],
  });

  const credentials = yield* Layer.build(
    credentialsOf(
      { accountId: "UCsyntheticChannel000001", platform: "youtube" },
      tokens
    )
  );

  const lookups = yield* Layer.build(
    platformLookupsWith({
      pinterestApi: new URL(youtube.url),
      youtubeApi: new URL(youtube.url),
    }).pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.succeedContext(credentials),
          Layer.succeed(
            TikTokCreators,
            TikTokCreators.of({
              read: () => Effect.succeed({ _tag: "ready", creator }),
              takesPhotos: true,
            })
          ),
          FetchHttpClient.layer,
          OpenOutboundGuard
        )
      )
    )
  );

  const { run } = Context.get(lookups, PlatformLookups);

  return {
    log: Context.get(credentials, CredentialLog),
    run: (query: LookupQuery) => run(channelId, query),
    youtube,
  };
});

const categoriesOf = (regionCode: string, language = Option.none<string>()) =>
  ({ _tag: "youtubeVideoCategories", language, regionCode }) as const;

const playlistsFrom = (cursor: Option.Option<string>, limit = 2) =>
  ({ _tag: "youtubePlaylists", cursor, limit }) as const;

describe("YouTube's lookups", () => {
  it.effect("list the categories a video can be filed under", () =>
    Effect.gen(function* categoriesListed() {
      const { run, youtube } = yield* onYouTube(["token-2"]);

      const result = yield* run(categoriesOf("FR", Option.some("fr")));

      assert.deepStrictEqual(result, {
        _tag: "youtubeVideoCategories",
        items: [
          { id: "1", title: "Film & Animation (fr)" },
          { id: "22", title: "People & Blogs (fr)" },
        ],
        nextCursor: Option.none(),
      });

      const [request] = youtube.requests();

      assert.strictEqual(request?.path, "/youtube/v3/videoCategories");
      assert.strictEqual(
        request?.query.toString(),
        "part=snippet&regionCode=FR&hl=fr"
      );
    })
  );

  it.effect("leave the titles' language to YouTube when none is asked", () =>
    Effect.gen(function* defaultLanguage() {
      const { run, youtube } = yield* onYouTube(["token-2"]);

      yield* run(categoriesOf("US"));

      assert.isNull(youtube.requests()[0]?.query.get("hl") ?? null);
    })
  );

  it.effect("list the channel's playlists, a page at a time", () =>
    Effect.gen(function* playlistsListed() {
      const { run, youtube } = yield* onYouTube(["token-2"]);

      const first = yield* run(playlistsFrom(Option.none()));

      assert.deepStrictEqual(first, {
        _tag: "youtubePlaylists",
        items: [
          {
            id: "PLsynthetic01",
            privacy: Option.some("public"),
            title: "Launches",
          },
          {
            id: "PLsynthetic02",
            privacy: Option.some("unlisted"),
            title: "Field notes",
          },
        ],
        nextCursor: Option.some("page-2"),
      });

      const second = yield* run(playlistsFrom(first.nextCursor));

      assert.deepStrictEqual(second, {
        _tag: "youtubePlaylists",
        items: [
          {
            id: "PLsynthetic03",
            privacy: Option.some("private"),
            title: "Drafts",
          },
        ],
        nextCursor: Option.none(),
      });
      assert.strictEqual(
        youtube.requests()[0]?.query.toString(),
        "maxResults=2&mine=true&part=snippet%2Cstatus"
      );
    })
  );

  it.effect("renew a token YouTube refuses, once", () =>
    Effect.gen(function* renewed() {
      const { log, run } = yield* onYouTube(["token-1", "token-2"]);

      const result = yield* run(playlistsFrom(Option.none(), 50));

      assert.lengthOf(result.items, 3);
      assert.strictEqual(yield* log.renewals, 1);
    })
  );

  it.effect("ask to reconnect when the renewed token is refused too", () =>
    Effect.gen(function* expired() {
      const { run } = yield* onYouTube(["token-0", "token-1"]);

      const failure = yield* run(categoriesOf("US")).pipe(Effect.flip);

      assert.strictEqual(failure._tag, "TokenExpired");
    })
  );

  it.effect("refuse an input YouTube answers 400 to", () =>
    Effect.gen(function* refusedInput() {
      const { run } = yield* onYouTube(["token-2"]);

      const region = yield* run(categoriesOf("ZZ")).pipe(Effect.flip);

      const cursor = yield* run(playlistsFrom(Option.some("never-given"))).pipe(
        Effect.flip
      );

      assert.strictEqual(region._tag, "LookupInputRejected");
      assert.strictEqual(cursor._tag, "LookupInputRejected");
    })
  );

  it.effect("say how long YouTube asked to wait", () =>
    Effect.gen(function* limited() {
      const { run, youtube } = yield* onYouTube(["token-2"]);

      youtube.script.push("GET /youtube/v3/playlists", [
        json(
          { error: { code: 429, errors: [{ reason: "rateLimitExceeded" }] } },
          429,
          { "retry-after": "30" }
        ),
        youtube.googleError(403, "quotaExceeded"),
      ]);

      const first = yield* run(playlistsFrom(Option.none())).pipe(Effect.flip);
      const second = yield* run(playlistsFrom(Option.none())).pipe(Effect.flip);

      assert.strictEqual(first._tag, "RateLimited");
      assert.deepStrictEqual(
        first._tag === "RateLimited" ? first.retryAfter : undefined,
        Duration.seconds(30)
      );
      assert.strictEqual(second._tag, "RateLimited");
    })
  );

  it.effect(
    "be unavailable when YouTube fails, answers nonsense or forbids",
    () =>
      Effect.gen(function* unavailable() {
        const { run, youtube } = yield* onYouTube(["token-2"]);

        youtube.script.push("GET /youtube/v3/playlists", [
          youtube.googleError(503, "backendError"),
          json({ items: "none" }),
          youtube.googleError(403, "channelSuspended"),
          { _tag: "drop" },
        ]);

        const failures = yield* Effect.forEach([1, 2, 3, 4], () =>
          run(playlistsFrom(Option.none())).pipe(Effect.flip)
        );

        assert.deepStrictEqual(
          failures.map(({ _tag }) => _tag),
          [
            "PlatformUnavailable",
            "PlatformUnavailable",
            "PlatformUnavailable",
            "PlatformUnavailable",
          ]
        );
      })
  );
});

describe("TikTok's creator lookup", () => {
  it.effect("answers the creator as its only item", () =>
    Effect.gen(function* creatorRead() {
      const { run } = yield* onYouTube();

      const result = yield* run({ _tag: "tiktokCreator" });

      assert.deepStrictEqual(result, {
        _tag: "tiktokCreator",
        items: [{ posting: { _tag: "ready", creator }, takesPhotos: true }],
        nextCursor: Option.none(),
      });
    })
  );
});
