// Short links on Postgres: issued once per target, part and destination,
// followed and counted by UTC day, purged, erased. Clicks are counted in
// the 1890s, before any other suite's, so the purge's cutoff touches
// nothing else.
import { assert, layer } from "@effect/vitest";
import {
  ConfigProvider,
  Context,
  Effect,
  Exit,
  Fiber,
  Layer,
  Ref,
} from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import { PurgeClicks } from "#shortlinks/application/purge-clicks.ts";
import { ShortCodes } from "#shortlinks/application/short-codes.ts";
import { ShortLinkRecords } from "#shortlinks/application/short-link-records.ts";
import { ShortLinks } from "#shortlinks/application/short-links.ts";
import type { IssueRequest } from "#shortlinks/application/short-links.ts";
import { ShortLinksLive } from "#shortlinks/container.ts";
import { ShortCodeSchema } from "#shortlinks/domain/short-code.ts";
import type { ShortCode } from "#shortlinks/domain/short-code.ts";
import { DrizzleShortLinkStore } from "#shortlinks/infrastructure/drizzle-short-link-store.ts";
import { RandomShortCodes } from "#shortlinks/infrastructure/random-short-codes.ts";
import { ShortLinkBaseLive } from "#shortlinks/infrastructure/short-link-settings.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { OpenLinkStanding } from "#test/shortlinks/support.ts";

const base = "https://go.example.com/";

const browser = {
  method: "GET",
  purpose: undefined,
  userAgent: "Mozilla/5.0 (synthetic browser)",
};

const ShortLinksTest = ShortLinksLive.pipe(
  Layer.provide(OpenLinkStanding),
  Layer.provide(
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown({ PEAL_SHORT_LINK_BASE: base }),
      { asPrimary: true }
    )
  ),
  Layer.provideMerge(DatabaseTest)
);

// A target's part asking for these destinations.
const asking = Effect.fn("asking")(function* asking(
  destinations: readonly string[]
) {
  const request: IssueRequest = {
    channelId: yield* newId(ChannelIdSchema),
    destinations,
    part: 0,
    postId: yield* newId(PostIdSchema),
    targetId: yield* newId(PostTargetIdSchema),
    workspaceId: yield* freshWorkspace,
  };

  return request;
});

const codeIn = (shortUrl: string) => shortUrl.slice(base.length);

const clicksOf = (code: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly clicks: number;
        readonly day: string;
      }>`SELECT c.clicks, to_char(c.day, 'YYYY-MM-DD') AS day FROM shortlinks.clicks c JOIN shortlinks.links l ON l.id = c.link_id WHERE l.code = ${code} ORDER BY c.day`
  ).pipe(Effect.orDie);

layer(ShortLinksTest)("short links on Postgres", (it) => {
  it.effect(
    "answers the same codes every time a target's part asks, one per destination",
    () =>
      Effect.gen(function* sameCodes() {
        const links = yield* ShortLinks;

        const request = yield* asking([
          "https://example.test/a",
          "https://example.test/b",
          "ftp://example.test/c",
        ]);

        const first = yield* links.issue(request);
        const second = yield* links.issue(request);

        assert.deepStrictEqual(first, second);
        assert.isTrue(first[0]?.startsWith(base));
        assert.notStrictEqual(first[0], first[1]);
        // What may not be shortened is answered as written.
        assert.strictEqual(first[2], "ftp://example.test/c");
        assert.isTrue(
          ShortCodeSchema.make(codeIn(first[0] ?? "")).length === 7
        );

        const other = yield* links.issue({
          ...request,
          targetId: yield* newId(PostTargetIdSchema),
        });

        // Another channel's target gets codes of its own.
        assert.notStrictEqual(other[0], first[0]);
      })
  );

  it.effect("makes one row when two runs ask at once", () =>
    Effect.gen(function* together() {
      const links = yield* ShortLinks;
      const request = yield* asking(["https://example.test/together"]);

      const [one, two] = yield* Effect.all(
        [links.issue(request), links.issue(request)],
        { concurrency: 2 }
      );

      assert.deepStrictEqual(one, two);

      const rows = yield* SqlClient.SqlClient.use(
        (sql) =>
          sql<{
            readonly count: number;
          }>`SELECT count(*)::int AS count FROM shortlinks.links WHERE target_id = ${request.targetId}`
      ).pipe(Effect.orDie);

      assert.strictEqual(rows[0]?.count, 1);
    })
  );

  it.effect("follows a code and counts each visit by its UTC day", () =>
    Effect.gen(function* followed() {
      const links = yield* ShortLinks;

      const [shortUrl] = yield* links.issue(
        yield* asking(["https://example.test/followed"])
      );

      const code = codeIn(shortUrl ?? "");

      yield* TestClock.setTime(Date.parse("1890-03-01T23:59:00Z"));

      const fiber = yield* Effect.forkChild(
        Effect.gen(function* visits() {
          assert.deepStrictEqual(yield* links.follow(code, browser), {
            _tag: "found",
            destination: "https://example.test/followed",
          });
          yield* links.follow(code, browser);
          // A preview reader is redirected, never counted.
          yield* links.follow(code, {
            ...browser,
            userAgent: "SyntheticBot/1.0",
          });
        })
      );

      yield* Fiber.join(fiber);
      yield* TestClock.setTime(Date.parse("1890-03-02T00:01:00Z"));
      yield* links.follow(code, browser);

      assert.deepStrictEqual(yield* clicksOf(code), [
        { clicks: 2, day: "1890-03-01" },
        { clicks: 1, day: "1890-03-02" },
      ]);
      assert.deepStrictEqual(yield* links.follow("AAAAAAA", browser), {
        _tag: "unknown",
      });
      assert.deepStrictEqual(yield* links.follow("not a code", browser), {
        _tag: "unknown",
      });

      // Past their 400 days, the counts go.
      yield* TestClock.setTime(Date.parse("1891-04-06T00:00:00Z"));
      const purged = yield* PurgeClicks.use((purging) => purging.purge);

      assert.isAtLeast(purged, 1);
      assert.deepStrictEqual(yield* clicksOf(code), [
        { clicks: 1, day: "1890-03-02" },
      ]);
    })
  );

  it.effect("goes with its workspace, and is exported without counts", () =>
    Effect.gen(function* erased() {
      const links = yield* ShortLinks;
      const records = yield* ShortLinkRecords;
      const request = yield* asking(["https://example.test/erased"]);
      const [shortUrl] = yield* links.issue(request);
      const code = codeIn(shortUrl ?? "");

      yield* links.follow(code, browser);

      const exported = yield* records.exportWorkspace(request.workspaceId);

      assert.deepStrictEqual(
        exported.map(({ code: held, destination, shortUrl: address }) => ({
          address,
          destination,
          held,
        })),
        [
          {
            address: shortUrl ?? null,
            destination: "https://example.test/erased",
            held: code,
          },
        ]
      );

      yield* records.eraseWorkspace(request.workspaceId);

      assert.deepStrictEqual(yield* links.follow(code, browser), {
        _tag: "unknown",
      });
      assert.deepStrictEqual(yield* clicksOf(code), []);
    })
  );
});

// Codes queued by the test, then the random source's: a collision forced.
class QueuedCodes extends Context.Service<
  QueuedCodes,
  { readonly queue: (codes: readonly ShortCode[]) => Effect.Effect<void> }
>()("test/shortlinks/QueuedCodes") {}

const queuedCodes = Layer.effectContext(
  Effect.gen(function* queued() {
    const random = yield* ShortCodes;
    const waiting = yield* Ref.make<readonly ShortCode[]>([]);

    return Context.make(
      ShortCodes,
      ShortCodes.of({
        draw: Ref.modify(waiting, ([next, ...rest]) => [next, rest]).pipe(
          Effect.flatMap((next) =>
            next === undefined ? random.draw : Effect.succeed(next)
          )
        ),
      })
    ).pipe(
      Context.add(
        QueuedCodes,
        QueuedCodes.of({ queue: (codes) => Ref.set(waiting, codes) })
      )
    );
  })
).pipe(Layer.provide(RandomShortCodes));

const baseTest = ConfigProvider.layerAdd(
  ConfigProvider.fromUnknown({ PEAL_SHORT_LINK_BASE: base }),
  { asPrimary: true }
);

layer(
  ShortLinks.layer.pipe(
    Layer.provide(OpenLinkStanding),
    Layer.provideMerge(queuedCodes),
    Layer.provide(Layer.mergeAll(DrizzleShortLinkStore, ShortLinkBaseLive)),
    Layer.provide(baseTest),
    Layer.provideMerge(DatabaseTest)
  )
)("a code another link holds", (it) => {
  it.effect("is drawn again", () =>
    Effect.gen(function* drawnAgain() {
      const links = yield* ShortLinks;
      const queued = yield* QueuedCodes;

      const [first] = yield* links.issue(
        yield* asking(["https://example.test/first"])
      );

      const taken = ShortCodeSchema.make(codeIn(first ?? ""));

      yield* queued.queue([taken, taken]);

      const [second] = yield* links.issue(
        yield* asking(["https://example.test/second"])
      );

      assert.isTrue(second?.startsWith(base));
      assert.notStrictEqual(second, first);
    })
  );

  it.effect("is a defect after five draws, never a link sent long", () =>
    Effect.gen(function* fiveDraws() {
      const links = yield* ShortLinks;
      const queued = yield* QueuedCodes;

      const [first] = yield* links.issue(
        yield* asking(["https://example.test/held"])
      );

      const taken = ShortCodeSchema.make(codeIn(first ?? ""));

      yield* queued.queue([taken, taken, taken, taken, taken]);

      const exit = yield* links
        .issue(yield* asking(["https://example.test/never"]))
        .pipe(Effect.exit);

      assert.isTrue(Exit.hasDies(exit));
    })
  );
});
