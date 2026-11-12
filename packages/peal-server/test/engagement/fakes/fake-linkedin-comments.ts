import { Effect, Schema } from "effect";

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

/** The synthetic page a channel is, and its URN. */
export const linkedinPageNumber = "9000000001";
export const linkedinPageUrn = `urn:li:organization:${linkedinPageNumber}`;

/** The API version the fake serves. */
export const linkedinCommentsVersion = "202610";

/**
 * A comment the fake keeps: on a post's thread (`threadUrn`, which may be
 * an activity the post's URN is not), answering another (`parentUrn`) or
 * the post, by a member or a page (`actor`), at `time` (milliseconds).
 */
export interface FakeLinkedInComment {
  readonly actor: string;
  readonly id: string;
  readonly parentUrn?: string;
  readonly postUrn: string;
  readonly text: string;
  readonly threadUrn: string;
  readonly time: number;
}

/**
 * What the next request of a kind gets instead of the fake's own answer:
 * `summary` (GET socialActions/{urn}), `comments` (GET …/comments),
 * `create` (POST …/comments), `delete` (DELETE …/comments/{id}).
 */
export type LinkedInCommentsRoute =
  | "comments"
  | "create"
  | "delete"
  | "summary";

/** An error as LinkedIn's REST API writes one: its status repeated. */
export const linkedinError = (status: number, message = "synthetic") =>
  json({ message, status }, status);

const CreateSchema = Schema.Struct({
  actor: Schema.String,
  message: Schema.Struct({ text: Schema.String }),
  object: Schema.String,
  parentComment: Schema.optionalKey(Schema.String),
});

const decodeCreate = Schema.decodeUnknownSync(
  Schema.fromJsonString(CreateSchema)
);

// A comment as LinkedIn writes one.
interface CommentJson {
  readonly actor: string;
  readonly commentUrn: string;
  commentsSummary?: {
    readonly aggregatedTotalComments: number;
    readonly totalFirstLevelComments: number;
  };
  readonly created: { readonly actor: string; readonly time: number };
  readonly id: string;
  readonly message: { readonly text: string };
  readonly object: string;
  parentComment?: string;
}

const urnOf = (comment: FakeLinkedInComment) =>
  `urn:li:comment:(${comment.threadUrn},${comment.id})`;

// What a request asks, from its method and what follows the target.
const kindOf = (
  method: string,
  edge: string | undefined,
  id: string | undefined
): LinkedInCommentsRoute | undefined => {
  if (edge === undefined) {
    return method === "GET" ? "summary" : undefined;
  }

  if (id !== undefined) {
    return method === "DELETE" ? "delete" : undefined;
  }

  return method === "POST" ? "create" : "comments";
};

const pathPattern =
  /^\/rest\/socialActions\/(?<target>.+?)(?<edge>\/comments(?:\/(?<id>[^/]+))?)?$/u;

/**
 * LinkedIn's Social Actions and Comments APIs for the posts the fake was
 * given (`addPost`): a post's summary, which shows no `commentsSummary`
 * without comments; its comments, which answer 404 when there are none;
 * a comment's nested comments under its URN; a comment made as the page;
 * one deleted by its author. Calls need a token of `tokens` and the
 * version the fake serves. `script` answers a kind of request first;
 * `lose` makes the next comment, then drops the connection.
 */
export const fakeLinkedInComments = Effect.fnUntraced(
  function* fakeLinkedInComments(tokens: readonly string[]) {
    const script = scripted<PlatformAnswer>();
    const lost = scripted<true>();
    // Each post's URN, with the thread its comments are on.
    const posts = new Map<string, string>();
    const comments: FakeLinkedInComment[] = [];
    let made = 0;
    let clock = 1_762_765_200_000;

    const under = (target: string) =>
      target.startsWith("urn:li:comment:")
        ? comments.filter((comment) => comment.parentUrn === target)
        : comments.filter(
            (comment) =>
              comment.postUrn === target && comment.parentUrn === undefined
          );

    const commentJson = (comment: FakeLinkedInComment): JsonValue => {
      const nested = under(urnOf(comment)).length;

      const shown: CommentJson = {
        actor: comment.actor,
        commentUrn: urnOf(comment),
        created: { actor: comment.actor, time: comment.time },
        id: comment.id,
        message: { text: comment.text },
        object: comment.postUrn,
      };

      if (comment.parentUrn !== undefined) {
        shown.parentComment = comment.parentUrn;
      } else if (nested > 0) {
        shown.commentsSummary = {
          aggregatedTotalComments: nested,
          totalFirstLevelComments: nested,
        };
      }

      return { ...shown };
    };

    const summary = (target: string): PlatformAnswer => {
      if (!posts.has(target)) {
        return linkedinError(404, "Not Found");
      }

      const total = comments.filter((c) => c.postUrn === target).length;
      const top = under(target).length;

      return json(
        total === 0
          ? {}
          : {
              commentsSummary: {
                aggregatedTotalComments: total,
                commentsState: "OPEN",
                totalFirstLevelComments: top,
              },
            }
      );
    };

    const list = (target: string, query: URLSearchParams): PlatformAnswer => {
      const found = under(target);

      // "If no comments … are available for a share, a request to fetch
      // comments … returns 404 - Not Found."
      if (found.length === 0) {
        return linkedinError(404, "Not Found");
      }

      const start = Number(query.get("start") ?? "0");
      const count = Number(query.get("count") ?? "10");

      return json({
        elements: found.slice(start, start + count).map(commentJson),
        paging: { count, start, total: found.length },
      });
    };

    const create = (target: string, request: PlatformRequest) => {
      const body = decodeCreate(textOf(request));

      if (body.actor !== linkedinPageUrn) {
        return linkedinError(403, "Not enough permissions");
      }

      const parent = comments.find((comment) => urnOf(comment) === target);

      if (!posts.has(target) && parent === undefined) {
        return linkedinError(404, "Not Found");
      }

      made += 1;
      clock += 60_000;

      const comment: FakeLinkedInComment = {
        actor: body.actor,
        id: `7000000000000${String(made)}`,
        postUrn: body.object,
        text: body.message.text,
        threadUrn: parent?.threadUrn ?? posts.get(target) ?? target,
        time: clock,
      };

      const placed =
        parent === undefined
          ? comment
          : { ...comment, parentUrn: urnOf(parent) };

      comments.push(placed);

      return lost.next("create") === undefined
        ? json(commentJson(placed), 201, { "x-restli-id": placed.id })
        : dropped;
    };

    const remove = (target: string, id: string, query: URLSearchParams) => {
      const index = comments.findIndex(
        (comment) => comment.postUrn === target && comment.id === id
      );

      if (index === -1) {
        return linkedinError(404, "Not Found");
      }

      if (comments[index]?.actor !== query.get("actor")) {
        return linkedinError(403, "Not enough permissions");
      }

      comments.splice(index, 1);

      return empty(204);
    };

    const handle = (request: PlatformRequest): PlatformAnswer => {
      const token = headerOf(request, "authorization").replace(/^Bearer /u, "");

      if (!tokens.includes(token)) {
        return json(
          {
            message: "Invalid access token",
            serviceErrorCode: 65_600,
            status: 401,
          },
          401
        );
      }

      if (headerOf(request, "linkedin-version") !== linkedinCommentsVersion) {
        return linkedinError(426, "Requested version is not active");
      }

      if (request.path === `/rest/organizations/${linkedinPageNumber}`) {
        return json({ id: Number(linkedinPageNumber) });
      }

      const matched = pathPattern.exec(request.path)?.groups;
      const target = matched?.["target"] ?? "";
      const id = matched?.["id"];
      const edge = matched?.["edge"];

      const kind = kindOf(request.method, edge, id);

      if (matched === undefined || kind === undefined) {
        return linkedinError(404, "Not Found");
      }

      const answer = script.next(kind);

      if (answer !== undefined) {
        return answer;
      }

      if (kind === "summary") {
        return summary(target);
      }

      if (kind === "comments") {
        return list(target, request.query);
      }

      return kind === "create"
        ? create(target, request)
        : remove(target, id ?? "", request.query);
    };

    const server = yield* platformServer(handle);

    return {
      ...server,
      add: (comment: FakeLinkedInComment) => {
        comments.push(comment);
      },
      addPost: (postUrn: string, threadUrn: string = postUrn) => {
        posts.set(postUrn, threadUrn);
      },
      comments: () => [...comments],
      lose: () => {
        lost.push("create", [true]);
      },
      script: (
        route: LinkedInCommentsRoute,
        answers: readonly PlatformAnswer[]
      ) => {
        script.push(route, answers);
      },
      urnOf,
    };
  }
);
