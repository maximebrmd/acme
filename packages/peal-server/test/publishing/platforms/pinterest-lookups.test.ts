import { assert, describe, it } from "@effect/vitest";
import { Context, Duration, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";

import { PlatformLookups } from "#publishing/application/platform-lookups.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import type { LookupQuery } from "#publishing/domain/lookup.ts";
import { platformLookupsWith } from "#publishing/infrastructure/platforms/platform-lookups-live.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import {
  fakePinterestApi,
  pinterestAccountId,
} from "#test/publishing/fakes/fake-pinterest-api.ts";
import { headerOf, json } from "#test/publishing/fakes/platform-server.ts";

import { channelId, CredentialLog, credentialsOf } from "./support.ts";

const boards = [
  {
    id: "549755885001",
    name: "Summer recipes",
    sections: [
      { id: "5000000000001", name: "Salads" },
      { id: "5000000000002", name: "Soups" },
      { id: "5000000000003", name: "Desserts" },
    ],
  },
  { id: "549755885002", name: "Garden", privacy: "PROTECTED" as const },
  { id: "549755885003", name: "Travel" },
];

// Pinterest, and the lookups reading it as the synthetic account.
const onPinterest = Effect.fn("test.lookupsOnPinterest")(function* onPinterest(
  tokens: readonly string[] = ["token-1"]
) {
  const pinterest = yield* fakePinterestApi({ boards, tokens: ["token-1"] });

  const credentials = yield* Layer.build(
    credentialsOf(
      { accountId: pinterestAccountId, platform: "pinterest" },
      tokens
    )
  );

  const lookups = yield* Layer.build(
    platformLookupsWith({
      linkedinApi: new URL(pinterest.url),
      pinterestApi: new URL(pinterest.url),
      youtubeApi: new URL(pinterest.url),
    }).pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.succeedContext(credentials),
          Layer.succeed(
            TikTokCreators,
            TikTokCreators.of({
              read: () => Effect.die("not asked"),
              takesPhotos: false,
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
    pinterest,
    run: (query: LookupQuery) => run(channelId, query),
  };
});

const boardsFrom = (cursor: Option.Option<string>, limit = 2) =>
  ({ _tag: "pinterestBoards", cursor, limit }) as const;

const sectionsOf = (
  boardId: string,
  cursor = Option.none<string>(),
  limit = 2
) => ({ _tag: "pinterestBoardSections", boardId, cursor, limit }) as const;

describe("Pinterest's lookups", () => {
  it.effect("list the account's boards, a page at a time", () =>
    Effect.gen(function* boardsListed() {
      const { pinterest, run } = yield* onPinterest();

      const first = yield* run(boardsFrom(Option.none()));

      assert.deepStrictEqual(first, {
        _tag: "pinterestBoards",
        items: [
          {
            id: "549755885001",
            name: "Summer recipes",
            privacy: Option.some("PUBLIC"),
          },
          {
            id: "549755885002",
            name: "Garden",
            privacy: Option.some("PROTECTED"),
          },
        ],
        nextCursor: Option.some("page-2"),
      });

      const second = yield* run(boardsFrom(first.nextCursor));

      assert.deepStrictEqual(second, {
        _tag: "pinterestBoards",
        items: [
          {
            id: "549755885003",
            name: "Travel",
            privacy: Option.some("PUBLIC"),
          },
        ],
        nextCursor: Option.none(),
      });

      const [request, next] = pinterest.requests();

      assert(request !== undefined && next !== undefined);
      assert.strictEqual(request.path, "/v5/boards");
      assert.strictEqual(request.query.toString(), "page_size=2");
      assert.strictEqual(headerOf(request, "authorization"), "Bearer token-1");
      assert.strictEqual(next.query.toString(), "page_size=2&bookmark=page-2");
    })
  );

  it.effect("list a board's sections, a page at a time", () =>
    Effect.gen(function* sectionsListed() {
      const { run } = yield* onPinterest();

      const first = yield* run(sectionsOf("549755885001"));
      const second = yield* run(sectionsOf("549755885001", first.nextCursor));
      const none = yield* run(sectionsOf("549755885003"));

      assert.deepStrictEqual(first, {
        _tag: "pinterestBoardSections",
        items: [
          { id: "5000000000001", name: "Salads" },
          { id: "5000000000002", name: "Soups" },
        ],
        nextCursor: Option.some("page-2"),
      });
      assert.deepStrictEqual(second, {
        _tag: "pinterestBoardSections",
        items: [{ id: "5000000000003", name: "Desserts" }],
        nextCursor: Option.none(),
      });
      assert.deepStrictEqual(none, {
        _tag: "pinterestBoardSections",
        items: [],
        nextCursor: Option.none(),
      });
    })
  );

  it.effect("pass on an empty page that names a next one", () =>
    Effect.gen(function* emptyPage() {
      const { pinterest, run } = yield* onPinterest();

      pinterest.script.push("GET /v5/boards", [
        json({ bookmark: "page-2", items: [] }),
      ]);

      assert.deepStrictEqual(yield* run(boardsFrom(Option.none())), {
        _tag: "pinterestBoards",
        items: [],
        nextCursor: Option.some("page-2"),
      });
    })
  );

  it.effect("renew a token Pinterest refuses, once", () =>
    Effect.gen(function* renewed() {
      const { log, run } = yield* onPinterest(["token-0", "token-1"]);

      const result = yield* run(boardsFrom(Option.none(), 50));

      assert.lengthOf(result.items, 3);
      assert.strictEqual(yield* log.renewals, 1);
    })
  );

  it.effect("ask to reconnect when the renewed token is refused too", () =>
    Effect.gen(function* expired() {
      const { run } = yield* onPinterest(["token-8", "token-9"]);

      const failure = yield* run(boardsFrom(Option.none())).pipe(Effect.flip);

      assert.strictEqual(failure._tag, "TokenExpired");
    })
  );

  it.effect(
    "refuse a bookmark Pinterest never gave, and a board not there",
    () =>
      Effect.gen(function* refusedInput() {
        const { run } = yield* onPinterest();

        const cursor = yield* run(boardsFrom(Option.some("never-given"))).pipe(
          Effect.flip
        );

        const board = yield* run(sectionsOf("549755885999")).pipe(Effect.flip);

        assert.strictEqual(cursor._tag, "LookupInputRejected");
        assert.strictEqual(board._tag, "LookupInputRejected");
      })
  );

  it.effect("say how long Pinterest asked to wait", () =>
    Effect.gen(function* limited() {
      const { pinterest, run } = yield* onPinterest();

      pinterest.script.push("GET /v5/boards", [
        json({ code: 8, message: "Rate limit exceeded." }, 429, {
          "x-ratelimit-reset": "30",
        }),
      ]);

      const failure = yield* run(boardsFrom(Option.none())).pipe(Effect.flip);

      assert.strictEqual(failure._tag, "RateLimited");
      assert.deepStrictEqual(
        failure._tag === "RateLimited" ? failure.retryAfter : undefined,
        Duration.seconds(30)
      );
    })
  );

  it.effect(
    "be unavailable when Pinterest fails, answers nonsense or forbids",
    () =>
      Effect.gen(function* unavailable() {
        const { pinterest, run } = yield* onPinterest();

        pinterest.script.push("GET /v5/boards", [
          pinterest.refusal(503, 0, "Service unavailable."),
          json({ items: "none" }),
          pinterest.refusal(403, 29, "You are not permitted to do that."),
          { _tag: "drop" },
        ]);

        const failures = yield* Effect.forEach([1, 2, 3, 4], () =>
          run(boardsFrom(Option.none())).pipe(Effect.flip)
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
