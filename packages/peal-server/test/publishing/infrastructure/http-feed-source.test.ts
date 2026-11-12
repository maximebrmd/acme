import { assert, layer } from "@effect/vitest";
import { Effect, Fiber, Layer, Option } from "effect";
import { Digest } from "effect/crypto";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";

import { FeedSource } from "#publishing/application/feed-source.ts";
import { FeedAddressSchema } from "#publishing/domain/feed-address.ts";
import { maxFeedBytes } from "#publishing/domain/feed.ts";
import type { FeedValidators } from "#publishing/domain/feed.ts";
import { HttpFeedSource } from "#publishing/infrastructure/feeds/http-feed-source.ts";
import {
  answering,
  feedHost,
  LoopbackOnlyGuard,
  redirectingTo,
  rssOf,
  serving,
} from "#test/publishing/fakes/feed-host.ts";
import type { FeedAnswer } from "#test/publishing/fakes/feed-host.ts";

// The feed source against a loopback host: what it sends, what it reads,
// and every way it refuses. Only the loopback passes the guard; any other
// host is checked as the server checks it.

const SourceTest = HttpFeedSource.pipe(
  Layer.provide(
    Layer.mergeAll(
      LoopbackOnlyGuard,
      FetchHttpClient.layer,
      Digest.layerWebCrypto
    )
  )
);

const none: FeedValidators = {
  etag: Option.none(),
  lastModified: Option.none(),
};

const reading = (url: string, validators: FeedValidators = none) =>
  FeedSource.use((source) =>
    source.read(FeedAddressSchema.make(url), validators)
  );

const failureOf = (url: string) =>
  reading(url).pipe(
    Effect.flip,
    Effect.map(({ failure }) => failure)
  );

const hostWith = (answers: Record<string, FeedAnswer>) =>
  feedHost(new Map(Object.entries(answers)));

// A feed of exactly `size` bytes, a comment making up the length.
const padded = (size: number) => {
  const start = `<?xml version="1.0"?><rss version="2.0"><channel><title>Big</title>`;
  const end = "</channel></rss>";

  return `${start}<!--${"x".repeat(size - start.length - end.length - 7)}-->${end}`;
};

const oneItem = rssOf([{ guid: "synthetic-1", title: "One" }]);

layer(SourceTest)("reading a feed", (it) => {
  it.effect("reads it as a feed reader, and keeps its validators", () =>
    Effect.gen(function* readsFeed() {
      const host = yield* hostWith({
        "/feed": serving(oneItem, {
          "content-type": "text/html",
          etag: '"v1"',
          "last-modified": "Mon, 15 Jun 2026 07:00:00 GMT",
        }),
      });

      const read = yield* reading(`${host.url}/feed`);

      assert.strictEqual(read._tag, "read");

      if (read._tag === "read") {
        assert.lengthOf(read.document.items, 1);
        assert.match(read.document.items[0]?.digest ?? "", /^[0-9a-f]{64}$/u);
        assert.deepStrictEqual(read.validators.etag, Option.some('"v1"'));
      }

      const [request] = host.received;

      assert.include(request?.headers.accept ?? "", "application/rss+xml");
      assert.match(request?.headers["user-agent"] ?? "", /^Peal feed reader/u);
      assert.isUndefined(request?.headers.cookie);
      assert.isUndefined(request?.headers.authorization);
    })
  );

  it.effect("sends the last read's validators back, and takes a 304", () =>
    Effect.gen(function* conditional() {
      const host = yield* hostWith({
        "/feed": (response, headers) => {
          if (headers["if-none-match"] === '"v1"') {
            response.writeHead(304).end();
          } else {
            response.writeHead(200).end(oneItem);
          }
        },
      });

      const read = yield* reading(`${host.url}/feed`, {
        etag: Option.some('"v1"'),
        lastModified: Option.some("Mon, 15 Jun 2026 07:00:00 GMT"),
      });

      assert.strictEqual(read._tag, "notModified");
      assert.strictEqual(
        host.received[0]?.headers["if-modified-since"],
        "Mon, 15 Jun 2026 07:00:00 GMT"
      );
    })
  );

  it.effect("follows three redirects, and refuses a fourth", () =>
    Effect.gen(function* redirects() {
      const host = yield* hostWith({
        "/feed": serving(oneItem),
        "/r1": redirectingTo("/r2"),
        "/r2": redirectingTo("/r3"),
        "/r3": redirectingTo("/feed"),
        "/r4": redirectingTo("/r1"),
      });

      assert.strictEqual((yield* reading(`${host.url}/r1`))._tag, "read");
      assert.strictEqual(yield* failureOf(`${host.url}/r4`), "unreachable");
    })
  );

  it.effect(
    "refuses a redirect to a host inside, as the guard resolves it",
    () =>
      Effect.gen(function* insideAfterRedirect() {
        const host = yield* hostWith({
          "/cloud": redirectingTo("https://metadata.example/latest/meta-data"),
          "/inside": redirectingTo("https://inside.example/feed"),
          "/literal": redirectingTo("https://[::1]/feed"),
          "/mixed": redirectingTo("https://rebound.example/feed"),
          "/plain": redirectingTo("http://inside.example/feed"),
        });

        for (const path of [
          "/inside",
          "/cloud",
          "/literal",
          "/mixed",
          "/plain",
        ]) {
          assert.strictEqual(yield* failureOf(`${host.url}${path}`), "refused");
        }
      })
  );

  it.effect("refuses an address inside before sending anything", () =>
    Effect.gen(function* insideFirst() {
      assert.strictEqual(
        yield* failureOf("https://inside.example/feed"),
        "refused"
      );
      assert.strictEqual(yield* failureOf("https://10.1.2.3/feed"), "refused");
      assert.strictEqual(yield* failureOf("https://[fe80::1]/feed"), "refused");
    })
  );

  it.effect("refuses a body over the limit, and reads one at it", () =>
    Effect.gen(function* tooLarge() {
      const host = yield* hostWith({
        "/at": serving(padded(maxFeedBytes)),
        "/over": serving(padded(maxFeedBytes + 1)),
      });

      assert.strictEqual((yield* reading(`${host.url}/at`))._tag, "read");
      assert.strictEqual(yield* failureOf(`${host.url}/over`), "tooLarge");
    })
  );

  it.effect("expands no entity a DOCTYPE declares", () =>
    Effect.gen(function* entities() {
      const host = yield* hostWith({
        "/feed": serving(
          `<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY a "Expanded"><!ENTITY b SYSTEM "file:///etc/passwd">]><rss version="2.0"><channel><title>&a;&b;</title></channel></rss>`
        ),
      });

      assert.strictEqual(yield* failureOf(`${host.url}/feed`), "notAFeed");
    })
  );

  it.effect("tells what is not a feed from its content", () =>
    Effect.gen(function* notAFeed() {
      const host = yield* hostWith({
        "/html": serving("<html><body>A page</body></html>", {
          "content-type": "application/rss+xml",
        }),
        "/json": serving('{"version":"1.0","items":[]}', {
          "content-type": "application/feed+json",
        }),
        "/jsonfeed": serving(
          '{"version":"https://jsonfeed.org/version/1.1","title":"T","items":[{"id":"1","content_text":"x"}]}',
          { "content-type": "text/plain" }
        ),
      });

      assert.strictEqual(yield* failureOf(`${host.url}/html`), "notAFeed");
      assert.strictEqual(yield* failureOf(`${host.url}/json`), "notAFeed");
      assert.strictEqual((yield* reading(`${host.url}/jsonfeed`))._tag, "read");
    })
  );

  it.effect("says what the host answered, and how long it asked to wait", () =>
    Effect.gen(function* statuses() {
      const host = yield* hostWith({
        "/busy": answering(429, { "retry-after": "120" }),
        "/down": answering(503),
        "/forbidden": answering(403),
        "/gone": answering(410),
      });

      const busy = yield* reading(`${host.url}/busy`).pipe(Effect.flip);

      assert.strictEqual(busy.failure, "rateLimited");
      assert.deepStrictEqual(busy.retryAfterSeconds, Option.some(120));
      assert.strictEqual(yield* failureOf(`${host.url}/down`), "serverError");
      assert.strictEqual(yield* failureOf(`${host.url}/missing`), "notFound");
      assert.strictEqual(yield* failureOf(`${host.url}/gone`), "gone");
      assert.strictEqual(
        yield* failureOf(`${host.url}/forbidden`),
        "unreachable"
      );
    })
  );

  it.effect("gives up on a host that does not answer in time", () =>
    Effect.gen(function* slow() {
      const host = yield* hostWith({
        "/slow": () => {
          // Never answers.
        },
      });

      const fiber = yield* failureOf(`${host.url}/slow`).pipe(Effect.forkChild);

      yield* TestClock.adjust("21 seconds");

      assert.strictEqual(yield* Fiber.join(fiber), "timeout");
    })
  );
});
