import { once } from "node:events";
import { createServer } from "node:http";
import type { IncomingHttpHeaders, ServerResponse } from "node:http";

import { Effect, Layer, Schema } from "effect";
import { Dns } from "effect/net";

import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

// A host serving feeds on the loopback, standing for a site a member
// follows, and the guard tests reach it with.

/** How the host answers one request, given its headers. */
export type FeedAnswer = (
  response: ServerResponse,
  headers: IncomingHttpHeaders
) => void;

/** A request the host was sent: its path and headers. */
export interface ReceivedRequest {
  readonly headers: IncomingHttpHeaders;
  readonly path: string;
}

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

/**
 * A host serving `answers` by path, and what it was sent, closed with the
 * scope. `answers` may change while it runs: it is read on each request.
 */
export const feedHost = (answers: Map<string, FeedAnswer>) =>
  Effect.acquireRelease(
    Effect.promise(async () => {
      const received: ReceivedRequest[] = [];

      const server = createServer((request, response) => {
        const path = request.url ?? "";

        received.push({ headers: request.headers, path });

        const answer = answers.get(path);

        if (answer === undefined) {
          response.writeHead(404).end();
        } else {
          answer(response, request.headers);
        }
      });

      server.listen(0, "127.0.0.1");
      await once(server, "listening");

      return {
        received,
        server,
        url: `http://127.0.0.1:${decodeAddress(server.address()).port}`,
      };
    }),
    ({ server }) =>
      Effect.promise(async () => {
        server.closeAllConnections();
        server.close();
        await once(server, "close");
      })
  );

const rssType = {
  "content-type": "application/rss+xml",
};

const noHeaders = {};

/** A whole answer with a body. */
export const serving =
  (
    body: string | Uint8Array,
    headers: Readonly<Record<string, string>> = rssType
  ): FeedAnswer =>
  (response) => {
    response.writeHead(200, headers).end(body);
  };

/** A redirect to `location`. */
export const redirectingTo =
  (location: string): FeedAnswer =>
  (response) => {
    response.writeHead(302, { location }).end();
  };

/** An answer with a status and no body. */
export const answering =
  (
    status: number,
    headers: Readonly<Record<string, string>> = noHeaders
  ): FeedAnswer =>
  (response) => {
    response.writeHead(status, headers).end();
  };

/** An RSS 2.0 document of these items, each with a guid, newest first. */
export const rssOf = (
  items: readonly {
    readonly guid: string;
    readonly title?: string;
    readonly link?: string;
    readonly picture?: string;
  }[],
  title = "A synthetic blog"
) =>
  `<?xml version="1.0"?><rss version="2.0"><channel><title>${title}</title>${items
    .map(
      (item) =>
        `<item><guid isPermaLink="false">${item.guid}</guid>${
          item.title === undefined ? "" : `<title>${item.title}</title>`
        }${item.link === undefined ? "" : `<link>${item.link}</link>`}${
          item.picture === undefined
            ? ""
            : `<enclosure url="${item.picture}" type="image/png" length="1"/>`
        }</item>`
    )
    .join("")}</channel></rss>`;

/**
 * The outbound guard as the server runs it, but for the loopback, where
 * the tests' hosts are: any other name is resolved as a resolver set up
 * by an attacker would answer, to an address inside.
 */
export const LoopbackOnlyGuard = Layer.effect(
  OutboundGuard,
  Effect.gen(function* LoopbackOnlyGuard() {
    const real = yield* OutboundGuard;

    return OutboundGuard.of({
      check: (url) =>
        url.hostname === "127.0.0.1" ? Effect.void : real.check(url),
    });
  })
).pipe(
  Layer.provide(
    OutboundGuard.layer.pipe(
      Layer.provide(
        Dns.layerStatic({
          hosts: {
            "inside.example": ["10.0.0.5"],
            "metadata.example": ["169.254.169.254"],
            "rebound.example": ["93.184.215.14", "127.0.0.1"],
          },
        })
      )
    )
  )
);
