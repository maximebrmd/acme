import { once } from "node:events";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buffer } from "node:stream/consumers";

import { Effect, Schema } from "effect";

/** A request a fake platform received, with its body's bytes. */
export interface PlatformRequest {
  readonly body: Uint8Array;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly method: string;
  readonly path: string;
  readonly query: URLSearchParams;
  /** The query as it was sent, undecoded, without its question mark. */
  readonly search: string;
}

export type JsonValue = typeof Schema.Json.Type;

/**
 * What a fake platform does with a request: answer it, or drop the
 * connection without answering, as a server that crashed or a network that
 * failed after the request arrived.
 */
export type PlatformAnswer =
  | {
      readonly _tag: "answer";
      readonly body?: JsonValue;
      readonly headers?: Readonly<Record<string, string>>;
      readonly status: number;
    }
  // JSON written as is, as numbers too large for JavaScript's.
  | { readonly _tag: "raw"; readonly body: string; readonly status: number }
  | { readonly _tag: "drop" };

export interface PlatformServer {
  /** The server's origin, as `http://127.0.0.1:<port>`. */
  readonly url: string;
  /** Every request received so far, in order. */
  readonly requests: () => readonly PlatformRequest[];
}

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

/** A JSON answer. */
export const json = (
  body: JsonValue,
  status = 200,
  headers: Readonly<Record<string, string>> = {}
): PlatformAnswer => ({ _tag: "answer", body, headers, status });

/** An answer without a body. */
export const empty = (
  status: number,
  headers: Readonly<Record<string, string>> = {}
): PlatformAnswer => ({ _tag: "answer", headers, status });

export const dropped: PlatformAnswer = { _tag: "drop" };

/** A JSON answer written as it is given. */
export const rawJson = (body: string, status = 200): PlatformAnswer => ({
  _tag: "raw",
  body,
  status,
});

/** The request's body as text. */
export const textOf = (request: PlatformRequest): string =>
  new TextDecoder().decode(request.body);

/** The request's body, as JSON read with `schema`. */
export const jsonBodyOf =
  <A, I>(schema: Schema.Codec<A, I>) =>
  (request: PlatformRequest): A =>
    Schema.decodeUnknownSync(Schema.fromJsonString(schema))(textOf(request));

/** A header, as one string. */
export const headerOf = (request: PlatformRequest, name: string): string => {
  const value = request.headers[name.toLowerCase()];

  return Array.isArray(value) ? value.join(", ") : (value ?? "");
};

/** A part of a multipart form. */
export interface FormPart {
  readonly contentType: string;
  readonly data: Uint8Array;
  readonly fileName: string | undefined;
  readonly name: string;
}

const crlf = Buffer.from("\r\n");

const partHeaders = (head: string) => {
  const disposition =
    /name="(?<name>[^"]*)"(?:; filename="(?<file>[^"]*)")?/u.exec(head)?.groups;

  return {
    contentType:
      /content-type: (?<type>[^\r\n]+)/iu.exec(head)?.groups?.["type"] ?? "",
    fileName: disposition?.["file"],
    name: disposition?.["name"] ?? "",
  };
};

/**
 * The parts of the request's multipart form (RFC 7578): enough of the
 * format for what clients send a fake.
 */
export const formPartsOf = (request: PlatformRequest): readonly FormPart[] => {
  const boundary = /boundary=(?<boundary>[^;]+)/u.exec(
    headerOf(request, "content-type")
  )?.groups?.["boundary"];

  if (boundary === undefined) {
    return [];
  }

  const body = Buffer.from(request.body);
  const delimiter = Buffer.from(`--${boundary.replaceAll('"', "")}`);
  const parts: FormPart[] = [];
  let start = body.indexOf(delimiter);

  while (start !== -1) {
    const headStart = start + delimiter.length + crlf.length;
    const next = body.indexOf(delimiter, headStart);

    if (next === -1) {
      break;
    }

    const headEnd = body.indexOf("\r\n\r\n", headStart);
    const head = body.subarray(headStart, headEnd).toString();

    parts.push({
      ...partHeaders(head),
      data: new Uint8Array(body.subarray(headEnd + 4, next - crlf.length)),
    });

    start = next;
  }

  return parts;
};

// Every answer closes its connection: a client reusing one the server is
// about to drop would fail its next request for no reason of the test's.
const send = (response: ServerResponse, answer: PlatformAnswer) => {
  if (answer._tag === "drop") {
    response.socket?.destroy();

    return;
  }

  if (answer._tag === "raw") {
    response.writeHead(answer.status, {
      connection: "close",
      "content-type": "application/json",
    });
    response.end(answer.body);

    return;
  }

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
 * the life of the scope: the adapters talk HTTP to it as they would to the
 * platform, and nothing leaves the machine.
 */
export const platformServer = (
  handle: (
    request: PlatformRequest,
    origin: string
  ) => PlatformAnswer | Promise<PlatformAnswer>
) =>
  Effect.acquireRelease(
    Effect.promise(async () => {
      const received: PlatformRequest[] = [];
      let origin = "";

      const answer = async (
        incoming: IncomingMessage,
        response: ServerResponse
      ) => {
        const body = new Uint8Array(await buffer(incoming));
        const url = new URL(incoming.url ?? "/", origin);

        const request: PlatformRequest = {
          body,
          headers: incoming.headers,
          method: incoming.method ?? "GET",
          path: decodeURIComponent(url.pathname),
          query: url.searchParams,
          search: (incoming.url ?? "").split("?").slice(1).join("?"),
        };

        received.push(request);
        send(response, await handle(request, origin));
      };

      const server = createServer((incoming, response) => {
        void answer(incoming, response);
      });

      server.listen(0, "127.0.0.1");
      await once(server, "listening");

      origin = `http://127.0.0.1:${decodeAddress(server.address()).port}`;

      const fake: PlatformServer = {
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

/**
 * Answers queued per route (`METHOD /path`), each used once, before the
 * fake's own behaviour: a test's way to make one call fail.
 */
export const scripted = <A>() => {
  const queues = new Map<string, A[]>();

  return {
    next: (route: string): A | undefined => queues.get(route)?.shift(),
    push: (route: string, answers: readonly A[]) => {
      queues.set(route, [...(queues.get(route) ?? []), ...answers]);
    },
    /** Puts an answer back, to be used first. */
    putBack: (route: string, answer: A) => {
      queues.set(route, [answer, ...(queues.get(route) ?? [])]);
    },
  };
};
