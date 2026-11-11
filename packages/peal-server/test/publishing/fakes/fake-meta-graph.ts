import { createHmac } from "node:crypto";

import { Effect } from "effect";

import {
  dropped,
  json,
  platformServer,
  scripted,
  textOf,
} from "./platform-server.ts";
import type { PlatformAnswer, PlatformRequest } from "./platform-server.ts";

/** The synthetic accounts the fake publishes for. */
export const threadsUserId = "25000000000000001";

export const instagramUserId = "17841400000000001";

export const facebookPageId = "102000000000001";

/** The app secret the fake checks Facebook and Instagram proofs against. */
export const graphAppSecret = "synthetic-meta-secret";

type Status = "ERROR" | "EXPIRED" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";

/** A media container, as the fake keeps it. */
export interface FakeContainer {
  readonly id: string;
  /** Polls left before it is processed. */
  inProgress: number;
  readonly params: Readonly<Record<string, string>>;
  status: Status;
  /** What its status says on an error, or none. */
  readonly error: string | undefined;
}

/** A post the fake made live. */
export interface FakePost {
  readonly containerId?: string;
  readonly id: string;
  readonly params: Readonly<Record<string, string>>;
  readonly text: string;
}

export interface FakeMetaGraphOptions {
  /** Polls a video container stays IN_PROGRESS for. */
  readonly videoPolls?: number;
  /** Containers whose media fails, by their media URL. */
  readonly failing?: Readonly<Record<string, string>>;
  /** Posts published today, against a quota of `quotaTotal`. */
  readonly quotaUsage?: number;
  readonly quotaTotal?: number;
  /**
   * Plays `graph.instagram.com`, as the Instagram API with Instagram Login
   * serves it: its tokens are the Instagram app's, which the main app's
   * proof does not sign, so a call carrying one is refused.
   */
  readonly instagramLogin?: boolean;
}

type Params = Readonly<Record<string, string>>;

type Handler = (params: Params) => PlatformAnswer;

/** Meta's error, for answers the tests script. */
export const metaError = (
  code: number,
  status = 400,
  headers: Readonly<Record<string, string>> = {}
): PlatformAnswer =>
  json(
    { error: { code, fbtrace_id: "synthetic", message: "synthetic" } },
    status,
    headers
  );

// The parameters of a call: the query of a GET, the form of a POST.
const paramsOf = (request: PlatformRequest): Record<string, string> =>
  Object.fromEntries(
    request.method === "GET"
      ? request.query
      : new URLSearchParams(textOf(request))
  );

const proofOf = (token: string) =>
  createHmac("sha256", graphAppSecret).update(token).digest("hex");

const isVideo = (params: Params) =>
  params["media_type"] === "VIDEO" || params["media_type"] === "REELS";

// A container's status as each API names it: Threads `status`, with an
// `error_message`; Instagram `status_code`, with a sentence in `status`.
const statusAnswer = (
  version: string,
  container: FakeContainer
): PlatformAnswer => {
  const { error, id, status } = container;
  const failure = status === "ERROR" ? (error ?? "UNKNOWN") : undefined;

  if (version === "v1.0") {
    return json(
      failure === undefined
        ? { id, status }
        : { error_message: failure, id, status }
    );
  }

  return json(
    failure === undefined
      ? { id, status_code: status }
      : { id, status: `Error: ${failure}`, status_code: status }
  );
};

const nodePattern = /^\/(?<version>v1\.0|v27\.0)\/(?<id>\d+)$/u;

const mediaFbidPattern = /"media_fbid":"(?<id>\d+)"/u;

/**
 * Meta's publishing APIs on one loopback server: Threads under /v1.0,
 * Instagram and Facebook Pages under /v27.0. Containers go through
 * IN_PROGRESS, FINISHED and PUBLISHED; posts are listed on their account.
 * It takes the tokens in `tokens`, checks Facebook and Instagram calls'
 * `appsecret_proof`, and answers queued `script` answers first.
 */
export const fakeMetaGraph = Effect.fnUntraced(function* fakeMetaGraph(
  tokens: readonly string[],
  options: FakeMetaGraphOptions = {}
) {
  const containers = new Map<string, FakeContainer>();
  const posts: FakePost[] = [];
  const unpublishedPhotos = new Set<string>();
  const script = scripted<PlatformAnswer>();
  // Routes whose next call is carried out, then its answer lost.
  const lost = scripted<true>();
  let issued = 0;

  const nextId = () => {
    issued += 1;

    return String(1_800_000_000_000 + issued);
  };

  const newContainer: Handler = (params) => {
    const url = params["image_url"] ?? params["video_url"] ?? "";
    const topic = params["topic_tag"] ?? "";

    // Threads takes a link attachment on a post of text alone, and a topic
    // without periods or ampersands.
    if (
      (params["link_attachment"] !== undefined &&
        params["media_type"] !== "TEXT") ||
      topic.includes(".") ||
      topic.includes("&")
    ) {
      return metaError(100);
    }

    const container: FakeContainer = {
      error: options.failing?.[url],
      id: nextId(),
      inProgress: isVideo(params) ? (options.videoPolls ?? 1) : 0,
      params,
      status: "IN_PROGRESS",
    };

    containers.set(container.id, container);

    return json({ id: container.id });
  };

  // A look at a container moves it on, once its polls are spent.
  const look = (container: FakeContainer) => {
    if (container.status !== "IN_PROGRESS") {
      return container;
    }

    if (container.inProgress > 0) {
      container.inProgress -= 1;
    } else {
      container.status = container.error === undefined ? "FINISHED" : "ERROR";
    }

    return container;
  };

  const publishing =
    (textKey: "caption" | "text"): Handler =>
    (params) => {
      const containerId = params["creation_id"] ?? "";
      const container = containers.get(containerId);

      if (container === undefined) {
        return metaError(100);
      }

      // A container not ready, or already published.
      if (container.status !== "FINISHED") {
        return metaError(9007);
      }

      container.status = "PUBLISHED";

      const post: FakePost = {
        containerId,
        id: nextId(),
        params: container.params,
        text: container.params[textKey] ?? "",
      };

      posts.push(post);

      return json({ id: post.id });
    };

  const quota: Handler = () =>
    json({
      data: [
        {
          config: {
            quota_duration: 86_400,
            quota_total: options.quotaTotal ?? 250,
          },
          quota_usage: options.quotaUsage ?? 0,
        },
      ],
    });

  const listing =
    (textKey: "caption" | "message" | "text"): Handler =>
    () =>
      json({
        data: posts.toReversed().map((post) => ({
          id: post.id,
          permalink: `https://social.example/p/${post.id}`,
          permalink_url: `https://social.example/p/${post.id}`,
          [textKey]: post.text,
        })),
      });

  const posted = (id: string, params: Params, text: string) => {
    const post: FakePost = { id, params, text };

    posts.push(post);

    return post;
  };

  const feed: Handler = (params) => {
    const post = posted(
      `${facebookPageId}_${nextId()}`,
      params,
      params["message"] ?? ""
    );

    for (const [key, value] of Object.entries(params)) {
      const photo = mediaFbidPattern.exec(value)?.groups?.["id"];

      if (key.startsWith("attached_media[") && photo !== undefined) {
        unpublishedPhotos.delete(photo);
      }
    }

    return json({ id: post.id });
  };

  const photos: Handler = (params) => {
    const photoId = nextId();

    if (params["published"] === "false") {
      unpublishedPhotos.add(photoId);

      return json({ id: photoId });
    }

    const post = posted(
      `${facebookPageId}_${nextId()}`,
      params,
      params["caption"] ?? ""
    );

    return json({ id: photoId, post_id: post.id });
  };

  const videos: Handler = (params) =>
    json({ id: posted(nextId(), params, params["description"] ?? "").id });

  const routes = new Map<string, Handler>([
    [`GET /v1.0/${threadsUserId}/threads`, listing("text")],
    [`GET /v1.0/${threadsUserId}/threads_publishing_limit`, quota],
    [`GET /v27.0/${facebookPageId}/published_posts`, listing("message")],
    [`GET /v27.0/${instagramUserId}/content_publishing_limit`, quota],
    [`GET /v27.0/${instagramUserId}/media`, listing("caption")],
    [`POST /v1.0/${threadsUserId}/threads`, newContainer],
    [`POST /v1.0/${threadsUserId}/threads_publish`, publishing("text")],
    [`POST /v27.0/${facebookPageId}/feed`, feed],
    [`POST /v27.0/${facebookPageId}/photos`, photos],
    [`POST /v27.0/${facebookPageId}/videos`, videos],
    [`POST /v27.0/${instagramUserId}/media`, newContainer],
    [`POST /v27.0/${instagramUserId}/media_publish`, publishing("caption")],
  ]);

  // A container's status, or a post's permalink.
  const node = (request: PlatformRequest): PlatformAnswer => {
    const found = nodePattern.exec(request.path)?.groups;
    const id = found?.["id"] ?? "";
    const container = containers.get(id);

    if (request.method !== "GET" || found === undefined) {
      return metaError(803, 404);
    }

    if (container !== undefined) {
      return statusAnswer(found["version"] ?? "", look(container));
    }

    return posts.some((post) => post.id === id)
      ? json({ id, permalink: `https://social.example/p/${id}` })
      : metaError(100);
  };

  const handle = (request: PlatformRequest): PlatformAnswer => {
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

    // Facebook and Instagram calls carry the proof of their token; calls
    // with an Instagram Login token carry none.
    const expected =
      options.instagramLogin === true ? undefined : proofOf(token);

    if (request.path.startsWith("/v27.0/") && proof !== expected) {
      return metaError(100);
    }

    const answer = routes.get(name)?.(params) ?? node(request);

    return lost.next(name) === undefined ? answer : dropped;
  };

  const server = yield* platformServer(handle);

  return {
    ...server,
    containers: () => [...containers.values()],
    /** The next call of `route` is carried out, and its answer lost. */
    loseAnswer: (route: string) => {
      lost.push(route, [true]);
    },
    posts: () => [...posts],
    script,
    unpublishedPhotos: () => [...unpublishedPhotos],
  };
});

/** Meta's usage header for a Page or an account that hit its limit. */
export const businessUsage = (minutes: number) => ({
  "x-business-use-case-usage": JSON.stringify({
    [facebookPageId]: [
      {
        call_count: 100,
        estimated_time_to_regain_access: minutes,
        total_cputime: 20,
        total_time: 30,
        type: "pages",
      },
    ],
  }),
});
