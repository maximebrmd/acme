import { Effect } from "effect";

import {
  json,
  platformServer,
  scripted,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

/** A post's counts, as the AppView shows them; absent counts are left out. */
export interface FakePostCounts {
  readonly likeCount?: number;
  readonly quoteCount?: number;
  readonly replyCount?: number;
  readonly repostCount?: number;
}

const route = "GET /xrpc/app.bsky.feed.getPosts";

/**
 * A Bluesky AppView answering app.bsky.feed.getPosts, as its lexicon says:
 * a post view for each AT-URI it knows, at most 25 asked at once, and
 * nothing for the others. `script` replaces its next answers.
 */
export const fakeAppView = Effect.fnUntraced(function* fakeAppView(
  posts: Readonly<Record<string, FakePostCounts>>
) {
  const scripts = scripted<PlatformAnswer>();

  const answer = (request: PlatformRequest): PlatformAnswer => {
    const scriptedAnswer = scripts.next(`${request.method} ${request.path}`);

    if (scriptedAnswer !== undefined) {
      return scriptedAnswer;
    }

    if (`${request.method} ${request.path}` !== route) {
      return json({ error: "MethodNotImplemented" }, 501);
    }

    const uris = request.query.getAll("uris");

    if (uris.length > 25) {
      return json(
        {
          error: "InvalidRequest",
          message: "uris must not have more than 25 elements",
        },
        400
      );
    }

    return json({
      posts: uris.flatMap((uri) => {
        const counts = posts[uri];

        return counts === undefined
          ? []
          : [
              {
                author: { did: uri.split("/")[2] ?? "", handle: "alice.test" },
                cid: "bafyreib2rxk3rybk3aobmv5cjuql3bm2twh4jo5uxgf5f3lh3qxdpa6bzq",
                indexedAt: "2026-11-09T10:00:00.000Z",
                record: {
                  $type: "app.bsky.feed.post",
                  text: "A synthetic post",
                },
                uri,
                ...counts,
              },
            ];
      }),
    });
  };

  const server = yield* platformServer(answer);

  return {
    ...server,
    /** Replaces the next answers to getPosts. */
    script: (answers: readonly PlatformAnswer[]) => {
      scripts.push(route, answers);
    },
  };
});
