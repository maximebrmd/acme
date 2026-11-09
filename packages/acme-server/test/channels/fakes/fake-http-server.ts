import { once } from "node:events";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { text } from "node:stream/consumers";

import { Effect, Schema } from "effect";

/** A request a fake platform received. */
export interface FakeRequest {
  readonly body: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly method: string;
  readonly path: string;
  readonly query: URLSearchParams;
}

export type JsonValue = typeof Schema.Json.Type;

/** What a fake platform answers. */
export interface FakeResponse {
  readonly body?: JsonValue;
  readonly headers?: Readonly<Record<string, string>>;
  readonly status: number;
}

export interface FakeHttpServer {
  /** The server's origin, as `http://127.0.0.1:<port>`. */
  readonly url: string;
  /** Every request received so far, in order. */
  readonly requests: () => readonly FakeRequest[];
}

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

// Every answer closes its connection: a client reusing one the server is
// about to drop would fail its next request for no reason of the test's.
const send = (response: ServerResponse, answer: FakeResponse) => {
  if (answer.body === undefined) {
    response.writeHead(answer.status, {
      connection: "close",
      ...answer.headers,
    });
    response.end();

    return;
  }

  response.writeHead(answer.status, {
    connection: "close",
    "content-type": "application/json",
    ...answer.headers,
  });
  response.end(JSON.stringify(answer.body));
};

/**
 * A real HTTP server on a free loopback port, answering with `handle`, for
 * the life of the scope: platform clients talk HTTP to it as they would to
 * the platform, and nothing leaves the machine.
 */
export const fakeHttpServer = (
  handle: (request: FakeRequest, origin: string) => FakeResponse
) =>
  Effect.acquireRelease(
    Effect.promise(async () => {
      const received: FakeRequest[] = [];
      let origin = "";

      const answer = async (
        incoming: IncomingMessage,
        response: ServerResponse
      ) => {
        const body = await text(incoming);
        const url = new URL(incoming.url ?? "/", origin);

        const request: FakeRequest = {
          body,
          headers: incoming.headers,
          method: incoming.method ?? "GET",
          path: decodeURIComponent(url.pathname),
          query: url.searchParams,
        };

        received.push(request);
        send(response, handle(request, origin));
      };

      const server = createServer((incoming, response) => {
        void answer(incoming, response);
      });

      server.listen(0, "127.0.0.1");
      await once(server, "listening");

      origin = `http://127.0.0.1:${decodeAddress(server.address()).port}`;

      const fake: FakeHttpServer = {
        requests: () => [...received],
        url: origin,
      };

      return { fake, server };
    }),
    ({ server }) =>
      Effect.promise(async () => {
        server.closeAllConnections();
        server.close();
        await once(server, "close");
      })
  ).pipe(Effect.map(({ fake }) => fake));

/** A JSON answer. */
export const json = (body: JsonValue, status = 200): FakeResponse => ({
  body,
  status,
});

/** The form fields of a request's body. */
export const formOf = (request: FakeRequest): URLSearchParams =>
  new URLSearchParams(request.body);
