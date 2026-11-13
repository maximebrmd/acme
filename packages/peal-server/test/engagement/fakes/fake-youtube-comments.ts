import { Effect, Layer, Schema } from "effect";

import { PlatformQuota } from "#publishing/application/platform-quota.ts";
import {
  dropped,
  empty,
  headerOf,
  json,
  platformServer,
  scripted,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

/** The synthetic channel the fake's token signs in as. */
export const youtubeChannelId = "UCsyntheticChannel000001";

/**
 * A comment the fake keeps: under a video, answering a top-level comment
 * (`parentId`) or the video, by a channel (`authorChannelId`, missing
 * when YouTube would not say), shown or rejected.
 */
export interface FakeYouTubeComment {
  readonly authorChannelId?: string;
  readonly authorDisplayName: string;
  readonly id: string;
  readonly parentId?: string;
  readonly publishedAt: string;
  readonly text: string;
  readonly videoId: string;
  status: "heldForReview" | "published" | "rejected";
}

export interface FakeYouTubeCommentsOptions {
  /** The replies a thread embeds before comments.list gives the rest. */
  readonly embeddedReplies?: number;
  /** When the replies the fake makes were written. */
  readonly now?: string;
}

/** An error as the YouTube Data API writes one. */
export const youtubeError = (status: number, reason: string): PlatformAnswer =>
  json(
    {
      error: {
        code: status,
        errors: [{ domain: "youtube.synthetic", message: "synthetic", reason }],
        message: "synthetic",
      },
    },
    status
  );

const InsertSchema = Schema.Struct({
  snippet: Schema.Struct({
    parentId: Schema.String,
    textOriginal: Schema.String,
  }),
});

// A comment's snippet, and a thread, as the API writes them.
interface CommentSnippetJson {
  authorChannelId?: { readonly value: string };
  readonly authorDisplayName: string;
  readonly moderationStatus: string;
  parentId?: string;
  readonly publishedAt: string;
  readonly textDisplay: string;
  textOriginal?: string;
  readonly updatedAt: string;
  readonly videoId: string;
}

interface ThreadJson {
  readonly id: string;
  readonly kind: string;
  replies?: { readonly comments: readonly JsonValue[] };
  readonly snippet: JsonValue;
}

const decodeInsert = Schema.decodeUnknownSync(
  Schema.fromJsonString(InsertSchema)
);

// A page of `items` from `pageToken` (an index), `maxResults` long.
const paged = (
  items: readonly JsonValue[],
  query: URLSearchParams
): JsonValue => {
  const start = Number(query.get("pageToken") ?? "0");
  const size = Number(query.get("maxResults") ?? "20");
  const end = start + size;

  return end < items.length
    ? { items: items.slice(start, end), nextPageToken: String(end) }
    : { items: items.slice(start, end) };
};

/**
 * The YouTube Data API's comment methods, as their references describe
 * them, for the videos the fake was given (`addVideo`): commentThreads.list
 * (shown top-level comments, newest first, with a few of their replies),
 * comments.list by `parentId`, comments.insert (a reply under a top-level
 * comment, as the signed-in channel), comments.delete (the channel's own
 * only) and comments.setModerationStatus. Calls need a token of
 * `tokens`. `script` answers a route (`METHOD /path`) first; `lose` makes
 * the next insert or delete happen, then drops the connection.
 */
export const fakeYouTubeComments = Effect.fnUntraced(
  function* fakeYouTubeComments(
    tokens: readonly string[],
    options: FakeYouTubeCommentsOptions = {}
  ) {
    const embedded = options.embeddedReplies ?? 5;
    const now = options.now ?? "2026-11-10T09:30:00Z";
    const script = scripted<PlatformAnswer>();
    const lost = scripted<true>();
    const comments = new Map<string, FakeYouTubeComment>();
    const videos = new Set<string>();
    const disabled = new Set<string>();
    let made = 0;

    const commentJson = (comment: FakeYouTubeComment): JsonValue => {
      const snippet: CommentSnippetJson = {
        authorDisplayName: comment.authorDisplayName,
        // Shown to the channel's owner.
        moderationStatus: comment.status,
        publishedAt: comment.publishedAt,
        textDisplay: comment.text,
        updatedAt: comment.publishedAt,
        videoId: comment.videoId,
      };

      if (comment.authorChannelId !== undefined) {
        snippet.authorChannelId = { value: comment.authorChannelId };
      }

      if (comment.parentId !== undefined) {
        snippet.parentId = comment.parentId;
      }

      // The original only to its author.
      if (comment.authorChannelId === youtubeChannelId) {
        snippet.textOriginal = comment.text;
      }

      return {
        id: comment.id,
        kind: "youtube#comment",
        snippet: { ...snippet },
      };
    };

    const shown = (comment: FakeYouTubeComment) =>
      comment.status === "published";

    const newestFirst = (left: FakeYouTubeComment, right: FakeYouTubeComment) =>
      right.publishedAt.localeCompare(left.publishedAt);

    const repliesOf = (parentId: string) =>
      [...comments.values()]
        .filter((comment) => comment.parentId === parentId && shown(comment))
        .toSorted((left, right) =>
          left.publishedAt.localeCompare(right.publishedAt)
        );

    const threads = (request: PlatformRequest): PlatformAnswer => {
      const videoId = request.query.get("videoId") ?? "";

      if (!videos.has(videoId)) {
        return youtubeError(404, "videoNotFound");
      }

      if (disabled.has(videoId)) {
        return youtubeError(403, "commentsDisabled");
      }

      const withReplies = (request.query.get("part") ?? "").includes("replies");

      const items = [...comments.values()]
        .filter(
          (comment) =>
            comment.videoId === videoId &&
            comment.parentId === undefined &&
            shown(comment)
        )
        .toSorted(newestFirst)
        .map((top) => {
          const replies = repliesOf(top.id);

          const item: ThreadJson = {
            id: top.id,
            kind: "youtube#commentThread",
            snippet: {
              topLevelComment: commentJson(top),
              totalReplyCount: replies.length,
              videoId,
            },
          };

          if (withReplies && replies.length > 0) {
            item.replies = {
              comments: replies.slice(0, embedded).map(commentJson),
            };
          }

          return { ...item };
        });

      return json(paged(items, request.query));
    };

    const list = (request: PlatformRequest): PlatformAnswer => {
      const parentId = request.query.get("parentId") ?? "";

      return comments.has(parentId)
        ? json(paged(repliesOf(parentId).map(commentJson), request.query))
        : youtubeError(404, "commentNotFound");
    };

    const insert = (request: PlatformRequest): PlatformAnswer => {
      const { snippet } = decodeInsert(textOf(request));
      const parent = comments.get(snippet.parentId);

      if (parent === undefined) {
        return youtubeError(404, "parentCommentNotFound");
      }

      // YouTube answers replies to top-level comments only.
      if (parent.parentId !== undefined) {
        return youtubeError(400, "operationNotSupported");
      }

      made += 1;

      const reply: FakeYouTubeComment = {
        authorChannelId: youtubeChannelId,
        authorDisplayName: "@pealexample",
        id: `${parent.id}.synthetic${String(made)}`,
        parentId: parent.id,
        publishedAt: now,
        status: "published",
        text: snippet.textOriginal,
        videoId: parent.videoId,
      };

      comments.set(reply.id, reply);

      return lost.next("POST /youtube/v3/comments") === undefined
        ? json(commentJson(reply))
        : dropped;
    };

    const remove = (request: PlatformRequest): PlatformAnswer => {
      const found = comments.get(request.query.get("id") ?? "");

      if (found === undefined) {
        return youtubeError(404, "commentNotFound");
      }

      // "Only the comment's author can delete it."
      if (found.authorChannelId !== youtubeChannelId) {
        return youtubeError(403, "forbidden");
      }

      comments.delete(found.id);

      return lost.next("DELETE /youtube/v3/comments") === undefined
        ? empty(204)
        : dropped;
    };

    const moderate = (request: PlatformRequest): PlatformAnswer => {
      const found = comments.get(request.query.get("id") ?? "");
      const status = request.query.get("moderationStatus");

      if (found === undefined) {
        return youtubeError(404, "commentNotFound");
      }

      if (request.query.has("banAuthor")) {
        return youtubeError(400, "banWithoutReject");
      }

      if (status !== "published" && status !== "rejected") {
        return youtubeError(400, "processingFailure");
      }

      found.status = status;

      return empty(204);
    };

    const handle = (request: PlatformRequest): PlatformAnswer => {
      const route = `${request.method} ${request.path}`;
      const answer = script.next(route);

      if (answer !== undefined) {
        return answer;
      }

      const token = headerOf(request, "authorization").replace(/^Bearer /u, "");

      if (!tokens.includes(token)) {
        return youtubeError(401, "authError");
      }

      switch (route) {
        case "GET /youtube/v3/commentThreads": {
          return threads(request);
        }

        case "GET /youtube/v3/comments": {
          return list(request);
        }

        case "POST /youtube/v3/comments": {
          return insert(request);
        }

        case "DELETE /youtube/v3/comments": {
          return remove(request);
        }

        case "POST /youtube/v3/comments/setModerationStatus": {
          return moderate(request);
        }

        default: {
          return youtubeError(404, "notFound");
        }
      }
    };

    const server = yield* platformServer(handle);

    return {
      ...server,
      add: (
        comment: Omit<FakeYouTubeComment, "status"> & {
          readonly status?: FakeYouTubeComment["status"];
        }
      ) => {
        videos.add(comment.videoId);
        comments.set(comment.id, { status: "published", ...comment });
      },
      addVideo: (videoId: string) => {
        videos.add(videoId);
      },
      comment: (id: string) => comments.get(id),
      disable: (videoId: string) => {
        disabled.add(videoId);
      },
      lose: (route: string) => {
        lost.push(route, [true]);
      },
      script,
    };
  }
);

const key = (
  bucket: string,
  day: { readonly year: number; readonly month: number; readonly day: number }
) => `${bucket}:${String(day.year)}-${String(day.month)}-${String(day.day)}`;

/**
 * The server's ledger of quota days, in memory: units spent by bucket
 * and day, refused past the allowance, as Postgres does it.
 */
export const memoryQuota = () => {
  const spent = new Map<string, number>();

  const layer = Layer.succeed(
    PlatformQuota,
    PlatformQuota.of({
      exhaust: ({ allowance, bucket, day }) =>
        Effect.sync(() => {
          spent.set(
            key(bucket, day),
            Math.max(spent.get(key(bucket, day)) ?? 0, allowance)
          );
        }),
      purge: () => Effect.succeed(0),
      spend: ({ allowance, bucket, day, units }) =>
        Effect.sync(() => {
          const before = spent.get(key(bucket, day)) ?? 0;

          if (before + units > allowance) {
            return false;
          }

          spent.set(key(bucket, day), before + units);

          return true;
        }),
    })
  );

  return { layer, spent };
};
