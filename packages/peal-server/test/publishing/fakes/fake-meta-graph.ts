import { createHmac } from "node:crypto";

import { Effect } from "effect";

import {
  dropped,
  headerOf,
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

/** A Page's reel or video story, from its start to its finish. */
export interface FakeVideo {
  readonly edge: "video_reels" | "video_stories";
  readonly id: string;
  /** The URL Meta was told to fetch it from, once uploaded. */
  fileUrl: string | undefined;
  finished: boolean;
  /** Status reads that still show the upload in progress. */
  uploadReads: number;
  /** Status reads after the finish that show publishing not begun. */
  publishLag: number;
  /** A story the finish made, listed once `publishLag` is over. */
  pendingStory: FakeStory | undefined;
}

/** A story the fake's Page shows. */
export interface FakeStory {
  readonly mediaId: string;
  readonly mediaType: "photo" | "video";
  readonly postId: string;
}

export interface FakeMetaGraphOptions {
  /**
   * Status reads a reel's or a video story's upload shows in progress
   * after Meta was told its URL, with `video_status: "processing"`, as
   * Meta's sample of an interrupted upload does. Its finish is refused
   * until the upload shows complete.
   */
  readonly videoUploadReads?: number;
  /**
   * Status reads after an accepted finish that still show publishing not
   * begun (`not_started`, a story's `publish_status: "published"` beside
   * it, as Meta's stories sample shows), the story not listed meanwhile.
   */
  readonly videoPublishLag?: number;
  /**
   * Meta's processing refuses every video (its sample: resolution too
   * low), and its finish still answers success, posting nothing.
   */
  readonly videoProcessingError?: boolean;
  /** A video story's finish answers success without its post id. */
  readonly storyFinishWithoutPostId?: boolean;
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
  params["media_type"] === "VIDEO" ||
  params["media_type"] === "REELS" ||
  (params["media_type"] === "STORIES" && params["video_url"] !== undefined);

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

const uploadPattern = /^\/video-upload\/v27\.0\/(?<id>\d+)$/u;

const mediaFbidPattern = /"media_fbid":"(?<id>\d+)"/u;

/**
 * Meta's publishing APIs on one loopback server: Threads under /v1.0,
 * Instagram and Facebook Pages under /v27.0, and the upload host's
 * /video-upload/v27.0. Containers go through
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
  // Photos a post or a story used, which no story may use again.
  const usedPhotos = new Set<string>();
  const videos = new Map<string, FakeVideo>();
  const stories: FakeStory[] = [];
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
    // without periods or ampersands; Instagram's stories take no
    // collaborators.
    if (
      (params["link_attachment"] !== undefined &&
        params["media_type"] !== "TEXT") ||
      topic.includes(".") ||
      topic.includes("&") ||
      (params["media_type"] === "STORIES" &&
        params["collaborators"] !== undefined)
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
        usedPhotos.add(photo);
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

  const pageVideos: Handler = (params) =>
    json({ id: posted(nextId(), params, params["description"] ?? "").id });

  // The Reels Publishing API's and the Page Stories API's three phases: a
  // start that makes room for a video, its upload on the upload host, and
  // a finish that publishes it, once, after the upload only.
  const videoPhases =
    (edge: FakeVideo["edge"]): Handler =>
    (params) => {
      if (params["upload_phase"] === "start") {
        const video: FakeVideo = {
          edge,
          fileUrl: undefined,
          finished: false,
          id: nextId(),
          pendingStory: undefined,
          publishLag: options.videoPublishLag ?? 0,
          uploadReads: options.videoUploadReads ?? 0,
        };

        videos.set(video.id, video);

        return json({
          upload_url: `https://rupload.facebook.com/video-upload/v27.0/${video.id}`,
          video_id: video.id,
        });
      }

      const video = videos.get(params["video_id"] ?? "");

      if (
        params["upload_phase"] !== "finish" ||
        video === undefined ||
        video.edge !== edge ||
        video.fileUrl === undefined ||
        video.uploadReads > 0 ||
        video.finished ||
        (edge === "video_reels" && params["video_state"] !== "PUBLISHED")
      ) {
        return metaError(100);
      }

      video.finished = true;

      if (options.videoProcessingError === true) {
        return json({ success: true });
      }

      if (edge === "video_reels") {
        posted(video.id, params, params["description"] ?? "");

        return json({ success: true });
      }

      const postId = `${facebookPageId}_${nextId()}`;
      const made: FakeStory = { mediaId: video.id, mediaType: "video", postId };

      posted(postId, params, "");

      if (video.publishLag > 0) {
        video.pendingStory = made;
      } else {
        stories.push(made);
      }

      return options.storyFinishWithoutPostId === true
        ? json({ success: true })
        : json({ post_id: postId, success: true });
    };

  // A story of a photo uploaded unpublished, which no post used before.
  const photoStories: Handler = (params) => {
    const photoId = params["photo_id"] ?? "";

    if (!unpublishedPhotos.has(photoId) || usedPhotos.has(photoId)) {
      return metaError(100);
    }

    unpublishedPhotos.delete(photoId);
    usedPhotos.add(photoId);

    const postId = `${facebookPageId}_${nextId()}`;

    posted(postId, params, "");
    stories.push({ mediaId: photoId, mediaType: "photo", postId });

    return json({ post_id: postId, success: true });
  };

  const storyListing: Handler = () =>
    json({
      data: stories.toReversed().map((story) => ({
        media_id: story.mediaId,
        media_type: story.mediaType,
        post_id: story.postId,
        status: "PUBLISHED",
      })),
    });

  // What a video's publishing shows, once its finish was accepted: not
  // begun for `publishLag` reads, then done.
  const publishingOf = (video: FakeVideo) => {
    if (!video.finished || options.videoProcessingError === true) {
      return { status: "not_started" };
    }

    if (video.publishLag > 0) {
      video.publishLag -= 1;

      if (video.publishLag === 0 && video.pendingStory !== undefined) {
        stories.push(video.pendingStory);
      }

      return video.edge === "video_stories"
        ? { publish_status: "published", status: "not_started" }
        : { status: "not_started" };
    }

    return { publish_status: "published", status: "complete" };
  };

  // A video's status, as Meta reports each phase.
  const videoStatus = (video: FakeVideo): PlatformAnswer => {
    const uploaded = video.fileUrl !== undefined && video.uploadReads === 0;

    if (video.fileUrl !== undefined && video.uploadReads > 0) {
      video.uploadReads -= 1;
    }

    const processingError = options.videoProcessingError === true && uploaded;

    let upload = "complete";
    let state = processingError ? "processing" : "upload_complete";

    if (video.fileUrl === undefined) {
      upload = "not_started";
      state = "uploading";
    } else if (!uploaded) {
      upload = "in_progress";
      state = "processing";
    }

    return json({
      id: video.id,
      status: {
        processing_phase: processingError
          ? {
              error: {
                message:
                  "Resolution too low. Video must have a minimum resolution of 540p.",
              },
              status: "not_started",
            }
          : { status: video.finished ? "complete" : "not_started" },
        publishing_phase: publishingOf(video),
        uploading_phase: { status: upload },
        video_status: state,
      },
    });
  };

  // The upload host takes the Page's token in its Authorization header,
  // and the file's address in `file_url`.
  const upload = (request: PlatformRequest, id: string): PlatformAnswer => {
    const video = videos.get(id);
    const authorization = headerOf(request, "authorization");
    const fileUrl = headerOf(request, "file_url");

    if (!tokens.some((token) => authorization === `OAuth ${token}`)) {
      return metaError(190, 401);
    }

    if (video === undefined || fileUrl === "") {
      return metaError(100);
    }

    video.fileUrl = fileUrl;

    return json({ success: true });
  };

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
    [`POST /v27.0/${facebookPageId}/videos`, pageVideos],
    [`POST /v27.0/${facebookPageId}/video_reels`, videoPhases("video_reels")],
    [
      `POST /v27.0/${facebookPageId}/video_stories`,
      videoPhases("video_stories"),
    ],
    [`POST /v27.0/${facebookPageId}/photo_stories`, photoStories],
    [`GET /v27.0/${facebookPageId}/stories`, storyListing],
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

    const video = videos.get(id);

    if (video !== undefined) {
      return videoStatus(video);
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

    const uploading = uploadPattern.exec(request.path)?.groups?.["id"];

    if (request.method === "POST" && uploading !== undefined) {
      const answer = upload(request, uploading);

      return lost.next(name) === undefined ? answer : dropped;
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
    // A phase of a video's upload is lost by its own name.
    const phase = params["upload_phase"];
    const lostAs = phase === undefined ? name : `${name}#${phase}`;

    return lost.next(lostAs) === undefined ? answer : dropped;
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
    stories: () => [...stories],
    unpublishedPhotos: () => [...unpublishedPhotos],
    videos: () => [...videos.values()],
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
