// Following a short link through the routes: the redirect, its headers,
// what it counts, and what it answers for a code it does not know, a link
// turned off and an address that asks too often.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { redirectsPerMinute } from "#app/short-links/redirects.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { ShortLinks } from "#shortlinks/application/short-links.ts";
import { ShortLinksLive } from "#shortlinks/container.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { liveTarget, OpenLinkStanding } from "#test/shortlinks/support.ts";
import {
  TestApp,
  unconfirmedEmails,
} from "#test/workspace/integration/harness.ts";

const base = "http://links.example.com/api/l/";

const settings = { ...unconfirmedEmails, PEAL_SHORT_LINK_BASE: base };

// The app, and the context beside it on the same database, to issue
// links as publishing does.
const Test = Layer.mergeAll(
  TestApp.layerWith(settings),
  ShortLinksLive.pipe(
    Layer.provide(OpenLinkStanding),
    Layer.provide(
      ConfigProvider.layerAdd(ConfigProvider.fromUnknown(settings), {
        asPrimary: true,
      })
    ),
    Layer.provideMerge(DatabaseTest)
  )
);

const browser = "Mozilla/5.0 (synthetic browser)";

// A link newly issued to `destination` in a post whose first part is live
// (or not), in a workspace of its own, and its path on the server.
const issuedIn = Effect.fn("issuedIn")(function* issuedIn(
  destination: string,
  live: boolean
) {
  const links = yield* ShortLinks;
  const target = yield* liveTarget(`links-${randomUUID().slice(0, 8)}`, live);

  const [shortUrl = ""] = yield* links.issue({
    channelId: ChannelIdSchema.make(target.channelId),
    destinations: [destination],
    part: 0,
    postId: PostIdSchema.make(target.postId),
    targetId: PostTargetIdSchema.make(target.targetId),
    workspaceId: WorkspaceIdSchema.make(target.workspaceId),
  });

  return {
    code: shortUrl.slice(base.length),
    owner: target.owner,
    path: new URL(shortUrl).pathname,
  };
});

const issued = (destination: string) => issuedIn(destination, true);

const clicksOf = (code: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly clicks: number;
      }>`SELECT coalesce(sum(c.clicks), 0)::int AS clicks FROM shortlinks.clicks c JOIN shortlinks.links l ON l.id = c.link_id WHERE l.code = ${code}`
  ).pipe(
    Effect.orDie,
    Effect.map((rows) => rows[0]?.clicks ?? 0)
  );

// Each test its own address, so the limit counts it alone.
const fromAddress = () => ({
  "x-forwarded-for": `198.51.100.${String(Math.floor(Math.random() * 250) + 1)}-${randomUUID()}`,
});

layer(Test, { excludeTestServices: true, timeout: "120 seconds" })(
  "a short link's redirect",
  (it) => {
    it.effect(
      "answers a 302 to its destination, never cached, and counts it",
      () =>
        Effect.gen(function* found() {
          const app = yield* TestApp;

          const { code, path } = yield* issued(
            "https://example.test/landing?campaign=synthetic"
          );

          const reply = yield* app.request(path, {
            headers: { ...fromAddress(), "user-agent": browser },
          });

          assert.strictEqual(reply.status, 302);
          assert.strictEqual(
            reply.headers.get("location"),
            "https://example.test/landing?campaign=synthetic"
          );
          assert.strictEqual(reply.headers.get("cache-control"), "no-store");
          assert.strictEqual(
            reply.headers.get("x-robots-tag"),
            "noindex, nofollow"
          );
          assert.strictEqual(reply.body, "");
          assert.strictEqual(yield* clicksOf(code), 1);
        })
    );

    it.effect(
      "redirects to an address outside Latin letters, written as a header takes it",
      () =>
        Effect.gen(function* international() {
          const app = yield* TestApp;

          const cyrillic = yield* issued(
            "https://example.test/путь/к/странице"
          );

          const host = yield* issued("https://пример.рф/page");

          const onPath = yield* app.request(cyrillic.path, {
            headers: { ...fromAddress(), "user-agent": browser },
          });

          const onHost = yield* app.request(host.path, {
            headers: { ...fromAddress(), "user-agent": browser },
          });

          assert.strictEqual(onPath.status, 302);
          assert.strictEqual(
            onPath.headers.get("location"),
            "https://example.test/%D0%BF%D1%83%D1%82%D1%8C/%D0%BA/%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D0%B5"
          );
          assert.strictEqual(onHost.status, 302);
          assert.strictEqual(
            onHost.headers.get("location"),
            "https://xn--e1afmkfd.xn--p1ai/page"
          );
        })
    );

    it.effect(
      "answers quickly, never hanging, for a destination no header can carry",
      () =>
        Effect.gen(function* unwritable() {
          const app = yield* TestApp;
          const { code, path } = yield* issued("https://example.test/kept");

          // As a row from before destinations were written as addresses.
          yield* SqlClient.SqlClient.use(
            (sql) =>
              sql`UPDATE shortlinks.links SET destination = ${"https://example.test/путь\r\nx"} WHERE code = ${code}`
          ).pipe(Effect.orDie);

          const reply = yield* app.request(path, {
            headers: { ...fromAddress(), "user-agent": browser },
          });

          assert.include([302, 404], reply.status);
          assert.notInclude(reply.headers.get("location") ?? "", "\n");
        }).pipe(Effect.timeout("5 seconds"))
    );

    it.effect("answers HEAD the same, and counts nothing", () =>
      Effect.gen(function* head() {
        const app = yield* TestApp;
        const { code, path } = yield* issued("https://example.test/head");

        const reply = yield* app.request(path, {
          headers: { ...fromAddress(), "user-agent": browser },
          method: "HEAD",
        });

        assert.strictEqual(reply.status, 302);
        assert.strictEqual(
          reply.headers.get("location"),
          "https://example.test/head"
        );
        assert.strictEqual(yield* clicksOf(code), 0);
      })
    );

    it.effect(
      "redirects automated readers and prefetches, counting neither",
      () =>
        Effect.gen(function* readers() {
          const app = yield* TestApp;
          const { code, path } = yield* issued("https://example.test/readers");

          const crawler = yield* app.request(path, {
            headers: { ...fromAddress(), "user-agent": "SyntheticCrawler/2.0" },
          });

          const prefetch = yield* app.request(path, {
            headers: {
              ...fromAddress(),
              "sec-purpose": "prefetch",
              "user-agent": browser,
            },
          });

          const anonymous = yield* app.request(path, {
            headers: fromAddress(),
          });

          assert.deepStrictEqual(
            [crawler.status, prefetch.status, anonymous.status],
            [302, 302, 302]
          );
          assert.strictEqual(yield* clicksOf(code), 0);
        })
    );

    it.effect(
      "answers 404 in the error envelope for a code it does not know",
      () =>
        Effect.gen(function* unknown() {
          const app = yield* TestApp;

          const reply = yield* app.request("/api/l/Unknown", {
            headers: { ...fromAddress(), "user-agent": browser },
          });

          assert.strictEqual(reply.status, 404);
          assert.deepInclude(reply.body, {
            _tag: "NotFound",
            code: "not_found",
          });
        })
    );

    it.effect(
      "answers 404 while the part of the post that holds it is not live",
      () =>
        Effect.gen(function* notLive() {
          const app = yield* TestApp;

          const { path } = yield* issuedIn(
            "https://example.test/never-out",
            false
          );

          const reply = yield* app.request(path, {
            headers: { ...fromAddress(), "user-agent": browser },
          });

          assert.strictEqual(reply.status, 404);
          assert.isNull(reply.headers.get("location"));
        })
    );

    it.effect(
      "answers 410 once staff banned every owner of its workspace",
      () =>
        Effect.gen(function* banned() {
          const app = yield* TestApp;
          const { owner, path } = yield* issued("https://example.test/banned");

          yield* SqlClient.SqlClient.use(
            (sql) =>
              sql`UPDATE auth."user" SET banned = true WHERE id = ${owner.id}`
          ).pipe(Effect.orDie);

          const reply = yield* app.request(path, {
            headers: { ...fromAddress(), "user-agent": browser },
          });

          assert.strictEqual(reply.status, 410);
        })
    );

    it.effect("answers 410 for a link turned off", () =>
      Effect.gen(function* disabled() {
        const app = yield* TestApp;
        const { code, path } = yield* issued("https://example.test/off");

        yield* SqlClient.SqlClient.use(
          (sql) =>
            sql`UPDATE shortlinks.links SET disabled_at = now() WHERE code = ${code}`
        ).pipe(Effect.orDie);

        const reply = yield* app.request(path, {
          headers: { ...fromAddress(), "user-agent": browser },
        });

        assert.strictEqual(reply.status, 410);
        assert.deepInclude(reply.body, { _tag: "Gone", code: "gone" });
        assert.isNull(reply.headers.get("location"));
      })
    );
  }
);

layer(Test, { excludeTestServices: true, timeout: "120 seconds" })(
  "an address following short links too often",
  (it) => {
    it.effect(`is refused past ${String(redirectsPerMinute)} a minute`, () =>
      Effect.gen(function* limited() {
        const app = yield* TestApp;
        const headers = { ...fromAddress(), "user-agent": browser };

        const replies = yield* Effect.forEach(
          Array.from(
            { length: redirectsPerMinute + 1 },
            () => "/api/l/Missing"
          ),
          (path) => app.request(path, { headers })
        );

        assert.strictEqual(replies.at(-2)?.status, 404);
        assert.strictEqual(replies.at(-1)?.status, 429);
        assert.deepInclude(replies.at(-1)?.body, {
          _tag: "TooManyRequests",
          code: "too_many_requests",
        });

        const other = yield* app.request("/api/l/Missing", {
          headers: { ...fromAddress(), "user-agent": browser },
        });

        assert.strictEqual(other.status, 404);
      })
    );
  }
);
