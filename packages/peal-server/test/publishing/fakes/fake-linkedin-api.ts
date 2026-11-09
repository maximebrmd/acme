import { Effect, Schema } from "effect";

import {
  dropped,
  empty,
  headerOf,
  json,
  jsonBodyOf,
  platformServer,
  scripted,
} from "./platform-server.ts";
import type { PlatformAnswer, PlatformRequest } from "./platform-server.ts";

/** The synthetic member the channel posts as: their OpenID subject. */
export const linkedinMemberId = "aB3dE5fG7h";

/** The API version the fake serves, as Peal pins it. */
export const linkedinTestVersion = "202610";

/** A post LinkedIn published. */
export interface FakeLinkedInPost {
  readonly body: typeof PostBodySchema.Type;
  readonly urn: string;
}

/** A file LinkedIn took: an image, or a video assembled from its parts. */
export interface FakeLinkedInMedia {
  readonly bytes: number;
  /** Whether the upload came with the member's token. */
  readonly authorized: boolean;
  readonly urn: string;
}

/**
 * What LinkedIn does with the next request to a route instead of its own
 * behaviour: an answer, or `publishThenDrop`, which publishes the post and
 * drops the connection, so the answer is lost.
 */
export type LinkedInScript =
  | PlatformAnswer
  | { readonly _tag: "publishThenDrop" };

export interface FakeLinkedInOptions {
  /** The size of each part LinkedIn asks a video in; 4 MiB as LinkedIn does. */
  readonly partSize?: number;
  /** Where the upload URLs point; the fake itself by default. */
  readonly uploadOrigin?: string;
  /** Whether a video's processing fails. */
  readonly videoFails?: boolean;
  /** How many looks at a video answer PROCESSING before it is AVAILABLE. */
  readonly videoPolls?: number;
  /** Whether the member's token may read videos back; LinkedIn may say 403. */
  readonly videoReadable?: boolean;
}

const MediaContentSchema = Schema.Struct({
  altText: Schema.optionalKey(Schema.String),
  id: Schema.String,
});

const PostBodySchema = Schema.Struct({
  author: Schema.String,
  commentary: Schema.String,
  content: Schema.optionalKey(
    Schema.Struct({
      media: Schema.optionalKey(MediaContentSchema),
      multiImage: Schema.optionalKey(
        Schema.Struct({ images: Schema.Array(MediaContentSchema) })
      ),
    })
  ),
  distribution: Schema.Struct({ feedDistribution: Schema.String }),
  isReshareDisabledByAuthor: Schema.Boolean,
  lifecycleState: Schema.Literal("PUBLISHED"),
  visibility: Schema.Literal("PUBLIC"),
});

const postBodyOf = jsonBodyOf(PostBodySchema);

const imageInitOf = jsonBodyOf(
  Schema.Struct({
    initializeUploadRequest: Schema.Struct({ owner: Schema.String }),
  })
);

const videoInitOf = jsonBodyOf(
  Schema.Struct({
    initializeUploadRequest: Schema.Struct({
      fileSizeBytes: Schema.Int,
      owner: Schema.String,
      uploadCaptions: Schema.Boolean,
      uploadThumbnail: Schema.Boolean,
    }),
  })
);

const finalizeOf = jsonBodyOf(
  Schema.Struct({
    finalizeUploadRequest: Schema.Struct({
      uploadToken: Schema.String,
      uploadedPartIds: Schema.Array(Schema.String),
      video: Schema.String,
    }),
  })
);

const error = (status: number, code: string, message = code) =>
  json({ code, message, status }, status);

const tokenOf = (request: PlatformRequest) =>
  headerOf(request, "authorization").replace(/^Bearer /u, "");

/** The route a request takes, with the parts of its path that vary. */
interface Route {
  readonly groups: Readonly<Record<string, string | undefined>>;
  readonly route: string;
}

const routeOf = (request: PlatformRequest): Route => {
  const action = request.query.get("action");

  if (action !== null) {
    return {
      groups: {},
      route: `${request.method} ${request.path}?action=${action}`,
    };
  }

  const patterns = [
    [
      "PUT /dms-uploads/video/:id/part/:part",
      /^\/dms-uploads\/video\/(?<id>\d+)\/part\/(?<part>\d+)$/u,
    ],
    ["PUT /dms-uploads/image/:urn", /^\/dms-uploads\/image\/(?<urn>.+)$/u],
    ["GET /rest/videos/:urn", /^\/rest\/videos\/(?<urn>urn:li:video:.+)$/u],
  ] as const;

  for (const [route, pattern] of patterns) {
    const groups = pattern.exec(request.path)?.groups;

    if (groups !== undefined) {
      return { groups, route };
    }
  }

  return { groups: {}, route: `${request.method} ${request.path}` };
};

interface Video {
  readonly etags: string[];
  readonly parts: Uint8Array[];
  polls: number;
  size: number;
  status: "AVAILABLE" | "PROCESSING" | "PROCESSING_FAILED" | "WAITING_UPLOAD";
  readonly token: string;
  readonly urn: string;
}

/**
 * LinkedIn's REST API for one synthetic member: it takes images and videos
 * through their upload flows (videos in parts, finalized by their ETags,
 * then processed), publishes posts, and checks every call names the API
 * version and Rest.li 2.0. Tokens are those in `validTokens`.
 */
export const fakeLinkedInApi = Effect.fnUntraced(function* fakeLinkedInApi(
  options: FakeLinkedInOptions = {}
) {
  const validTokens = new Set(["linkedin-token-1"]);
  const images = new Map<string, FakeLinkedInMedia>();
  const videos = new Map<string, Video>();
  const posts: FakeLinkedInPost[] = [];
  const scripts = scripted<LinkedInScript>();
  const partSize = options.partSize ?? 4 * 1024 * 1024;
  let uploadOrigin = options.uploadOrigin ?? "";

  const restRefusal = (request: PlatformRequest) => {
    if (!validTokens.has(tokenOf(request))) {
      return error(401, "INVALID_ACCESS_TOKEN", "Invalid access token");
    }

    if (headerOf(request, "x-restli-protocol-version") !== "2.0.0") {
      return error(400, "PROTOCOL_VERSION_MISSING");
    }

    return headerOf(request, "linkedin-version") === linkedinTestVersion
      ? undefined
      : error(426, "VERSION_NOT_SUPPORTED");
  };

  const publish = (request: PlatformRequest) => {
    const body = postBodyOf(request);
    const media = body.content?.media;
    const video = media === undefined ? undefined : videos.get(media.id);

    // A video must be processed before a post shows it.
    if (video !== undefined && video.status !== "AVAILABLE") {
      return { refused: error(422, "MEDIA_ASSET_WAITING_UPLOAD") };
    }

    const post: FakeLinkedInPost = {
      body,
      urn: `urn:li:share:72000000000000${String(posts.length + 1).padStart(5, "0")}`,
    };

    posts.push(post);

    return { post };
  };

  const answerPost = (request: PlatformRequest, script?: LinkedInScript) => {
    const published = publish(request);

    if (published.refused !== undefined) {
      return published.refused;
    }

    return script?._tag === "publishThenDrop"
      ? dropped
      : empty(201, { "x-restli-id": published.post.urn });
  };

  const initializeImage = (request: PlatformRequest) => {
    const { owner } = imageInitOf(request).initializeUploadRequest;

    if (owner !== `urn:li:person:${linkedinMemberId}`) {
      return error(403, "ACCESS_DENIED");
    }

    const id = String(images.size + 1);
    const urn = `urn:li:image:C4E10AQ${id}`;

    images.set(urn, { authorized: false, bytes: 0, urn });

    return json({
      value: {
        image: urn,
        uploadUrl: `${uploadOrigin}/dms-uploads/image/${encodeURIComponent(urn)}`,
        uploadUrlExpiresAt: 1_781_000_000_000,
      },
    });
  };

  const initializeVideo = (request: PlatformRequest) => {
    const { fileSizeBytes } = videoInitOf(request).initializeUploadRequest;
    const id = String(videos.size + 1);
    const urn = `urn:li:video:D5E10AQ${id}`;
    const instructions = [];

    for (let first = 0; first < fileSizeBytes; first += partSize) {
      instructions.push({
        firstByte: first,
        lastByte: Math.min(first + partSize, fileSizeBytes) - 1,
        uploadUrl: `${uploadOrigin}/dms-uploads/video/${id}/part/${instructions.length}`,
      });
    }

    videos.set(urn, {
      etags: [],
      parts: [],
      polls: options.videoPolls ?? 2,
      size: fileSizeBytes,
      status: "WAITING_UPLOAD",
      token: `upload-token-${id}`,
      urn,
    });

    return json({
      value: {
        uploadInstructions: instructions,
        uploadToken: `upload-token-${id}`,
        uploadUrlsExpireAt: 1_781_000_000_000,
        video: urn,
      },
    });
  };

  const finalizeVideo = (request: PlatformRequest) => {
    const { uploadToken, uploadedPartIds, video } =
      finalizeOf(request).finalizeUploadRequest;

    const found = videos.get(video);
    const received = found?.parts.reduce((sum, part) => sum + part.length, 0);

    if (
      found === undefined ||
      found.token !== uploadToken ||
      received !== found.size ||
      uploadedPartIds.join(",") !== found.etags.join(",")
    ) {
      return error(400, "INVALID_UPLOAD");
    }

    found.status = "PROCESSING";

    return empty(200);
  };

  // Each look moves the processing along, whether or not the token may
  // see it.
  const lookAtVideo = (urn: string) => {
    const found = videos.get(urn);

    if (found === undefined) {
      return error(404, "NOT_FOUND");
    }

    if (found.status === "PROCESSING" && found.polls > 0) {
      found.polls -= 1;
    } else if (found.status === "PROCESSING") {
      found.status =
        options.videoFails === true ? "PROCESSING_FAILED" : "AVAILABLE";
    }

    if (options.videoReadable === false) {
      return error(403, "ACCESS_DENIED", "Not enough permissions");
    }

    return found.status === "PROCESSING_FAILED"
      ? json({
          id: urn,
          processingFailureReason: "INVALID_VIDEO_FORMAT",
          status: found.status,
        })
      : json({ id: urn, status: found.status });
  };

  const uploadPart = (request: PlatformRequest, id: string, part: number) => {
    const video = videos.get(`urn:li:video:D5E10AQ${id}`);

    if (video === undefined || video.parts.length !== part) {
      return error(400, "UNEXPECTED_PART");
    }

    video.parts.push(request.body);
    video.etags.push(`etag-${id}-${part}`);

    return empty(200, { etag: `etag-${id}-${part}` });
  };

  const uploadImage = (request: PlatformRequest, urn: string) => {
    if (!images.has(urn)) {
      return error(404, "NOT_FOUND");
    }

    images.set(urn, {
      authorized: validTokens.has(tokenOf(request)),
      bytes: request.body.length,
      urn,
    });

    return empty(201);
  };

  // The versioned API, for the member's token.
  const rest = (
    request: PlatformRequest,
    route: string,
    groups: Readonly<Record<string, string | undefined>>,
    script: LinkedInScript | undefined
  ): PlatformAnswer => {
    const refused = restRefusal(request);

    if (refused !== undefined) {
      return refused;
    }

    switch (route) {
      case "POST /rest/images?action=initializeUpload": {
        return initializeImage(request);
      }

      case "POST /rest/videos?action=initializeUpload": {
        return initializeVideo(request);
      }

      case "POST /rest/videos?action=finalizeUpload": {
        return finalizeVideo(request);
      }

      case "GET /rest/videos/:urn": {
        return lookAtVideo(groups["urn"] ?? "");
      }

      case "POST /rest/posts": {
        return answerPost(request, script);
      }

      default: {
        return error(404, "NOT_FOUND");
      }
    }
  };

  const handle = (request: PlatformRequest): PlatformAnswer => {
    const { groups, route } = routeOf(request);
    const script = scripts.next(route);

    if (script !== undefined && script._tag !== "publishThenDrop") {
      return script;
    }

    if (route === "PUT /dms-uploads/video/:id/part/:part") {
      return uploadPart(request, groups["id"] ?? "", Number(groups["part"]));
    }

    return route === "PUT /dms-uploads/image/:urn"
      ? uploadImage(request, groups["urn"] ?? "")
      : rest(request, route, groups, script);
  };

  const server = yield* platformServer(handle);

  uploadOrigin = uploadOrigin === "" ? server.url : uploadOrigin;

  return {
    ...server,
    /** The images taken, in order. */
    images: () => [...images.values()],
    /** The posts published, in order. */
    posts: () => [...posts],
    /** Makes the next requests to `route` go as scripted. */
    script: (route: string, answers: readonly LinkedInScript[]) => {
      scripts.push(route, answers);
    },
    /** The videos taken, by URN, with their parts' sizes. */
    videos: () =>
      [...videos.values()].map(({ parts, status, urn }) => ({
        parts: parts.map((part) => part.length),
        status,
        urn,
      })),
  };
});
