import { Effect } from "effect";

import {
  headerOf,
  json,
  platformServer,
  scripted,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

/** A status's counts, as the instance keeps them. */
export interface FakeCounts {
  readonly favourites: number;
  /** Absent on servers before 4.5. */
  readonly quotes?: number;
  readonly reblogs: number;
  readonly replies: number;
}

export interface FakeStatusesOptions {
  /** Statuses by id; any other id answers 404. */
  readonly statuses: Readonly<Record<string, FakeCounts>>;
  /** Tokens that may read; any other token answers 401. */
  readonly tokens?: readonly string[];
  /** Whether a request without a token answers 401, as some servers do. */
  readonly signedInOnly?: boolean;
  /** The X-RateLimit-Remaining each answer gives, counting down from it. */
  readonly remaining?: number;
}

const statusPattern = /^\/api\/v1\/statuses\/(?<id>[^/]+)$/u;

/**
 * A Mastodon server answering GET /api/v1/statuses/:id with a status's
 * counts, as Mastodon's API reference documents it. `script` replaces the
 * next answers to a route (`GET /api/v1/statuses/<id>`).
 */
export const fakeStatuses = Effect.fnUntraced(function* fakeStatuses(
  options: FakeStatusesOptions
) {
  const tokens = new Set(options.tokens);
  const scripts = scripted<PlatformAnswer>();
  let remaining = options.remaining ?? 300;

  const answer = (request: PlatformRequest, origin: string): PlatformAnswer => {
    const route = `${request.method} ${request.path}`;
    const id = statusPattern.exec(request.path)?.groups?.["id"];
    const scriptedAnswer = scripts.next(route);

    remaining -= 1;

    const limits = {
      "x-ratelimit-limit": "300",
      "x-ratelimit-remaining": String(Math.max(remaining, 0)),
      "x-ratelimit-reset": "2026-11-09T12:05:00.000Z",
    };

    if (scriptedAnswer !== undefined) {
      return scriptedAnswer;
    }

    if (request.method !== "GET" || id === undefined) {
      return json({ error: "Not found" }, 404, limits);
    }

    const token = headerOf(request, "authorization").replace(/^Bearer /u, "");

    if (token !== "" && !tokens.has(token)) {
      return json({ error: "The access token is invalid" }, 401, limits);
    }

    if (token === "" && options.signedInOnly === true) {
      return json(
        { error: "This API requires an authenticated user" },
        401,
        limits
      );
    }

    const counts = options.statuses[id];

    if (counts === undefined) {
      return json({ error: "Record not found" }, 404, limits);
    }

    const status = {
      favourites_count: counts.favourites,
      id,
      reblogs_count: counts.reblogs,
      replies_count: counts.replies,
      uri: `${origin}/users/alice/statuses/${id}`,
      url: `${origin}/@alice/${id}`,
    };

    // Servers before 4.5 do not count quotes.
    return json(
      counts.quotes === undefined
        ? status
        : { ...status, quotes_count: counts.quotes },
      200,
      limits
    );
  };

  const server = yield* platformServer(answer);

  return {
    ...server,
    /** Replaces the next answers to a status. */
    script: (id: string, answers: readonly PlatformAnswer[]) => {
      scripts.push(`GET /api/v1/statuses/${id}`, answers);
    },
  };
});
