import { createHmac } from "node:crypto";

import { Effect, Schema } from "effect";

import {
  facebookPageId,
  graphAppSecret,
  instagramUserId,
  metaError,
} from "#test/publishing/fakes/fake-meta-graph.ts";
import {
  dropped,
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

/**
 * A comment the fake keeps: under a post (`objectId`), answering a
 * comment (`parentId`) or the post, by someone (`from`, missing when Meta
 * would not show them), hidden or not.
 */
export interface FakeComment {
  readonly id: string;
  readonly objectId: string;
  readonly parentId?: string;
  readonly from?: { readonly id: string; readonly name: string };
  readonly text: string;
  readonly createdTime: string;
  hidden: boolean;
}

export interface FakeMetaCommentsOptions {
  /**
   * Plays graph.instagram.com for Instagram Login: its tokens carry no
   * proof, which the main app's would.
   */
  readonly instagramLogin?: boolean;
  /** The replies a top-level Instagram comment embeds before paging. */
  readonly embeddedReplies?: number;
  /** When the replies the fake makes were written. */
  readonly now?: string;
}

type Params = Readonly<Record<string, string>>;

// A value the fake answers, checked to be JSON.
const asJson = Schema.decodeUnknownSync(Schema.Json);

// A Page comment as Meta writes it.
interface FacebookCommentJson {
  created_time: string;
  from?: { id: string; name: string };
  id: string;
  message: string;
  parent?: { id: string };
}

// An Instagram comment as Meta writes it.
interface InstagramCommentJson {
  from?: { id: string; username: string };
  hidden: boolean;
  id: string;
  parent_id?: string;
  text: string;
  timestamp: string;
  user?: { id: string };
  username?: string;
}

const paramsOf = (request: PlatformRequest): Record<string, string> =>
  Object.fromEntries(
    request.method === "POST"
      ? new URLSearchParams(textOf(request))
      : request.query
  );

const proofOf = (token: string) =>
  createHmac("sha256", graphAppSecret).update(token).digest("hex");

// What Meta answers for an object it does not have (code 100, subcode 33).
const gone = json(
  { error: { code: 100, error_subcode: 33, message: "synthetic" } },
  400
);

const nodePattern =
  /^\/v27\.0\/(?<id>[\w-]+)(?:\/(?<edge>comments|replies))?$/u;

// A page of `items` from `after` (an index), `limit` long, with Graph's
// paging when more follow.
const pageOf = (
  items: readonly JsonValue[],
  params: Params,
  origin: string,
  path: string
): JsonValue => {
  const start = Number(params["after"] ?? "0");
  const limit = Number(params["limit"] ?? "25");
  const end = start + limit;
  const data = items.slice(start, end);

  return end < items.length
    ? {
        data,
        paging: {
          cursors: { after: String(end), before: String(start) },
          next: `${origin}${path}?after=${String(end)}`,
        },
      }
    : { data, paging: { cursors: { after: String(end) } } };
};

/**
 * Facebook Pages' and Instagram's comment calls on one loopback server,
 * under /v27.0, as Meta's references describe them: a Page post's
 * comments at every level (`filter=stream`), an Instagram media's top-level
 * comments with their replies embedded, a comment's replies, replies made,
 * hidden and deleted. It takes the tokens in `tokens`, checks each call's
 * `appsecret_proof` (none through Instagram Login), and answers queued
 * `script` answers first.
 */
export const fakeMetaComments = Effect.fnUntraced(function* fakeMetaComments(
  tokens: readonly string[],
  options: FakeMetaCommentsOptions = {}
) {
  const comments: FakeComment[] = [];
  const script = scripted<PlatformAnswer>();
  const lost = scripted<true>();
  let issued = 0;

  const nextId = () => {
    issued += 1;

    return `1790000000000${String(issued).padStart(4, "0")}`;
  };

  const facebookJson = (comment: FakeComment) => {
    const shown: FacebookCommentJson = {
      created_time: comment.createdTime,
      id: comment.id,
      message: comment.text,
    };

    if (comment.from !== undefined) {
      shown.from = { id: comment.from.id, name: comment.from.name };
    }

    if (comment.parentId !== undefined) {
      shown.parent = { id: comment.parentId };
    }

    return asJson(shown);
  };

  const instagramJson = (comment: FakeComment) => {
    const shown: InstagramCommentJson = {
      hidden: comment.hidden,
      id: comment.id,
      text: comment.text,
      timestamp: comment.createdTime,
    };

    if (comment.from !== undefined) {
      shown.from = { id: comment.from.id, username: comment.from.name };
      shown.username = comment.from.name;
    }

    // Meta names the account in `user` for the comments it made.
    if (comment.from?.id === instagramUserId) {
      shown.user = { id: instagramUserId };
    }

    if (comment.parentId !== undefined) {
      shown.parent_id = comment.parentId;
    }

    return shown;
  };

  const instagramValue = (comment: FakeComment) =>
    asJson(instagramJson(comment));

  const isInstagram = (objectId: string) =>
    comments.some(
      (comment) => comment.objectId === objectId && comment.id.startsWith("ig")
    );

  const under = (objectId: string) =>
    comments.filter((comment) => comment.objectId === objectId);

  const repliesOf = (commentId: string) =>
    comments.filter((comment) => comment.parentId === commentId);

  // A Page post's comments, every level; an Instagram media's top-level
  // comments with their first replies; or a comment's replies.
  const listing = (
    id: string,
    params: Params,
    origin: string,
    path: string
  ): PlatformAnswer => {
    if (comments.some((kept) => kept.id === id)) {
      return json(
        pageOf(repliesOf(id).map(facebookJson), params, origin, path)
      );
    }

    if (isInstagram(id)) {
      const embedded = { limit: String(options.embeddedReplies ?? 50) };

      const topLevel = under(id)
        .filter((kept) => kept.parentId === undefined)
        .map((kept) => ({
          ...instagramJson(kept),
          replies: pageOf(
            repliesOf(kept.id).map(instagramValue),
            embedded,
            origin,
            `/v27.0/${kept.id}/replies`
          ),
        }));

      return json(
        pageOf(
          topLevel.map((kept) => asJson(kept)),
          params,
          origin,
          path
        )
      );
    }

    if (params["filter"] !== "stream") {
      return metaError(100);
    }

    return under(id).length === 0 && !id.startsWith(facebookPageId)
      ? gone
      : json(pageOf(under(id).map(facebookJson), params, origin, path));
  };

  // A reply the account makes under `comment`.
  const replying = (
    comment: FakeComment,
    edge: string,
    params: Params
  ): PlatformAnswer => {
    const account =
      edge === "replies"
        ? { id: instagramUserId, name: "synthetic_studio" }
        : { id: facebookPageId, name: "Synthetic Page" };

    const made: FakeComment = {
      createdTime: options.now ?? "2026-11-10T09:20:05+0000",
      from: account,
      hidden: false,
      id: `${comment.id.startsWith("ig") ? "ig" : ""}${nextId()}`,
      objectId: comment.objectId,
      parentId: comment.id,
      text: params["message"] ?? "",
    };

    comments.push(made);

    return json({ id: made.id });
  };

  // Hiding or showing a comment, or deleting it.
  const acting = (
    request: PlatformRequest,
    comment: FakeComment,
    params: Params
  ): PlatformAnswer => {
    if (request.method === "DELETE") {
      comments.splice(comments.indexOf(comment), 1);

      return json({ success: true });
    }

    const hidden = params["is_hidden"] ?? params["hide"];

    if (hidden === undefined) {
      return metaError(100);
    }

    comment.hidden = hidden === "true";

    return json({ success: true });
  };

  const routed = (
    request: PlatformRequest,
    params: Params,
    origin: string
  ): PlatformAnswer => {
    const found = nodePattern.exec(request.path)?.groups;
    const id = found?.["id"] ?? "";
    const edge = found?.["edge"];
    const comment = comments.find((kept) => kept.id === id);

    if (found === undefined) {
      return metaError(803, 404);
    }

    if (request.method === "GET" && edge === "comments") {
      return listing(id, params, origin, request.path);
    }

    if (request.method === "GET" && edge === "replies") {
      return comment === undefined
        ? gone
        : json(
            pageOf(
              repliesOf(id).map(instagramValue),
              params,
              origin,
              request.path
            )
          );
    }

    // A node read: a comment, a post or media the fake has comments under,
    // a Page's post, or the accounts.
    if (request.method === "GET" && edge === undefined) {
      const known =
        comment !== undefined ||
        comments.some((kept) => kept.objectId === id) ||
        id.startsWith(`${facebookPageId}_`) ||
        id === facebookPageId ||
        id === instagramUserId;

      return known ? json({ id }) : gone;
    }

    if (comment === undefined) {
      return gone;
    }

    return edge === undefined
      ? acting(request, comment, params)
      : replying(comment, edge, params);
  };

  const handle = (request: PlatformRequest, origin: string): PlatformAnswer => {
    const name = `${request.method} ${request.path}`;
    const scriptedAnswer = script.next(name);

    if (scriptedAnswer !== undefined) {
      return scriptedAnswer;
    }

    const {
      access_token: token = "",
      appsecret_proof: proof,
      ...params
    } = paramsOf(request);

    if (!tokens.includes(token)) {
      return metaError(190);
    }

    const expected =
      options.instagramLogin === true ? undefined : proofOf(token);

    if (proof !== expected) {
      return metaError(100);
    }

    const answer = routed(request, params, origin);

    return lost.next(name) === undefined ? answer : dropped;
  };

  const server = yield* platformServer(handle);

  return {
    ...server,
    /** Someone comments, or the account does. */
    add: (comment: Omit<FakeComment, "hidden"> & { hidden?: boolean }) => {
      comments.push({ hidden: false, ...comment });
    },
    comments: () => [...comments],
    /** The next call of `route` is carried out, and its answer lost. */
    loseAnswer: (route: string) => {
      lost.push(route, [true]);
    },
    script,
  };
});
